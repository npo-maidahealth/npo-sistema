import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Rotas
import { isAuthenticated } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import protocoloRoutes from './routes/protocolos.routes.js';
import relatorioRoutes from './routes/relatorios.routes.js';
import painelRoutes from './routes/painel.routes.js';
import triagemRoutes from './routes/triagem.routes.js';
import ecoRoutes from './routes/eco.routes.js';
import prioridadesRoutes from './routes/prioridades.routes.js';
import escalasRoutes from './routes/escalas.routes.js';
import reguladorRoutes from './routes/regulador.routes.js';
import usuariosRoutes from './routes/users.routes.js';

import { atualizarStatusGuias } from './services/atualizadorStatus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);


// Configuração do CORS
const allowedOrigins = ['http://localhost:3000'];
if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());
app.use(cookieParser());

// Configuração do Session Store com PostgreSQL
const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const PgSession = connectPgSimple(session);

app.use(session({
    store: new PgSession({
        pool: pgPool,
        tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax' 
    }
}));


// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/triagem', triagemRoutes);
app.use('/api/protocolos', protocoloRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/painel', painelRoutes);
app.use('/api/eco', ecoRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/prioridades', prioridadesRoutes);
app.use('/api/regulador', reguladorRoutes);
app.use('/api/escalas', escalasRoutes);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal e fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);

    try {
        console.log('⏰ Iniciando atualização automática de status...');
        setInterval(() => {
            atualizarStatusGuias().catch(err => console.error('❌ Erro durante a atualização agendada:', err));
        }, 10 * 60 * 1000);
        console.log('✅ Atualização automática agendada.');
    } catch (err) {
        console.error('❌ Erro ao agendar a atualização automática:', err);
    }
});