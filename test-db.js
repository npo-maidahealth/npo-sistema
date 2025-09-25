// test-db.js
//PARA TESTAR NO TERMINA

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Tentando conectar ao banco de dados...');
        await prisma.$connect();
        console.log('✅ Conexão com o banco de dados bem-sucedida!');
    } catch (error) {
        console.error('❌ Falha ao conectar ao banco de dados:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();