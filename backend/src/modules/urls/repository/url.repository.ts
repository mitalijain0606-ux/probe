import { prisma } from '../../../database/prisma.js';
import type { Prisma } from '@prisma/client';

export interface CreateUrlInput {
  userId: string;
  url: string;
  label?: string | null;
  intervalSec?: number;
}

export function findManyByUser(userId: string) {
  return prisma.monitoredUrl.findMany({
    where: { userId },
    include: { stats: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function findAllWithOwner() {
  return prisma.monitoredUrl.findMany({
    include: { stats: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function findByIdForUser(id: string, userId: string) {
  return prisma.monitoredUrl.findFirst({
    where: { id, userId },
    include: { stats: true },
  });
}

export function findActiveWithLabel(id: string) {
  return prisma.monitoredUrl.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });
}

export function create(input: CreateUrlInput) {
  return prisma.monitoredUrl.create({
    data: {
      userId: input.userId,
      url: input.url,
      label: input.label ?? null,
      intervalSec: input.intervalSec ?? 300,
      stats: { create: {} },
    },
    include: { stats: true },
  });
}

export async function createManyIgnoringDuplicates(
  inputs: CreateUrlInput[],
): Promise<{ created: number }> {
  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const input of inputs) {
      const existing = await tx.monitoredUrl.findUnique({
        where: { userId_url: { userId: input.userId, url: input.url } },
      });
      if (existing) continue;
      await tx.monitoredUrl.create({
        data: {
          userId: input.userId,
          url: input.url,
          label: input.label ?? null,
          stats: { create: {} },
        },
      });
      created += 1;
    }
  });
  return { created };
}

export function remove(id: string, userId: string) {
  return prisma.monitoredUrl.deleteMany({ where: { id, userId } });
}

export function findAllActive() {
  return prisma.monitoredUrl.findMany({ where: { isActive: true }, select: { id: true, url: true } });
}

export function existsForUser(userId: string, url: string) {
  return prisma.monitoredUrl.findUnique({ where: { userId_url: { userId, url } } });
}

export type MonitoredUrlWithStats = Prisma.PromiseReturnType<typeof findByIdForUser>;
