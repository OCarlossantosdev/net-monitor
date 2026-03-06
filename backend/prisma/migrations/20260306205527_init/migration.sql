-- CreateTable
CREATE TABLE "NetworkLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "host" TEXT NOT NULL,
    "latency" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "packetLoss" DOUBLE PRECISION,
    "type" TEXT NOT NULL,

    CONSTRAINT "NetworkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outage" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "probableCause" TEXT,

    CONSTRAINT "Outage_pkey" PRIMARY KEY ("id")
);
