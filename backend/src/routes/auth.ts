import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = generateToken(admin.id);
    return res.json({ token, username: admin.username });
  } catch (error) {
    console.error('Erreur login:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.adminId },
      select: { id: true, username: true },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin non trouvé' });
    }

    return res.json(admin);
  } catch (error) {
    console.error('Erreur me:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 4 caractères' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } });

    if (!admin) {
      return res.status(404).json({ error: 'Admin non trouvé' });
    }

    const validPassword = await bcrypt.compare(currentPassword, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: req.adminId },
      data: { password: hashedPassword },
    });

    return res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur change-password:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
