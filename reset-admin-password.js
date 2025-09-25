// reset-admin-password.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  // --- CONFIGURE AQUI ---
  const adminEmail = 'jennifer.batista@maida.health'; // <-- CONFIRME SEU E-MAIL DE ADMIN AQUI
  const newPassword = 'mudar123';
  // --------------------

  console.log(`🔄 Resetando a senha para o usuário: ${adminEmail}`);

  try {
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    console.log('✅ Novo hash de senha gerado com sucesso pelo seu projeto.');

    const updatedUser = await prisma.usuario.update({
      where: {
        email: adminEmail,
      },
      data: {
        senha_hash: newPasswordHash,
        status: 'ATIVO' // Garante que o status também está ATIVO
      },
    });

    console.log('🎉 Senha resetada e usuário ativado com sucesso no banco de dados!');
    console.log('Usuário:', updatedUser.email, '| Status:', updatedUser.status);

  } catch (error) {
    console.error('❌ ERRO ao tentar resetar a senha:', error);
    if (error.code === 'P2025') {
        console.error(`--> Erro: Usuário com o e-mail "${adminEmail}" não foi encontrado no banco de dados.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();