-- CreateTable
CREATE TABLE "BookImportTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "error" TEXT,
    "preview" JSONB,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "importedProjectId" TEXT,
    "failedSteps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookImportTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookImportTask_taskId_key" ON "BookImportTask"("taskId");

-- CreateIndex
CREATE INDEX "BookImportTask_userId_updatedAt_idx" ON "BookImportTask"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "BookImportTask" ADD CONSTRAINT "BookImportTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
