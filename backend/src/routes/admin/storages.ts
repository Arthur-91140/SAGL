import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { generateQRCode } from '../../utils/qrcode';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Arbre complet des stockages
router.get('/tree', async (_req: AuthRequest, res: Response) => {
  try {
    const storages = await prisma.storage.findMany({
      include: {
        templateItems: { include: { material: true } },
        _count: { select: { children: true, stockItems: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Construire l'arbre
    const storageMap = new Map<number, any>();
    storages.forEach((s) => {
      storageMap.set(s.id, { ...s, children: [] });
    });

    const roots: any[] = [];
    storages.forEach((s) => {
      const node = storageMap.get(s.id);
      if (s.parentId && storageMap.has(s.parentId)) {
        storageMap.get(s.parentId).children.push(node);
      } else if (!s.parentId) {
        roots.push(node);
      }
    });

    return res.json(roots);
  } catch (error) {
    console.error('Erreur arbre stockages:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste plate des stockages
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const storages = await prisma.storage.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { children: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(storages);
  } catch (error) {
    console.error('Erreur liste stockages:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détail d'un stockage
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storage = await prisma.storage.findUnique({
      where: { id: parseInt(id) },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          include: {
            templateItems: { include: { material: true } },
            _count: { select: { children: true } },
          },
          orderBy: { name: 'asc' },
        },
        templateItems: {
          include: { material: true },
          orderBy: { material: { name: 'asc' } },
        },
        stockItems: {
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
    console.error('Erreur détail stockage:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un stockage
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    if (parentId) {
      const parent = await prisma.storage.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent) {
        return res.status(404).json({ error: 'Stockage parent non trouvé' });
      }
    }

    const storage = await prisma.storage.create({
      data: {
        name: name.trim(),
        parentId: parentId ? parseInt(parentId) : null,
      },
    });

    return res.status(201).json(storage);
  } catch (error) {
    console.error('Erreur création stockage:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un stockage
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const storageId = parseInt(id);

    // Empêcher de se mettre soi-même comme parent
    if (parentId && parseInt(parentId) === storageId) {
      return res.status(400).json({ error: 'Un stockage ne peut pas être son propre parent' });
    }

    const storage = await prisma.storage.update({
      where: { id: storageId },
      data: {
        name: name.trim(),
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : undefined,
      },
    });

    return res.json(storage);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }
    console.error('Erreur modification stockage:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un stockage
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const storage = await prisma.storage.findUnique({ where: { id: parseInt(id) } });

    if (!storage) {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }

    if (storage.isGlobalStock) {
      return res.status(400).json({ error: 'Impossible de supprimer la réserve locale' });
    }

    await prisma.storage.delete({ where: { id: parseInt(id) } });

    return res.json({ message: 'Stockage supprimé' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }
    console.error('Erreur suppression stockage:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer un lien unique pour un stockage
router.post('/:id/generate-link', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uniqueLink = uuidv4();

    const storage = await prisma.storage.update({
      where: { id: parseInt(id) },
      data: { uniqueLink },
    });

    return res.json({
      uniqueLink: storage.uniqueLink,
      url: `${process.env.BASE_URL || 'http://localhost:5173'}/i/${storage.uniqueLink}`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }
    console.error('Erreur génération lien:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// QR Code pour un stockage
router.get('/:id/qrcode', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storage = await prisma.storage.findUnique({ where: { id: parseInt(id) } });

    if (!storage) {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }

    if (!storage.uniqueLink) {
      return res.status(400).json({ error: 'Aucun lien unique généré pour ce stockage' });
    }

    const url = `${process.env.BASE_URL || 'http://localhost:5173'}/i/${storage.uniqueLink}`;
    const qrBuffer = await generateQRCode(url);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${storage.name}.png"`);
    return res.send(qrBuffer);
  } catch (error) {
    console.error('Erreur QR code:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le template d'un stockage
router.put('/:id/template', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const storageId = parseInt(id);

    const storage = await prisma.storage.findUnique({ where: { id: storageId } });
    if (!storage) {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }

    // Supprimer les anciens items du template
    await prisma.storageTemplateItem.deleteMany({ where: { storageId } });

    // Créer les nouveaux
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.materialId && item.expectedQuantity > 0) {
          await prisma.storageTemplateItem.create({
            data: {
              storageId,
              materialId: parseInt(item.materialId),
              expectedQuantity: parseInt(item.expectedQuantity),
            },
          });
        }
      }
    }

    const updated = await prisma.storageTemplateItem.findMany({
      where: { storageId },
      include: { material: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erreur mise à jour template:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le stock d'un stockage
router.put('/:id/stock', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const storageId = parseInt(id);

    const storage = await prisma.storage.findUnique({ where: { id: storageId } });
    if (!storage) {
      return res.status(404).json({ error: 'Stockage non trouvé' });
    }

    // Supprimer les anciens items de stock
    await prisma.stockItem.deleteMany({ where: { storageId } });

    // Créer les nouveaux
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.materialId && item.quantity >= 0) {
          await prisma.stockItem.create({
            data: {
              storageId,
              materialId: parseInt(item.materialId),
              quantity: parseInt(item.quantity),
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            },
          });
        }
      }
    }

    const updated = await prisma.stockItem.findMany({
      where: { storageId },
      include: { material: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erreur mise à jour stock:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter du stock (incrémental)
router.post('/:id/stock/add', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { materialId, quantity, expirationDate } = req.body;

    const storageId = parseInt(id);

    if (!materialId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Matériel et quantité requis' });
    }

    const existing = await prisma.stockItem.findFirst({
      where: {
        storageId,
        materialId: parseInt(materialId),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
    });

    if (existing) {
      const updated = await prisma.stockItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + parseInt(quantity) },
        include: { material: true },
      });
      return res.json(updated);
    } else {
      const created = await prisma.stockItem.create({
        data: {
          storageId,
          materialId: parseInt(materialId),
          quantity: parseInt(quantity),
          expirationDate: expirationDate ? new Date(expirationDate) : null,
        },
        include: { material: true },
      });
      return res.status(201).json(created);
    }
  } catch (error) {
    console.error('Erreur ajout stock:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
