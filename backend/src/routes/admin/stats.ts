import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from as string);
    if (to) dateFilter.lte = new Date(to as string);

    // Statistiques générales
    const [totalMaterials, totalStorages, totalInventories, recentInventories] = await Promise.all([
      prisma.material.count(),
      prisma.storage.count(),
      prisma.inventory.count(),
      prisma.inventory.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Inventaires par type
    const inventoriesByType = await prisma.inventory.groupBy({
      by: ['type'],
      _count: { id: true },
      where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : undefined,
    });

    // Top 10 matériels les plus consommés (les plus ajoutés lors d'inventaires)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        quantityAdded: { gt: 0 },
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: { material: true },
    });

    const consumptionMap = new Map<number, { name: string; total: number }>();
    for (const item of inventoryItems) {
      const existing = consumptionMap.get(item.materialId);
      if (existing) {
        existing.total += item.quantityAdded;
      } else {
        consumptionMap.set(item.materialId, {
          name: item.material.name,
          total: item.quantityAdded,
        });
      }
    }

    const topConsumed = Array.from(consumptionMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Top 10 matériels les plus souvent manquants
    const missingItems = await prisma.inventoryItem.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: { material: true },
    });

    const missingMap = new Map<number, { name: string; missingCount: number; totalChecks: number }>();
    for (const item of missingItems) {
      const existing = missingMap.get(item.materialId);
      const isMissing = item.quantityFound < item.expected;
      if (existing) {
        existing.totalChecks++;
        if (isMissing) existing.missingCount++;
      } else {
        missingMap.set(item.materialId, {
          name: item.material.name,
          missingCount: isMissing ? 1 : 0,
          totalChecks: 1,
        });
      }
    }

    const topMissing = Array.from(missingMap.values())
      .filter((m) => m.missingCount > 0)
      .sort((a, b) => b.missingCount - a.missingCount)
      .slice(0, 10);

    // Inventaires par jour (30 derniers jours)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyInventories = await prisma.inventory.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (const inv of dailyInventories) {
      const day = inv.createdAt.toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    const inventoriesPerDay = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // État du stock global
    const globalStock = await prisma.storage.findFirst({
      where: { isGlobalStock: true },
    });

    let stockStatus: any[] = [];
    if (globalStock) {
      const stockItems = await prisma.stockItem.findMany({
        where: { storageId: globalStock.id },
        include: { material: true },
      });

      const stockMap = new Map<number, { name: string; quantity: number; threshold: number | null }>();
      for (const item of stockItems) {
        const existing = stockMap.get(item.materialId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          stockMap.set(item.materialId, {
            name: item.material.name,
            quantity: item.quantity,
            threshold: item.material.alertThreshold,
          });
        }
      }

      stockStatus = Array.from(stockMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    return res.json({
      overview: {
        totalMaterials,
        totalStorages,
        totalInventories,
        recentInventories,
      },
      inventoriesByType: inventoriesByType.map((i) => ({
        type: i.type,
        count: i._count.id,
      })),
      topConsumed,
      topMissing,
      inventoriesPerDay,
      stockStatus,
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
