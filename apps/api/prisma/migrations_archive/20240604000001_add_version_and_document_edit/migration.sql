-- Add version column to Document
ALTER TABLE "Document" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Create DocumentEdit table
CREATE TABLE "DocumentEdit" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEdit_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "DocumentEdit_documentId_version_idx" ON "DocumentEdit"("documentId", "version");
CREATE INDEX "DocumentEdit_userId_idx" ON "DocumentEdit"("userId");

-- Add foreign keys
ALTER TABLE "DocumentEdit" ADD CONSTRAINT "DocumentEdit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentEdit" ADD CONSTRAINT "DocumentEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
