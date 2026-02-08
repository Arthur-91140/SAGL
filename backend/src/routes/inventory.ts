import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getGreeting } from '../utils/greeting';

const router = Router();
const prisma = new PrismaClient();

// Récupérer les infos d'un stockage via lien unique (public)
router.get('/:uniqueLink', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;

    const storage = await prisma.storage.findUnique({
      where: { uniqueLink },
      include: {
        children: {
          include: {
            templateItems: {
              include: { material: true },
              orderBy: { material: { name: 'asc' } },
            },
            children: {
              include: {
                templateItems: {
                  include: { material: true },
                  orderBy: { material: { name: 'asc' } },
                },
                children: {
                  include: {
                    templateItems: {
                      include: { material: true },
                      orderBy: { material: { name: 'asc' } },
                    },
                  },
                  orderBy: { name: 'asc' },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        templateItems: {
          include: { material: true },
          orderBy: { material: { name: 'asc' } },
        },
      },
    });

    if (!storage) {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }

    return res.json(storage);
  } catch (error) {
    console.error('Erreur récupération stockage:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Soumettre un inventaire (public)
router.post('/:uniqueLink', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;
    const { rescuerName, postName, postNumber, type, items } = req.body;

    // Validation
    if (!rescuerName || !rescuerName.trim()) {
      return res.status(400).json({ error: 'Le nom du secouriste est requis' });
    }

    if (!postName?.trim() && !postNumber?.trim()) {
      return res.status(400).json({ error: 'Le nom ou le numéro du poste est requis' });
    }

    if (!type || !['START', 'END', 'OTHER'].includes(type)) {
      return res.status(400).json({ error: 'Le type d\'inventaire est requis (START, END, OTHER)' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Les éléments de l\'inventaire sont requis' });
    }

    const storage = await prisma.storage.findUnique({
      where: { uniqueLink },
    });

    if (!storage) {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }

    const greeting = getGreeting(type);

    // Trouver la réserve locale
    const globalStock = await prisma.storage.findFirst({
      where: { isGlobalStock: true },
    });

    // Créer l'inventaire et ses items dans une transaction
    const inventory = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.create({
        data: {
          storageId: storage.id,
          rescuerName: rescuerName.trim(),
          postName: postName?.trim() || null,
          postNumber: postNumber?.trim() || null,
          type,
          greeting,
          items: {
            create: items.map((item: any) => ({
              storageId: parseInt(item.storageId),
              materialId: parseInt(item.materialId),
              expected: parseInt(item.expected),
              quantityFound: parseInt(item.quantityFound),
              quantityAdded: parseInt(item.quantityAdded) || 0,
            })),
          },
        },
        include: {
          items: {
            include: {
              material: true,
              storage: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Déduire du stock global les quantités ajoutées
      if (globalStock) {
        for (const item of items) {
          const added = parseInt(item.quantityAdded) || 0;
          if (added > 0) {
            const globalStockItem = await tx.stockItem.findFirst({
              where: {
                storageId: globalStock.id,
                materialId: parseInt(item.materialId),
              },
            });

            if (globalStockItem) {
              await tx.stockItem.update({
                where: { id: globalStockItem.id },
                data: {
                  quantity: Math.max(0, globalStockItem.quantity - added),
                },
              });
            }
          }
        }
      }

      return inv;
    });

    return res.status(201).json({
      inventory,
      greeting,
    });
  } catch (error) {
    console.error('Erreur soumission inventaire:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
