import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron'; 

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

// Importa a função que é autônoma e corrige o status das guias.
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
    ssl: { rejectUnauthorized: false },
    max: 20, 
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 2000 
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

    // ========================================================
    // LÓGICA DE CRON JOB (TAREFA AGENDADA)
    // ========================================================
    try {
        console.log('⏰ Agendando atualização automática de status...');
        
        // Agendamento: Roda a função a cada 10 minutos (*/10)
        cron.schedule('*/10 * * * *', () => {
            console.log('❌ CRON: Executando atualização de status das guias...');
            // Chama a função e trata erros para não travar o processo
            atualizarStatusGuias().catch(err => console.error('❌ CRON JOB FAILED:', err));
        });
        
        console.log('✅ Atualização automática agendada para rodar a cada 10 minutos.');
    } catch (err) {
        console.error('❌ Erro ao agendar a atualização automática:', err);
    }
});