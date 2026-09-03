process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-that-is-at-least-32-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://uho:uho_password@localhost:5432/url_health_test';
