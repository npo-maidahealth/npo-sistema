import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// rotas ES Modules
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

import { atualizarStatusGuias } from './services/atualizadorStatus.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24*60*60*1000 }
}));

// Rotas da API carregadas primeiro
app.use('/api/auth', authRoutes);
app.use('/api/triagem', triagemRoutes);
app.use('/api/protocolos', protocoloRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/painel', painelRoutes);
app.use('/api/eco', ecoRoutes);

app.use('/api/prioridades', (req, res, next) => {
    // --- Início do nosso "espião" ---
    console.log("-----------------------------------------------------");
    console.log(`[LOG EM server.js] Chegou uma requisição para /api/prioridades.`);
    console.log(`--> URL exata: ${req.originalUrl}`);
    console.log("-----------------------------------------------------");
    // --- Fim do "espião" ---

    next(); // ESSA LINHA É MUITO IMPORTANTE: ela envia a requisição para o destino correto (prioridadesRoutes)
}, prioridadesRoutes);
app.use('/api/regulador', reguladorRoutes);     
app.use('/api/escalas', escalasRoutes);

// as rotas de arquivos estáticos.
app.use('/regulacao', express.static(path.join(__dirname, 'public/regulacao')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    
    // Iniciar atualização de status
    try {
        console.log('⏰ Iniciando atualização automática de status...');
        
        // Executar imediatamente ao iniciar
        await atualizarStatusGuias();
        
        // Agendar para executar a cada 10 minutos
        setInterval(atualizarStatusGuias, 10 * 60 * 1000);
        
        console.log('✅ Atualização automática agendada (a cada 10 minutos)');
    } catch (err) {
        console.error('❌ Erro ao iniciar atualização:', err);
    }
});