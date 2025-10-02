// Arquivo: /db/prisma.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_DATABASE_URL 
        }
    },
    log: [
        {
            emit: 'event',
            level: 'error',
        },
    ],
});

export default prisma;