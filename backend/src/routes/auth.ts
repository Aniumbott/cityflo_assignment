import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest, JwtPayload } from '../types';
import prisma from '../lib/prisma';

const router = Router();

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn });
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const tokenPayload: JwtPayload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload;
    const tokenPayload: JwtPayload = { userId: decoded.userId, role: decoded.role };
    const accessToken = generateAccessToken(tokenPayload);

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});

export default router;
