const request = require('supertest');
const app = require('../src/app');

describe('API Integration & Security Tests', () => {
  test('GET /api/health returns 200 with service health payload', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('url-health-observability-platform');
  });

  test('GET /api/urls without authorization token is rejected with 401', async () => {
    const res = await request(app).get('/api/urls');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  test('GET /api/urls with malformed authorization header is rejected with 401', async () => {
    const res = await request(app)
      .get('/api/urls')
      .set('Authorization', 'InvalidTokenFormat');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/urls with invalid JWT token signature is rejected with 401', async () => {
    const res = await request(app)
      .get('/api/urls')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.bogus');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid or expired');
  });

  test('GET /unknown-route triggers 404 handler with correlation ID', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.correlationId).toBeDefined();
  });

  test('Responses include correlation ID header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-correlation-id']).toBeDefined();
  });
});
