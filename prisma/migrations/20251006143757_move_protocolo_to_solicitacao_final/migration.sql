/*
  Warnings:

  - You are about to drop the column `protocoloSPG` on the `Prioridade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[protocoloSPG]` on the table `SolicitacaoPrioridade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `protocoloSPG` to the `SolicitacaoPrioridade` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Prioridade_protocoloSPG_key";

-- AlterTable
ALTER TABLE "Prioridade" DROP COLUMN "protocoloSPG";

-- AlterTable
ALTER TABLE "SolicitacaoPrioridade" ADD COLUMN     "protocoloSPG" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoPrioridade_protocoloSPG_key" ON "SolicitacaoPrioridade"("protocoloSPG");
