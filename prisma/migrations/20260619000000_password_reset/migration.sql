-- Password reset: token hash + expiry on User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_passwordResetTokenHash_idx"
  ON "User" ("passwordResetTokenHash");
