-- CreateTable
CREATE TABLE "PlantEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlantEvent" ADD CONSTRAINT "PlantEvent_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
