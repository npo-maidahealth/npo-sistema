/*
  Warnings:

  - You are about to drop the column `idGuiaECO` on the `Prioridade` table. All the data in the column will be lost.
  - You are about to drop the column `regional_id` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the `Escala_Regulacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Regional` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SolicitacaoPrioridade` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Escala_Regulacao" DROP CONSTRAINT "Escala_reguladorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SolicitacaoPrioridade" DROP CONSTRAINT "SolicitacaoPrioridade_prioridadeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SolicitacaoPrioridade" DROP CONSTRAINT "SolicitacaoPrioridade_reguladorPlantaoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Usuario" DROP CONSTRAINT "Usuario_regional_id_fkey";

-- DropIndex
DROP INDEX "public"."IDX_user_sessions_expire";

-- AlterTable
ALTER TABLE "Cargo" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CargosDoUsuario" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Prioridade" DROP COLUMN "idGuiaECO",
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Produto" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProdutosDoUsuario" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Protocolo" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Regulador" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Tratativa" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "regional_id",
ADD COLUMN     "aprovado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regional" TEXT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_sessions" RENAME CONSTRAINT "user_sessions_pkey" TO "session_pkey";

-- DropTable
DROP TABLE "public"."Escala_Regulacao";

-- DropTable
DROP TABLE "public"."Regional";

-- DropTable
DROP TABLE "public"."SolicitacaoPrioridade";

-- CreateTable
CREATE TABLE "Escala" (
    "id" SERIAL NOT NULL,
    "reguladorId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "turno" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "filas" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playing_with_neon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL,

    CONSTRAINT "playing_with_neon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escala_reguladorId_diaSemana_turno_key" ON "Escala"("reguladorId", "diaSemana", "turno");

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_reguladorId_fkey" FOREIGN KEY ("reguladorId") REFERENCES "Regulador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
