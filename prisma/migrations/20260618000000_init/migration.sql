-- Initial GamePlaza schema for Docker/VPS deployments.
-- Safe for fresh databases; existing deployments keep using applied migrations history.

DO $$ BEGIN CREATE TYPE "Source" AS ENUM ('DIGISELLER', 'PLATI'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ImportStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ImportItemStatus" AS ENUM ('IMPORTED', 'UPDATED', 'SKIPPED', 'NOT_FOUND', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CategoryKind" AS ENUM ('CATEGORY', 'GENRE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "CategoryKind" NOT NULL DEFAULT 'CATEGORY',
  "icon" TEXT,
  "image" TEXT,
  "description" TEXT,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "source" "Source" NOT NULL,
  "externalId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "oldPrice" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "image" TEXT,
  "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewsCount" INTEGER NOT NULL DEFAULT 0,
  "sellerName" TEXT,
  "sellerUrl" TEXT,
  "platform" TEXT,
  "publisher" TEXT,
  "region" TEXT,
  "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "categoryId" TEXT,
  "affiliateUrl" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ProductView" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateClick" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportState" (
  "id" TEXT NOT NULL,
  "source" "Source" NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'IDLE',
  "startId" INTEGER NOT NULL DEFAULT 1,
  "cursorId" INTEGER NOT NULL DEFAULT 0,
  "maxId" INTEGER,
  "concurrency" INTEGER NOT NULL DEFAULT 1,
  "delayMs" INTEGER NOT NULL DEFAULT 2000,
  "recheckHours" INTEGER NOT NULL DEFAULT 24,
  "dailyLimit" INTEGER NOT NULL DEFAULT 200,
  "totalChecked" INTEGER NOT NULL DEFAULT 0,
  "totalImported" INTEGER NOT NULL DEFAULT 0,
  "totalSkipped" INTEGER NOT NULL DEFAULT 0,
  "totalErrors" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "lastRunAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportLog" (
  "id" TEXT NOT NULL,
  "source" "Source" NOT NULL,
  "externalId" TEXT NOT NULL,
  "status" "ImportItemStatus" NOT NULL,
  "message" TEXT,
  "productId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_source_externalId_key" ON "Product"("source", "externalId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_platform_idx" ON "Product"("platform");
CREATE INDEX "Product_publisher_idx" ON "Product"("publisher");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Review_productId_idx" ON "Review"("productId");
CREATE INDEX "ProductView_productId_idx" ON "ProductView"("productId");
CREATE INDEX "ProductView_createdAt_idx" ON "ProductView"("createdAt");
CREATE INDEX "AffiliateClick_productId_idx" ON "AffiliateClick"("productId");
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ImportState_source_key" ON "ImportState"("source");
CREATE INDEX "ImportLog_source_createdAt_idx" ON "ImportLog"("source", "createdAt");
CREATE INDEX "ImportLog_status_createdAt_idx" ON "ImportLog"("status", "createdAt");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;