import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Liste tous les matériels
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { stockItems: true, templateItems: true },
        },
      },
    });
    return res.json(materials);
  } catch (error) {
    console.error('Erreur liste matériels:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un matériel
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, alertThreshold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const material = await prisma.material.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        alertThreshold: alertThreshold ? parseInt(alertThreshold) : null,
      },
    });

    return res.status(201).json(material);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Un matériel avec ce nom existe déjà' });
    }
    console.error('Erreur création matériel:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un matériel
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, alertThreshold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        alertThreshold: alertThreshold !== undefined && alertThreshold !== null && alertThreshold !== ''
          ? parseInt(alertThreshold)
          : null,
      },
    });

    return res.json(material);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Un matériel avec ce nom existe déjà' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matériel non trouvé' });
    }
    console.error('Erreur modification matériel:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un matériel
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.material.delete({ where: { id: parseInt(id) } });

    return res.json({ message: 'Matériel supprimé' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matériel non trouvé' });
    }
    console.error('Erreur suppression matériel:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
