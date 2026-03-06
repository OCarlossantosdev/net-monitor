-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "hostname" TEXT NOT NULL DEFAULT 'Desconhecido',
    "mac" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_ip_key" ON "Device"("ip");
