import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

interface FakeUrl {
  id: string;
  userId: string;
  url: string;
  label: string | null;
  isActive: boolean;
  intervalSec: number;
  createdAt: Date;
  updatedAt: Date;
  stats: null;
}

const urls = new Map<string, FakeUrl>();
let idCounter = 0;

vi.mock('../src/database/prisma.js', () => ({
  prisma: { $connect: vi.fn(), $disconnect: vi.fn() },
  disconnectPrisma: vi.fn(),
}));

vi.mock('../src/modules/urls/repository/url.repository.js', () => ({
  findManyByUser: vi.fn(async (userId: string) => [...urls.values()].filter((u) => u.userId === userId)),
  findByIdForUser: vi.fn(async (id: string, userId: string) => {
    const found = urls.get(id);
    return found && found.userId === userId ? found : null;
  }),
  findActiveWithLabel: vi.fn(async (id: string) => urls.get(id) ?? null),
  create: vi.fn(async (input: { userId: string; url: string; label?: string | null; intervalSec?: number }) => {
    idCounter += 1;
    const record: FakeUrl = {
      id: `url-${idCounter}`,
      userId: input.userId,
      url: input.url,
      label: input.label ?? null,
      isActive: true,
      intervalSec: input.intervalSec ?? 300,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: null,
    };
    urls.set(record.id, record);
    return record;
  }),
  createManyIgnoringDuplicates: vi.fn(async () => ({ created: 0 })),
  remove: vi.fn(async (id: string, userId: string) => {
    const found = urls.get(id);
    if (found && found.userId === userId) {
      urls.delete(id);
      return { count: 1 };
    }
    return { count: 0 };
  }),
  findAllActive: vi.fn(async () => [...urls.values()]),
  existsForUser: vi.fn(async (userId: string, url: string) =>
    [...urls.values()].find((u) => u.userId === userId && u.url === url) ?? null,
  ),
}));

vi.mock('../src/jobs/job-queue.js', () => ({
  enqueueJob: vi.fn(() => ({ id: 'job-1' })),
  registerJobHandler: vi.fn(),
  queueDepth: vi.fn(() => 0),
}));

const { createApp } = await import('../src/app.js');

function tokenFor(userId: string): string {
  return jwt.sign({ sub: userId, role: 'USER' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

describe('urls API', () => {
  beforeEach(() => {
    urls.clear();
    idCounter = 0;
  });

  it('creates a URL for the authenticated user', async () => {
    const app = createApp();
    const token = tokenFor('user-a');

    const response = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', label: 'Example' });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toBe('https://example.com/');
  });

  it('rejects an invalid URL', async () => {
    const app = createApp();
    const token = tokenFor('user-a');

    const response = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'not-a-url' });

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate URL for the same user', async () => {
    const app = createApp();
    const token = tokenFor('user-a');

    await request(app).post('/api/urls').set('Authorization', `Bearer ${token}`).send({ url: 'https://example.com' });

    const second = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com' });

    expect(second.status).toBe(409);
  });

  it('prevents a user from accessing another user\'s URL by id', async () => {
    const app = createApp();
    const tokenA = tokenFor('user-a');
    const tokenB = tokenFor('user-b');

    const createResponse = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://private.example.com' });

    const urlId = createResponse.body.data.id as string;

    const response = await request(app).get(`/api/urls/${urlId}`).set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });

  it('deletes a URL owned by the requesting user', async () => {
    const app = createApp();
    const token = tokenFor('user-a');

    const createResponse = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://to-delete.example.com' });

    const urlId = createResponse.body.data.id as string;

    const deleteResponse = await request(app).delete(`/api/urls/${urlId}`).set('Authorization', `Bearer ${token}`);
    expect(deleteResponse.status).toBe(200);
  });

  it('rejects requests without authentication', async () => {
    const app = createApp();
    const response = await request(app).get('/api/urls');
    expect(response.status).toBe(401);
  });

  it('enqueues a manual check and returns 202 with a job id', async () => {
    const app = createApp();
    const token = tokenFor('user-a');

    const createResponse = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://check-me.example.com' });

    const urlId = createResponse.body.data.id as string;

    const checkResponse = await request(app).post(`/api/urls/${urlId}/check`).set('Authorization', `Bearer ${token}`);

    expect(checkResponse.status).toBe(202);
    expect(checkResponse.body.data.jobId).toBe('job-1');
  });
});
