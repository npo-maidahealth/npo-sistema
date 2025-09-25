-- AlterTable
ALTER TABLE "public"."Prioridade" ADD COLUMN     "area" TEXT,
ADD COLUMN     "atrasada" BOOLEAN,
ADD COLUMN     "atrasoRegulacao" TEXT,
ADD COLUMN     "beneficiario" TEXT,
ADD COLUMN     "beneficiarioNomeSocial" TEXT,
ADD COLUMN     "cartaoBeneficiario" TEXT,
ADD COLUMN     "cpfBeneficiario" TEXT,
ADD COLUMN     "dataHoraSolicitacao" TIMESTAMP(3),
ADD COLUMN     "dataPausaSla" TIMESTAMP(3),
ADD COLUMN     "dataRegulacao" TIMESTAMP(3),
ADD COLUMN     "dataSolicitacao" TIMESTAMP(3),
ADD COLUMN     "dataVencimentoSla" TIMESTAMP(3),
ADD COLUMN     "fila" TEXT;
