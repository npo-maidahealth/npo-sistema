// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando o processo de seeding...`);

  // Lista de cargos essenciais para o sistema
  const cargos = [
    'cliente', 
    'supervisor',
    'analista', 
    'supervisor_callcenter',
    'gestor',
    'NPO', 
    'admin', 
    'atendente_callcenter',
    'atendente_recepcao', 
    'regulacao', 
    'coordenador',
    'gerente', 
    'gestor_ti'
  ];

  // Loop para criar cada cargo
  for (const cargoNome of cargos) {
    // upsert: cria o cargo se ele não existir, ou não faz nada se já existir.
    await prisma.cargo.upsert({
      where: { nome: cargoNome },
      update: {},
      create: { nome: cargoNome },
    });
    console.log(`- Cargo "${cargoNome}" criado ou já existente.`);
  }

  console.log(`Seeding finalizado com sucesso.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });