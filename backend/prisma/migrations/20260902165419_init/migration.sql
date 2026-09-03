-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('TIMEOUT', 'DNS_FAILURE', 'CONNECTION_REFUSED', 'SSL_ERROR', 'BLOCKED_TARGET', 'INVALID_URL', 'HTTP_ERROR', 'NETWORK_ERROR', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_urls" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "label" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "intervalSec" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_results" (
    "id" BIGSERIAL NOT NULL,
    "urlId" UUID NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "statusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "errorType" "ErrorType",
    "errorMessage" VARCHAR(500),
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_stats" (
    "urlId" UUID NOT NULL,
    "totalChecks" BIGINT NOT NULL DEFAULT 0,
    "successfulChecks" BIGINT NOT NULL DEFAULT 0,
    "failedChecks" BIGINT NOT NULL DEFAULT 0,
    "totalResponseTime" BIGINT NOT NULL DEFAULT 0,
    "responseSamples" BIGINT NOT NULL DEFAULT 0,
    "lastStatus" "CheckStatus",
    "lastStatusCode" INTEGER,
    "lastResponseTimeMs" INTEGER,
    "lastErrorType" "ErrorType",
    "lastCheckedAt" TIMESTAMP(3),
    "consecutiveFails" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "url_stats_pkey" PRIMARY KEY ("urlId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "monitored_urls_userId_isActive_idx" ON "monitored_urls"("userId", "isActive");

-- CreateIndex
CREATE INDEX "monitored_urls_isActive_id_idx" ON "monitored_urls"("isActive", "id");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_urls_userId_url_key" ON "monitored_urls"("userId", "url");

-- CreateIndex
CREATE INDEX "check_results_urlId_checkedAt_idx" ON "check_results"("urlId", "checkedAt" DESC);

-- CreateIndex
CREATE INDEX "check_results_checkedAt_idx" ON "check_results"("checkedAt");

-- AddForeignKey
ALTER TABLE "monitored_urls" ADD CONSTRAINT "monitored_urls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_results" ADD CONSTRAINT "check_results_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "monitored_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_stats" ADD CONSTRAINT "url_stats_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "monitored_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

