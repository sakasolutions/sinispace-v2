-- Add lastLoginAt column if it doesn't exist
-- This migration is safe to run multiple times
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'lastLoginAt'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
    END IF;
END $$;
