-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDENTE', 'ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDENTE',
ALTER COLUMN "senha_hash" DROP NOT NULL;
