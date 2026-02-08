import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Export CSV du stock
router.get('/csv', async (req: AuthRequest, res: Response) => {
  try {
    const { storageId } = req.query;

    const where: any = {};
    if (storageId) where.storageId = parseInt(storageId as string);

    const stockItems = await prisma.stockItem.findMany({
      where,
      include: {
        material: true,
        storage: true,
      },
      orderBy: [{ storage: { name: 'asc' } }, { material: { name: 'asc' } }],
    });

    const header = 'Stockage;Matériel;Quantité;Date de péremption\n';
    const rows = stockItems.map((item) => {
      const expDate = item.expirationDate
        ? item.expirationDate.toLocaleDateString('fr-FR')
        : '';
      return `"${item.storage.name}";"${item.material.name}";${item.quantity};"${expDate}"`;
    });

    const csv = header + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stock-sagl-${new Date().toISOString().split('T')[0]}.csv"`);
    // BOM pour Excel
    return res.send('\ufeff' + csv);
  } catch (error) {
    console.error('Erreur export CSV:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Export PDF du stock
router.get('/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const { storageId } = req.query;

    let storages: any[];

    if (storageId) {
      storages = [
        await prisma.storage.findUnique({
          where: { id: parseInt(storageId as string) },
          include: {
            stockItems: {
              include: { material: true },
              orderBy: { material: { name: 'asc' } },
            },
          },
        }),
      ].filter(Boolean);
    } else {
      storages = await prisma.storage.findMany({
        include: {
          stockItems: {
            include: { material: true },
            orderBy: { material: { name: 'asc' } },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stock-sagl-${new Date().toISOString().split('T')[0]}.pdf"`
    );

    doc.pipe(res);

    // Titre
    doc.fontSize(20).text('SAGL - État des stocks', { align: 'center' });
    doc.fontSize(10).text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, {
      align: 'center',
    });
    doc.moveDown(2);

    for (const storage of storages) {
      if (!storage.stockItems || storage.stockItems.length === 0) continue;

      // Vérifier si on a assez de place
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(14).text(storage.name, { underline: true });
      doc.moveDown(0.5);

      for (const item of storage.stockItems) {
        const expStr = item.expirationDate
          ? ` (péremption: ${item.expirationDate.toLocaleDateString('fr-FR')})`
          : '';

        doc
          .fontSize(10)
          .text(`  • ${item.material.name}: ${item.quantity}${expStr}`);
      }

      doc.moveDown(1);
    }

    if (storages.every((s) => !s.stockItems || s.stockItems.length === 0)) {
      doc.fontSize(12).text('Aucun stock à afficher.', { align: 'center' });
    }

    doc.end();
  } catch (error) {
    console.error('Erreur export PDF:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
