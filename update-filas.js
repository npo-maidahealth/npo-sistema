// update-filas.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Função de normalização (mesma que usamos antes)
  const normalize = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  };

  // Busca todas as escalas
  const escalas = await prisma.escala.findMany();

  // Atualiza cada uma
  for (const escala of escalas) {
    const filasNormalizadas = normalize(escala.filas);
    if (filasNormalizadas !== escala.filas) {  // Atualiza só se mudou
      await prisma.escala.update({
        where: { id: escala.id },
        data: { filas: filasNormalizadas },
      });
      console.log(`Atualizada escala ID ${escala.id}: '${escala.filas}' -> '${filasNormalizadas}'`);
    }
  }

  console.log('Atualização concluída!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });