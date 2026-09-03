import argon2 from 'argon2';
import { AppError } from '../../../utils/app-error.js';
import { logger } from '../../../logger/logger.js';
import * as userRepository from '../repository/user.repository.js';
import { signToken } from './token.service.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

function toPublicUser(user: { id: string; name: string; email: string; role: string; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(input: RegisterInput) {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  logger.info({ event: 'auth.registered', userId: user.id }, 'user registered');

  const token = signToken({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

export async function login(input: LoginInput) {
  const user = await userRepository.findByEmail(input.email);
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) {
    logger.warn({ event: 'auth.login_failed', userId: user.id }, 'invalid password attempt');
    throw AppError.unauthorized('Invalid email or password');
  }

  logger.info({ event: 'auth.login', userId: user.id }, 'user logged in');

  const token = signToken({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

export async function getProfile(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return toPublicUser(user);
}
