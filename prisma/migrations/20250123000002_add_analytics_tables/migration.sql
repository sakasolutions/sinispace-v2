-- CreateTable
CREATE TABLE IF NOT EXISTS "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "page" TEXT,
    "feature" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeatureUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "category" TEXT,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivity_userId_createdAt_idx" ON "UserActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivity_action_createdAt_idx" ON "UserActivity"("action", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivity_feature_createdAt_idx" ON "UserActivity"("feature", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureUsage_userId_createdAt_idx" ON "FeatureUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureUsage_feature_createdAt_idx" ON "FeatureUsage"("feature", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureUsage_category_createdAt_idx" ON "FeatureUsage"("category", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureUsage_createdAt_idx" ON "FeatureUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureUsage" ADD CONSTRAINT "FeatureUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
