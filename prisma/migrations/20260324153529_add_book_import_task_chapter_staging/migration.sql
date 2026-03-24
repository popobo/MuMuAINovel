-- CreateTable
CREATE TABLE "BookImportTaskChapter" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "outlineTitle" TEXT,
    "outlineContent" TEXT,
    "outlineStructure" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookImportTaskChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookImportTaskChapter_taskId_status_idx" ON "BookImportTaskChapter"("taskId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookImportTaskChapter_taskId_chapterNumber_key" ON "BookImportTaskChapter"("taskId", "chapterNumber");

-- AddForeignKey
ALTER TABLE "BookImportTaskChapter" ADD CONSTRAINT "BookImportTaskChapter_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "BookImportTask"("taskId") ON DELETE CASCADE ON UPDATE CASCADE;
