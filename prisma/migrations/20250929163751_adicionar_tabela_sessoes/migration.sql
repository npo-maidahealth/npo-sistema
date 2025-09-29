/*
  Warnings:

  - You are about to drop the column `regional` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the `Escala` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Escala" DROP CONSTRAINT "Escala_reguladorId_fkey";

-- AlterTable
ALTER TABLE "public"."Cargo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."CargosDoUsuario" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Prioridade" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Produto" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."ProdutosDoUsuario" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Protocolo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Regulador" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Tratativa" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Usuario" DROP COLUMN "regional",
ADD COLUMN     "regional_id" INTEGER,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."Escala";

-- CreateTable
CREATE TABLE "public"."Escala_Regulacao" (
    "id" SERIAL NOT NULL,
    "reguladorId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "turno" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "filas" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Regional" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "Regional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escala_reguladorId_diaSemana_turno_key" ON "public"."Escala_Regulacao"("reguladorId", "diaSemana", "turno");

-- CreateIndex
CREATE INDEX "IDX_user_sessions_expire" ON "public"."user_sessions"("expire");

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "public"."Regional"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Escala_Regulacao" ADD CONSTRAINT "Escala_reguladorId_fkey" FOREIGN KEY ("reguladorId") REFERENCES "public"."Regulador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
