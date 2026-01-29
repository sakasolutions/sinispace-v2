-- CreateTable
CREATE TABLE "ShoppingListFrequentItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingListFrequentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingListFrequentItem_userId_itemLabel_key" ON "ShoppingListFrequentItem"("userId", "itemLabel");

-- CreateIndex
CREATE INDEX "ShoppingListFrequentItem_userId_idx" ON "ShoppingListFrequentItem"("userId");

-- CreateIndex
CREATE INDEX "ShoppingListFrequentItem_userId_usageCount_idx" ON "ShoppingListFrequentItem"("userId", "usageCount");

-- AddForeignKey
ALTER TABLE "ShoppingListFrequentItem" ADD CONSTRAINT "ShoppingListFrequentItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
