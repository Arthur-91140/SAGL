import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changez-moi-en-production-sagl-2026';

export interface AuthRequest extends Request {
  adminId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

export function generateToken(adminId: number): string {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '24h' });
}
