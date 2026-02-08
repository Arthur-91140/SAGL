import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const notifications: any[] = [];

    // 1. Matériels avec seuil d'alerte dans la réserve locale
    const globalStock = await prisma.storage.findFirst({
      where: { isGlobalStock: true },
    });

    if (globalStock) {
      const materialsWithThreshold = await prisma.material.findMany({
        where: { alertThreshold: { not: null } },
      });

      for (const material of materialsWithThreshold) {
        const stockItems = await prisma.stockItem.findMany({
          where: {
            storageId: globalStock.id,
            materialId: material.id,
          },
        });

        const totalQuantity = stockItems.reduce((sum, item) => sum + item.quantity, 0);

        if (totalQuantity === 0) {
          notifications.push({
            type: 'missing',
            severity: 'error',
            materialId: material.id,
            materialName: material.name,
            storageId: globalStock.id,
            storageName: globalStock.name,
            currentQuantity: totalQuantity,
            threshold: material.alertThreshold,
            message: `${material.name} : stock épuisé dans ${globalStock.name}`,
          });
        } else if (material.alertThreshold && totalQuantity <= material.alertThreshold) {
          notifications.push({
            type: 'low',
            severity: 'warning',
            materialId: material.id,
            materialName: material.name,
            storageId: globalStock.id,
            storageName: globalStock.name,
            currentQuantity: totalQuantity,
            threshold: material.alertThreshold,
            message: `${material.name} : stock faible (${totalQuantity}/${material.alertThreshold}) dans ${globalStock.name}`,
          });
        }
      }
    }

    // 2. Matériels périmés (dans tous les stockages)
    const expiredItems = await prisma.stockItem.findMany({
      where: {
        expirationDate: {
          lte: new Date(),
          not: null,
        },
        quantity: { gt: 0 },
      },
      include: {
        material: true,
        storage: true,
      },
    });

    for (const item of expiredItems) {
      notifications.push({
        type: 'expired',
        severity: 'error',
        materialId: item.materialId,
        materialName: item.material.name,
        storageId: item.storageId,
        storageName: item.storage.name,
        currentQuantity: item.quantity,
        expirationDate: item.expirationDate,
        message: `${item.material.name} : périmé depuis le ${item.expirationDate?.toLocaleDateString('fr-FR')} dans ${item.storage.name}`,
      });
    }

    // 3. Matériels bientôt périmés (30 jours)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const soonExpiredItems = await prisma.stockItem.findMany({
      where: {
        expirationDate: {
          gt: new Date(),
          lte: thirtyDaysFromNow,
          not: null,
        },
        quantity: { gt: 0 },
      },
      include: {
        material: true,
        storage: true,
      },
    });

    for (const item of soonExpiredItems) {
      notifications.push({
        type: 'expiring_soon',
        severity: 'warning',
        materialId: item.materialId,
        materialName: item.material.name,
        storageId: item.storageId,
        storageName: item.storage.name,
        currentQuantity: item.quantity,
        expirationDate: item.expirationDate,
        message: `${item.material.name} : péremption prochaine (${item.expirationDate?.toLocaleDateString('fr-FR')}) dans ${item.storage.name}`,
      });
    }

    // Trier : erreurs d'abord, puis avertissements
    notifications.sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (a.severity !== 'error' && b.severity === 'error') return 1;
      return 0;
    });

    return res.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error('Erreur notifications:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
