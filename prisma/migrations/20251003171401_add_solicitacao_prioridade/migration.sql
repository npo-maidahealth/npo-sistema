/*
  Warnings:

  - You are about to drop the column `protocoloSPG` on the `Prioridade` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Prioridade_protocoloSPG_key";

-- AlterTable
ALTER TABLE "Prioridade" DROP COLUMN "protocoloSPG";

-- CreateTable
CREATE TABLE "SolicitacaoPrioridade" (
    "id" SERIAL NOT NULL,
    "prioridadeId" INTEGER NOT NULL,
    "protocoloSPG" TEXT NOT NULL,
    "dataHoraSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacaoSolicitacao" TEXT,
    "reguladorPlantaoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoPrioridade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoPrioridade_protocoloSPG_key" ON "SolicitacaoPrioridade"("protocoloSPG");

-- AddForeignKey
ALTER TABLE "SolicitacaoPrioridade" ADD CONSTRAINT "SolicitacaoPrioridade_prioridadeId_fkey" FOREIGN KEY ("prioridadeId") REFERENCES "Prioridade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoPrioridade" ADD CONSTRAINT "SolicitacaoPrioridade_reguladorPlantaoId_fkey" FOREIGN KEY ("reguladorPlantaoId") REFERENCES "Regulador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
