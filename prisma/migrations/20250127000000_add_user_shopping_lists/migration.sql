-- CreateTable
CREATE TABLE "UserShoppingLists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listsJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserShoppingLists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserShoppingLists_userId_key" ON "UserShoppingLists"("userId");

-- CreateIndex
CREATE INDEX "UserShoppingLists_userId_idx" ON "UserShoppingLists"("userId");

-- AddForeignKey
ALTER TABLE "UserShoppingLists" ADD CONSTRAINT "UserShoppingLists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
