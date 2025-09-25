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
import usuariosRoutes from './routes/users.routes.js';

import { atualizarStatusGuias } from './services/atualizadorStatus.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

//  Configuração dinâmica do CORS
const allowedOrigins = [
    'http://localhost:3000' // Para desenvolvimento local
];
if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Permite requisições sem 'origin' (como apps mobile ou Postman) ou se a origem estiver na lista
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Em produção (Render), o cookie deve ser seguro
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        maxAge: 24*60*60*1000 
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

// Rota principal e fallback para o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    
    try {
        console.log('⏰ Iniciando atualização automática de status...');
        await atualizarStatusGuias();
        setInterval(atualizadorStatusGuias, 10 * 60 * 1000);
        console.log('✅ Atualização automática agendada (a cada 10 minutos)');
    } catch (err) {
        console.error('❌ Erro ao iniciar atualização:', err);
    }
});