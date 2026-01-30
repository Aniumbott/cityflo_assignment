import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import prisma from '../lib/prisma';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications - List notifications for current user
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const where = { userId: req.user!.userId };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        invoice: { select: { id: true, originalFilename: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);

  res.json({
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  if (notification.userId !== req.user!.userId) {
    res.status(403).json({ error: 'Not your notification' });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  res.json({ notification: updated });
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });

  res.json({ updated: result.count });
});

export default router;
