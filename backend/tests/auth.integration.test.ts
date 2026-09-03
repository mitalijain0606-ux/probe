import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

interface FakeUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

const users = new Map<string, FakeUser>();
let idCounter = 0;

vi.mock('../src/database/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) {
            return [...users.values()].find((u) => u.email === where.email) ?? null;
          }
          if (where.id) {
            return users.get(where.id) ?? null;
          }
          return null;
        }),
        create: vi.fn(async ({ data }: { data: Omit<FakeUser, 'id' | 'role' | 'createdAt' | 'updatedAt'> }) => {
          idCounter += 1;
          const user: FakeUser = {
            id: `user-${idCounter}`,
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            role: 'USER',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.set(user.id, user);
          return user;
        }),
      },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
    disconnectPrisma: vi.fn(),
  };
});

const { createApp } = await import('../src/app.js');

describe('auth API', () => {
  beforeEach(() => {
    users.clear();
    idCounter = 0;
  });

  it('registers a new user and returns a token', async () => {
    const app = createApp();
    const response = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'StrongPass1',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('ada@example.com');
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.token).toBeTypeOf('string');
  });

  it('rejects registration with a weak password', async () => {
    const app = createApp();
    const response = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada2@example.com',
      password: 'weak',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects duplicate registration', async () => {
    const app = createApp();
    await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'dup@example.com',
      password: 'StrongPass1',
    });

    const second = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'dup@example.com',
      password: 'StrongPass1',
    });

    expect(second.status).toBe(409);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const app = createApp();
    await request(app).post('/api/auth/register').send({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'StrongPass1',
    });

    const goodLogin = await request(app).post('/api/auth/login').send({
      email: 'grace@example.com',
      password: 'StrongPass1',
    });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.data.token).toBeTypeOf('string');

    const badLogin = await request(app).post('/api/auth/login').send({
      email: 'grace@example.com',
      password: 'WrongPassword1',
    });
    expect(badLogin.status).toBe(401);
  });

  it('rejects access to protected routes without a token', async () => {
    const app = createApp();
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('allows access to /me with a valid token', async () => {
    const app = createApp();
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Margaret Hamilton',
      email: 'margaret@example.com',
      password: 'StrongPass1',
    });

    const token = registerResponse.body.data.token as string;
    const meResponse = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('margaret@example.com');
  });
});
