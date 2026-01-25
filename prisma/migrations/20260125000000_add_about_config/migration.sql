-- CreateTable
CREATE TABLE IF NOT EXISTS "AboutConfig" (
    "id" TEXT NOT NULL,
    "profileImage" TEXT,
    "schoolLogos" TEXT NOT NULL DEFAULT '[]',
    "projectImages" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AboutConfig_id_key" ON "AboutConfig"("id");
