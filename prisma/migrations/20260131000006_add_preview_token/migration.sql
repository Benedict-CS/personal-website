-- AlterTable
ALTER TABLE "Post" ADD COLUMN "previewToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_previewToken_key" ON "Post"("previewToken");
