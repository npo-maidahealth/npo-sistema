/*
  Warnings:

  - Added the required column `tipo_mensagem` to the `Tratativa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Tratativa" ADD COLUMN     "tipo_mensagem" TEXT NOT NULL;
