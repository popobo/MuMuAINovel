-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "styleAnalysisConfidence" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "styleAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "styleLanguageLevel" TEXT,
ADD COLUMN     "stylePacing" TEXT,
ADD COLUMN     "styleProseQuality" TEXT,
ADD COLUMN     "styleTone" TEXT,
ADD COLUMN     "styleVoice" TEXT,
ADD COLUMN     "writingStyleAnalysis" TEXT,
ADD COLUMN     "writingStyleSummary" TEXT;
