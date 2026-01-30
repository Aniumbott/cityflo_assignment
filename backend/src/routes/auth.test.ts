import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { config } from '../config';

// These tests run against the real DB with seeded users.
// Seed users: employee1, employee2, accounts1, senior_accounts1 (all password: password123)

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return tokens + user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'employee1', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('employee1');
      expect(res.body.user.role).toBe('EMPLOYEE');
      expect(res.body.user.email).toBe('employee1@cityflo.com');
      // Should not return password hash
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'employee1', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 400 when username or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'employee1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username and password are required');
    });

    it('should login accounts user with correct role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'accounts1', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ACCOUNTS');
    });

    it('should login senior_accounts user with correct role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'senior_accounts1', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('SENIOR_ACCOUNTS');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return a new access token given a valid refresh token', async () => {
      // First login to get a refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'employee1', password: 'password123' });

      const { refreshToken } = loginRes.body;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      // Verify the new token is valid
      const decoded = jwt.verify(res.body.accessToken, config.jwtSecret) as any;
      expect(decoded.userId).toBeDefined();
      expect(decoded.role).toBe('EMPLOYEE');
    });

    it('should return 401 for an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired refresh token');
    });

    it('should return 400 when refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Refresh token is required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'employee1', password: 'password123' });

      const { accessToken } = loginRes.body;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('employee1');
      expect(res.body.user.role).toBe('EMPLOYEE');
      expect(res.body.user.email).toBe('employee1@cityflo.com');
      expect(res.body.user.createdAt).toBeDefined();
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing or invalid authorization header');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      // Create a token that expires immediately
      const expiredToken = jwt.sign(
        { userId: 'some-id', role: 'EMPLOYEE' },
        config.jwtSecret,
        { expiresIn: '0s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token expired');
    });
  });
});

describe('Role Middleware', () => {
  it('should allow access for authorized roles (tested via /me route for all roles)', async () => {
    // Login as each role and verify /me works (authenticate middleware is the gate)
    for (const username of ['employee1', 'accounts1', 'senior_accounts1']) {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username, password: 'password123' });

      expect(loginRes.status).toBe(200);

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.username).toBe(username);
    }
  });
});
