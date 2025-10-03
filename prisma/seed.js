// prisma/seed.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando o processo de seeding...`);

  // 1. GARANTIR QUE OS CARGOS EXISTEM
  // ===================================
// Dentro de prisma/seed.js

const cargos = [
  'administrador',
  'npo',
  'gerente',
  'coordenador',
  'supervisor_call_center',
  'atendente_recepcao',    
  'atendente_call_center',  
  'faturamento',            
  'regulacao',             
  'supervisor',
  'analista',
  'gestor',
  'gestor_ti',
  'desenvolvedor',
  'cliente'               
];

  console.log('Verificando/Criando cargos essenciais...');
  for (const cargoNome of cargos) {
    await prisma.cargo.upsert({
      where: { nome: cargoNome },
      update: {},
      create: { nome: cargoNome },
    });
    console.log(`- Cargo "${cargoNome}" OK.`);
  }

  // 2. CRIAR UM USUÁRIO administrador PADRÃO
  // ========================================
  console.log('Verificando/Criando usuário administrador...');
  const salt = await bcrypt.genSalt(10);
  // Lembre-se de usar uma senha mais forte e guardá-la em um lugar seguro
  const hashedPassword = await bcrypt.hash('N@Login.29102025', salt);

  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@maida.health' },
    update: {}, // Não atualiza nada se o usuário já existir
    create: {
      nome: 'administrador do Sistema',
      email: 'admin@maida.health',
      senha_hash: hashedPassword,
      status: 'ATIVO',
    },
  });
  console.log(`- Usuário "${adminUser.nome}" OK.`);

  // 3. ASSOCIAR O USUÁRIO ADMIN AO CARGO ADMIN
  console.log('Associando usuário Admin ao cargo...');
  // Primeiro, pegamos o ID do cargo "administrador" que garantimos que existe
  const adminRole = await prisma.cargo.findUnique({
    where: { nome: 'administrador' },
  });

  // Usamos upsert para criar a ligação na tabela CargosDoUsuario
  await prisma.cargosDoUsuario.upsert({
    where: {
      // Esta é a chave única que definimos no schema para a tabela de ligação
      usuarioId_cargoId: {
        usuarioId: adminUser.id,
        cargoId: adminRole.id,
      },
    },
    update: {}, // Não faz nada se a ligação já existir
    create: {
      usuarioId: adminUser.id,
      cargoId: adminRole.id,
    },
  });
  console.log(`- Associação OK.`);
  console.log(`\nSeeding finalizado com sucesso!`);
}

main()
  .catch(async (e) => {
    console.error('Ocorreu um erro durante o seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });