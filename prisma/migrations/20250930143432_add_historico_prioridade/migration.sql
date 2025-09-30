-- CreateTable
CREATE TABLE "public"."SolicitacaoPrioridade" (
    "id" SERIAL NOT NULL,
    "prioridadeId" INTEGER NOT NULL,
    "reguladorPlantaoId" INTEGER,
    "dataHoraSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacaoSolicitacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoPrioridade_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SolicitacaoPrioridade" ADD CONSTRAINT "SolicitacaoPrioridade_prioridadeId_fkey" FOREIGN KEY ("prioridadeId") REFERENCES "public"."Prioridade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolicitacaoPrioridade" ADD CONSTRAINT "SolicitacaoPrioridade_reguladorPlantaoId_fkey" FOREIGN KEY ("reguladorPlantaoId") REFERENCES "public"."Regulador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
