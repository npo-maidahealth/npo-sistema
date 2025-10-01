// Arquivo: /db/prisma.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL + 
                 (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 
                 'statement_cache_size=0'
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