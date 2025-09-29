import bcrypt from 'bcryptjs';
import prisma from './db/prisma.js'; 

async function main() {
  const email = 'jennifer.batista@maida.health';
  const senha = 'maida@ftz'; 

  // Gerar o hash
  const hash = await bcrypt.hash(senha, 10);

  // Atualizar no banco
  const usuario = await prisma.usuario.update({
    where: { email },
    data: { senha_hash: hash }
  });

  console.log('Senha atualizada com sucesso!', usuario);
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit());
