/*
  Warnings:

  - You are about to drop the column `cargo` on the `Usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Usuario" DROP COLUMN "cargo";

-- CreateTable
CREATE TABLE "public"."Cargo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CargosDoUsuario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "cargoId" INTEGER NOT NULL,

    CONSTRAINT "CargosDoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_nome_key" ON "public"."Cargo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CargosDoUsuario_usuarioId_cargoId_key" ON "public"."CargosDoUsuario"("usuarioId", "cargoId");

-- AddForeignKey
ALTER TABLE "public"."CargosDoUsuario" ADD CONSTRAINT "CargosDoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CargosDoUsuario" ADD CONSTRAINT "CargosDoUsuario_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "public"."Cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
