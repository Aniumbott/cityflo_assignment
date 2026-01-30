import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../index';
import prisma from '../lib/prisma';

jest.setTimeout(30000);

// Helper: login and get access token
async function loginAs(username: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'password123' });
  return res.body.accessToken;
}

// Helper: create a small valid PDF buffer for testing
function createTestPdf(): Buffer {
  // Minimal valid PDF
  return Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF'
  );
}

// Store IDs for cleanup
const createdInvoiceIds: string[] = [];

afterAll(async () => {
  // Clean up test invoices
  if (createdInvoiceIds.length > 0) {
    await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
  }

  // Clean up test PDF files in uploads dir
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file.includes('test-invoice')) {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }
  }

});

describe('Invoice Routes', () => {
  let employeeToken: string;
  let accountsToken: string;
  let seniorToken: string;

  beforeAll(async () => {
    employeeToken = await loginAs('employee1');
    accountsToken = await loginAs('accounts1');
    seniorToken = await loginAs('senior_accounts1');
  });

  describe('POST /api/invoices', () => {
    it('should upload a PDF invoice', async () => {
      const pdfPath = path.join(__dirname, '__test-invoice.pdf');
      fs.writeFileSync(pdfPath, createTestPdf());

      try {
        const res = await request(app)
          .post('/api/invoices')
          .set('Authorization', `Bearer ${employeeToken}`)
          .field('category', 'VENDOR_PAYMENT')
          .field('notes', 'Test invoice')
          .attach('files', pdfPath, 'test-invoice.pdf');

        expect(res.status).toBe(201);
        expect(res.body.invoices).toHaveLength(1);
        expect(res.body.invoices[0].category).toBe('VENDOR_PAYMENT');
        expect(res.body.invoices[0].status).toBe('PENDING_REVIEW');
        expect(res.body.invoices[0].notes).toBe('Test invoice');

        createdInvoiceIds.push(res.body.invoices[0].id);
      } finally {
        fs.unlinkSync(pdfPath);
      }
    });

    it('should reject upload without files', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('category', 'VENDOR_PAYMENT');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one PDF file is required');
    });

    it('should reject upload with invalid category', async () => {
      const pdfPath = path.join(__dirname, '__test-invoice.pdf');
      fs.writeFileSync(pdfPath, createTestPdf());

      try {
        const res = await request(app)
          .post('/api/invoices')
          .set('Authorization', `Bearer ${employeeToken}`)
          .field('category', 'INVALID')
          .attach('files', pdfPath, 'test-invoice.pdf');

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Valid category is required');
      } finally {
        fs.unlinkSync(pdfPath);
      }
    });

    it('should require authentication', async () => {
      const res = await request(app).post('/api/invoices');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/invoices', () => {
    it('should return paginated invoices for employee (own only)', async () => {
      const res = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invoices).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it('should return all invoices for accounts user', async () => {
      const res = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invoices).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should support pagination params', async () => {
      const res = await request(app)
        .get('/api/invoices?page=1&limit=5')
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/invoices?status=PENDING_REVIEW')
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      for (const inv of res.body.invoices) {
        expect(inv.status).toBe('PENDING_REVIEW');
      }
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should return invoice details', async () => {
      // Use the first created invoice
      if (createdInvoiceIds.length === 0) return;

      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceIds[0]}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.id).toBe(createdInvoiceIds[0]);
      expect(res.body.invoice.submitter).toBeDefined();
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .get('/api/invoices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent employee from viewing others invoices', async () => {
      if (createdInvoiceIds.length === 0) return;

      // employee2 should not see employee1's invoice
      const employee2Token = await loginAs('employee2');
      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceIds[0]}`)
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow accounts user to view any invoice', async () => {
      if (createdInvoiceIds.length === 0) return;

      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceIds[0]}`)
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/invoices/:id/status', () => {
    let invoiceToApprove: string;

    beforeAll(async () => {
      // Create a fresh invoice for status testing
      const pdfPath = path.join(__dirname, '__test-invoice-status.pdf');
      fs.writeFileSync(pdfPath, createTestPdf());

      try {
        const res = await request(app)
          .post('/api/invoices')
          .set('Authorization', `Bearer ${employeeToken}`)
          .field('category', 'REIMBURSEMENT')
          .attach('files', pdfPath, 'test-invoice-status.pdf');

        invoiceToApprove = res.body.invoices[0].id;
        createdInvoiceIds.push(invoiceToApprove);
      } finally {
        fs.unlinkSync(pdfPath);
      }
    });

    it('should reject status change by employee', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${invoiceToApprove}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('should require comment when rejecting', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${invoiceToApprove}/status`)
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Comment is required');
    });

    it('should approve invoice as accounts user', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${invoiceToApprove}/status`)
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.invoice.status).toBe('APPROVED');
    });

    it('should mark approved invoice as paid', async () => {
      const res = await request(app)
        .patch(`/api/invoices/${invoiceToApprove}/status`)
        .set('Authorization', `Bearer ${seniorToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(res.body.invoice.status).toBe('PAID');
    });
  });

  describe('POST /api/invoices/bulk-action', () => {
    it('should reject bulk action by employee', async () => {
      const res = await request(app)
        .post('/api/invoices/bulk-action')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ invoiceIds: ['some-id'], action: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('should require invoiceIds array', async () => {
      const res = await request(app)
        .post('/api/invoices/bulk-action')
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({ action: 'APPROVED' });

      expect(res.status).toBe(400);
    });

    it('should require valid action', async () => {
      const res = await request(app)
        .post('/api/invoices/bulk-action')
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({ invoiceIds: ['some-id'], action: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('should require comment for bulk reject', async () => {
      const res = await request(app)
        .post('/api/invoices/bulk-action')
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({ invoiceIds: ['some-id'], action: 'REJECTED' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Comment is required');
    });
  });

  describe('GET /api/invoices/export/csv', () => {
    it('should export CSV for accounts user', async () => {
      const res = await request(app)
        .get('/api/invoices/export/csv')
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('invoices-export.csv');
    });

    it('should reject CSV export for employee', async () => {
      const res = await request(app)
        .get('/api/invoices/export/csv')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
