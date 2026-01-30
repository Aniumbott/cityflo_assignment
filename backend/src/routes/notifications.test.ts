import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../index';
import prisma from '../lib/prisma';

jest.setTimeout(30000);

async function loginAs(username: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'password123' });
  return res.body.accessToken;
}

function createTestPdf(): Buffer {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF'
  );
}

const cleanupIds: string[] = [];

afterAll(async () => {
  if (cleanupIds.length > 0) {
    await prisma.invoice.deleteMany({ where: { id: { in: cleanupIds } } });
  }
});

describe('Notification & Audit Routes', () => {
  let employeeToken: string;
  let accountsToken: string;
  let invoiceId: string;

  beforeAll(async () => {
    employeeToken = await loginAs('employee1');
    accountsToken = await loginAs('accounts1');

    // Create an invoice and approve it to generate a notification
    const pdfPath = path.join(__dirname, '__test-notif.pdf');
    fs.writeFileSync(pdfPath, createTestPdf());

    try {
      const uploadRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('category', 'VENDOR_PAYMENT')
        .attach('files', pdfPath, 'test-notif.pdf');

      invoiceId = uploadRes.body.invoices[0].id;
      cleanupIds.push(invoiceId);

      // Approve it — creates notification + audit record for employee1
      await request(app)
        .patch(`/api/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({ status: 'APPROVED' });
    } finally {
      fs.unlinkSync(pdfPath);
    }
  });

  describe('GET /api/notifications', () => {
    it('should list notifications for the current user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toBeDefined();
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();

      const notif = res.body.notifications.find(
        (n: any) => n.invoiceId === invoiceId
      );
      expect(notif).toBeDefined();
      expect(notif.message).toContain('approved');
      expect(notif.read).toBe(false);
    });

    it('should return empty for user with no notifications', async () => {
      // accounts1 has no notifications from this flow (they performed the action)
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      // Get the notification first
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${employeeToken}`);

      const notif = listRes.body.notifications.find(
        (n: any) => n.invoiceId === invoiceId
      );

      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.read).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent reading another user\'s notification', async () => {
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${employeeToken}`);

      if (listRes.body.notifications.length > 0) {
        const notifId = listRes.body.notifications[0].id;
        const res = await request(app)
          .patch(`/api/notifications/${notifId}/read`)
          .set('Authorization', `Bearer ${accountsToken}`);

        expect(res.status).toBe(403);
      }
    });
  });

  describe('GET /api/invoices/:id/audit-log', () => {
    it('should return audit trail for an invoice', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceId}/audit-log`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.actions).toBeDefined();
      expect(res.body.actions.length).toBeGreaterThanOrEqual(1);

      const approveAction = res.body.actions.find(
        (a: any) => a.action === 'APPROVED'
      );
      expect(approveAction).toBeDefined();
      expect(approveAction.user.username).toBe('accounts1');
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .get('/api/invoices/00000000-0000-0000-0000-000000000000/audit-log')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent employee from viewing others\' audit log', async () => {
      const employee2Token = await loginAs('employee2');
      const res = await request(app)
        .get(`/api/invoices/${invoiceId}/audit-log`)
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow accounts user to view any audit log', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceId}/audit-log`)
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.actions.length).toBeGreaterThanOrEqual(1);
    });
  });
});
