-- CreateTable
CREATE TABLE "public"."Prioridade" (
    "id" SERIAL NOT NULL,
    "numeroGuia" TEXT NOT NULL,
    "tipoGuia" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "caracterAtendimento" TEXT,
    "observacao" TEXT,
    "produtoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "reguladorId" INTEGER,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3),
    "capturada" BOOLEAN NOT NULL DEFAULT false,
    "vencimento" TIMESTAMP(3),
    "autorizada" BOOLEAN NOT NULL DEFAULT false,
    "regulada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Prioridade_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Prioridade" ADD CONSTRAINT "Prioridade_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "public"."Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prioridade" ADD CONSTRAINT "Prioridade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prioridade" ADD CONSTRAINT "Prioridade_reguladorId_fkey" FOREIGN KEY ("reguladorId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
