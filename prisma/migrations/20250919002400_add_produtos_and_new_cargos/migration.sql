-- CreateTable
CREATE TABLE "public"."Produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProdutosDoUsuario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,

    CONSTRAINT "ProdutosDoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_nome_key" ON "public"."Produto"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutosDoUsuario_usuarioId_produtoId_key" ON "public"."ProdutosDoUsuario"("usuarioId", "produtoId");

-- AddForeignKey
ALTER TABLE "public"."ProdutosDoUsuario" ADD CONSTRAINT "ProdutosDoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProdutosDoUsuario" ADD CONSTRAINT "ProdutosDoUsuario_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "public"."Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
