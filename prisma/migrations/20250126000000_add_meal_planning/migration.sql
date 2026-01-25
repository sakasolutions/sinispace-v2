-- Add Meal Planning Tables
-- MealPreferences und WeeklyPlan für Premium Wochenplaner

-- MealPreferences Tabelle
CREATE TABLE IF NOT EXISTS "MealPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietType" TEXT,
    "allergies" TEXT,
    "householdSize" INTEGER NOT NULL DEFAULT 2,
    "budgetRange" TEXT,
    "mealTypes" TEXT,
    "mealPrep" BOOLEAN NOT NULL DEFAULT false,
    "cookingLevel" TEXT,
    "preferredCuisines" TEXT,
    "dislikedIngredients" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPreferences_pkey" PRIMARY KEY ("id")
);

-- WeeklyPlan Tabelle
CREATE TABLE IF NOT EXISTS "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "planData" TEXT NOT NULL,
    "budgetEstimate" DOUBLE PRECISION,
    "totalFeedback" INTEGER NOT NULL DEFAULT 0,
    "autoPlanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$ 
BEGIN
    -- MealPreferences Foreign Key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MealPreferences_userId_fkey'
    ) THEN
        ALTER TABLE "MealPreferences" 
        ADD CONSTRAINT "MealPreferences_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;

    -- WeeklyPlan Foreign Keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'WeeklyPlan_userId_fkey'
    ) THEN
        ALTER TABLE "WeeklyPlan" 
        ADD CONSTRAINT "WeeklyPlan_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'WeeklyPlan_workspaceId_fkey'
    ) THEN
        ALTER TABLE "WeeklyPlan" 
        ADD CONSTRAINT "WeeklyPlan_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Unique Constraints
DO $$ 
BEGIN
    -- MealPreferences: Ein User hat nur eine Präferenz
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MealPreferences_userId_key'
    ) THEN
        ALTER TABLE "MealPreferences" 
        ADD CONSTRAINT "MealPreferences_userId_key" UNIQUE ("userId");
    END IF;

    -- WeeklyPlan: Ein User hat nur einen Plan pro Woche
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'WeeklyPlan_userId_weekStart_key'
    ) THEN
        ALTER TABLE "WeeklyPlan" 
        ADD CONSTRAINT "WeeklyPlan_userId_weekStart_key" UNIQUE ("userId", "weekStart");
    END IF;
END $$;

-- Indizes
DO $$ 
BEGIN
    -- MealPreferences Indizes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MealPreferences_userId_idx') THEN
        CREATE INDEX "MealPreferences_userId_idx" ON "MealPreferences"("userId");
    END IF;

    -- WeeklyPlan Indizes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WeeklyPlan_userId_weekStart_idx') THEN
        CREATE INDEX "WeeklyPlan_userId_weekStart_idx" ON "WeeklyPlan"("userId", "weekStart");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WeeklyPlan_workspaceId_weekStart_idx') THEN
        CREATE INDEX "WeeklyPlan_workspaceId_weekStart_idx" ON "WeeklyPlan"("workspaceId", "weekStart");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WeeklyPlan_createdAt_idx') THEN
        CREATE INDEX "WeeklyPlan_createdAt_idx" ON "WeeklyPlan"("createdAt");
    END IF;
END $$;
