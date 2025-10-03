/*
  Warnings:

  - A unique constraint covering the columns `[protocoloSPG]` on the table `Prioridade` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Prioridade" ADD COLUMN     "protocoloSPG" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Prioridade_protocoloSPG_key" ON "Prioridade"("protocoloSPG");
