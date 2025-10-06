/*
  Warnings:

  - A unique constraint covering the columns `[protocoloSPG]` on the table `Prioridade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `protocoloSPG` to the `Prioridade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prioridade" ADD COLUMN     "inativaVisualizacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "protocoloSPG" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Prioridade_protocoloSPG_key" ON "Prioridade"("protocoloSPG");
