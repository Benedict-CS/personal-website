-- CreateTable
CREATE TABLE "AccessBlockLog" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessBlockLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessBlockLog_createdAt_idx" ON "AccessBlockLog"("createdAt");

-- CreateIndex
CREATE INDEX "AccessBlockLog_ip_idx" ON "AccessBlockLog"("ip");
