-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "whatsapp" TEXT,
    "regional" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Protocolo" (
    "id" SERIAL NOT NULL,
    "protocolo_uid" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo_automacao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "nivel_dificuldade" INTEGER,
    "ferramentas_indicadas" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fechamento" TIMESTAMP(3),
    "id_solicitante" INTEGER NOT NULL,
    "id_responsavel" INTEGER,

    CONSTRAINT "Protocolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tratativa" (
    "id" SERIAL NOT NULL,
    "id_protocolo" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tratativa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Protocolo_protocolo_uid_key" ON "public"."Protocolo"("protocolo_uid");

-- AddForeignKey
ALTER TABLE "public"."Protocolo" ADD CONSTRAINT "Protocolo_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Protocolo" ADD CONSTRAINT "Protocolo_id_responsavel_fkey" FOREIGN KEY ("id_responsavel") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tratativa" ADD CONSTRAINT "Tratativa_id_protocolo_fkey" FOREIGN KEY ("id_protocolo") REFERENCES "public"."Protocolo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tratativa" ADD CONSTRAINT "Tratativa_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
