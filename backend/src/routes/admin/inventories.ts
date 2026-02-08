import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Liste des inventaires avec filtres
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { storageId, type, rescuerName, from, to, page = '1', limit = '20' } = req.query;

    const where: any = {};

    if (storageId) where.storageId = parseInt(storageId as string);
    if (type) where.type = type as string;
    if (rescuerName) where.rescuerName = { contains: rescuerName as string };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [inventories, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          storage: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.inventory.count({ where }),
    ]);

    return res.json({
      inventories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Erreur liste inventaires:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détail d'un inventaire
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const inventory = await prisma.inventory.findUnique({
      where: { id: parseInt(id) },
      include: {
        storage: { select: { id: true, name: true } },
        items: {
          include: {
            material: true,
            storage: { select: { id: true, name: true } },
          },
          orderBy: [{ storage: { name: 'asc' } }, { material: { name: 'asc' } }],
        },
      },
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventaire non trouvé' });
    }

    return res.json(inventory);
  } catch (error) {
    console.error('Erreur détail inventaire:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
