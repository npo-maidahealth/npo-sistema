import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const escalas = await prisma.prioridade.findMany({
    include: { regulador: true } // inclui info do regulador se quiser
  });
  console.log(escalas);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
