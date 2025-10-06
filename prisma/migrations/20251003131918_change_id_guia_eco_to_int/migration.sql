/*
  Warnings:

  - The `idGuiaECO` column on the `Prioridade` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Prioridade" DROP COLUMN "idGuiaECO",
ADD COLUMN     "idGuiaECO" INTEGER;
