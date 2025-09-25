// Arquivo: /db/prisma.js

import { PrismaClient } from '@prisma/client';

// Cria a única instância que será usada em todo o projeto
const prisma = new PrismaClient();

export default prisma;