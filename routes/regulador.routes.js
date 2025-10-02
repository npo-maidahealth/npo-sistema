// routes/regulador.routes.js
import express from 'express';
import prisma from '../db/prisma.js'; 
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { atualizarStatusGuias } from '../services/atualizadorStatus.js';

const router = express.Router();

// ==========================
// Listar prioridades PENDENTES
// ==========================
router.get('/pendentes/sincronizar', isAuthenticated, async (req, res) => {
    try {
        console.log('=== ACESSANDO /api/regulador/pendentes ===');
        const usuarioId = req.session.user?.id;
        if (!usuarioId) {
            console.log('Usuário não autenticado');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        console.log('🔄 Iniciando sincronização manual de status...');
        
        const prioridades = await prisma.prioridade.findMany({
            where: { 
                capturada: false, 
                regulada: false,
                NOT: {
                    OR: [
                        { status: { contains: 'AUTORIZAD', mode: 'insensitive' } },
                        { status: { contains: 'APROVAD', mode: 'insensitive' } },
                        { status: { contains: 'NEGAD', mode: 'insensitive' } },
                        { status: { contains: 'CANCELAD', mode: 'insensitive' } },
                        { status: { contains: 'EXECUTAD', mode: 'insensitive' } }
                    ]
                }
            },
            select: {
                id: true,
                numeroGuia: true,
                idGuiaECO: true, 
                tipoGuia: true,
                status: true,
                caracterAtendimento: true,
                observacao: true,
                beneficiario: true,
                beneficiarioNomeSocial: true,
                cartaoBeneficiario: true,
                cpfBeneficiario: true,
                dataHoraSolicitacao: true,
                dataSolicitacao: true,
                dataVencimentoSla: true,
                fila: true,
                atrasada: true,
                atrasoRegulacao: true,
                area: true,
                fonte: true,
                vezesSolicitado: true, 
                dataCriacao: true, 
                regulador: { 
                    select: { nome: true }
                }
            },
            orderBy: [{ dataSolicitacao: 'asc' }]
        });

        console.log(`Encontradas ${prioridades.length} prioridades pendentes`);

        const ordemCarater = {
            "URGÊNCIA": 1, "EMERGÊNCIA": 1, "URGENCIA": 1, "EMERGENCIA": 1,
            "PRORROGAÇÃO": 2, "PRORROGACAO": 2, "SP": 3, "SADT": 3,
            "INTERNACAO_ELETIVA": 4, "ELETIVA": 4
        };

        const prioridadesOrdenadas = prioridades.sort((a, b) => {
            const caraterA = a.caracterAtendimento?.toUpperCase() || '';
            const caraterB = b.caracterAtendimento?.toUpperCase() || '';

            const valorA = ordemCarater[caraterA] || 5;
            const valorB = ordemCarater[caraterB] || 5;

            if (valorA !== valorB) return valorA - valorB;
            return new Date(a.dataSolicitacao) - new Date(b.dataSolicitacao);
        });

        res.json(prioridadesOrdenadas);
        
    } catch (err) {
        console.error('Erro ao buscar prioridades pendentes:', err);
        res.status(500).json({ 
            message: 'Erro interno ao buscar prioridades pendentes', 
            error: err.message 
        });
    }
});

// ==========================
// Listar prioridades REGULADAS
// ==========================
router.get('/reguladas', isAuthenticated, async (req, res) => {
    try {
        console.log('=== ACESSANDO /api/regulador/reguladas ===');
        
        const usuarioId = req.session.user?.id;
        if (!usuarioId) {
            console.log('Usuário não autenticado');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        console.log('Buscando prioridades reguladas...');
        const prioridades = await prisma.prioridade.findMany({
            where: {
                OR: [
                    { regulada: true },
                    { 
                        // CORREÇÃO: Remover a restrição de dataRegulacao para status AUTORIZADA
                        AND: [
                            {
                                OR: [
                                    { status: { contains: 'AUTORIZAD', mode: 'insensitive' } },
                                    { status: { contains: 'APROVAD', mode: 'insensitive' } },
                                    { status: { contains: 'CONCLUID', mode: 'insensitive' } }
                                ]
                            },
                            {
                                // Para guias autorizadas, não exigir dataRegulacao
                                OR: [
                                    { dataRegulacao: { gte: trintaDiasAtras } },
                                    { dataRegulacao: null } // ← PERMITE dataRegulacao NULL
                                ]
                            }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                numeroGuia: true,
                idGuiaECO: true, 
                tipoGuia: true,
                status: true,
                caracterAtendimento: true,
                observacao: true,
                beneficiario: true,
                beneficiarioNomeSocial: true,
                cartaoBeneficiario: true,
                cpfBeneficiario: true,
                dataHoraSolicitacao: true,
                dataRegulacao: true,
                fila: true,
                fonte: true,
                vezesSolicitado: true,
                dataCriacao: true,
                regulador: { 
                    select: { nome: true }
                }
            },
            orderBy: [{ dataRegulacao: 'desc' }]
        });

        console.log(`Encontradas ${prioridades.length} prioridades reguladas`);
        res.json(prioridades);
    } catch (err) {
        console.error('Erro ao buscar guias reguladas:', err);
        res.status(500).json({ 
            message: 'Erro interno ao buscar guias reguladas', 
            error: err.message 
        });
    }
});

// ==========================
// Rota para marcar como regulada
// ==========================
router.patch('/:id/regulada', isAuthenticated, async (req, res) => {
    try {
        console.log('=== MARCANDO PRIORIDADE COMO REGULADA ===');
        
        const { id } = req.params;
        const usuarioId = req.session.user?.id;
        
        if (!usuarioId) {
            console.log('Usuário não autenticado');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        console.log(`Marcando prioridade ${id} como regulada pelo usuário ${usuarioId}`);
        
        const prioridadeAtualizada = await prisma.prioridade.update({
            where: { id: parseInt(id) },
            data: {
                regulada: true,
                autorizada: true,
                reguladorId: usuarioId,
                dataRegulacao: new Date()
            }
        });

        console.log('Prioridade marcada como regulada:', prioridadeAtualizada.id);
        res.json({ message: 'Prioridade marcada como regulada', prioridade: prioridadeAtualizada });

    } catch (err) {
        console.error('Erro ao marcar prioridade:', err);
        res.status(500).json({ 
            message: 'Erro interno ao marcar prioridade', 
            error: err.message 
        });
    }
});
// ==========================
// Rota para atualizar status
// ==========================
router.patch('/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const usuarioId = req.session.user?.id;
        
        if (!usuarioId) return res.status(401).json({ message: 'Usuário não autenticado' });

        const prioridadeAtualizada = await prisma.prioridade.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.json({ 
            message: 'Status atualizado com sucesso', 
            prioridade: prioridadeAtualizada 
        });

    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        res.status(500).json({ 
            message: 'Erro interno ao atualizar status', 
            error: err.message 
        });
    }
});
router.get('/historico/:prioridadeId', isAuthenticated, async (req, res) => {
    try {
        const { prioridadeId } = req.params;
        
        console.log(`=== ACESSANDO /api/regulador/historico/${prioridadeId} ===`);
        
        const id = parseInt(prioridadeId);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'ID da prioridade inválido.' });
        }
        const historico = await prisma.solicitacaoPrioridade.findMany({
            where: { prioridadeId: id },
            select: {
                dataHoraSolicitacao: true, 
                observacaoSolicitacao: true, 
                createdAt: true,

                reguladorPlantao: {
                    select: { nome: true }
                }
            },
            orderBy: [{ dataHoraSolicitacao: 'desc' }]
        });

        const historicoMapeado = historico.map(item => ({
            id: item.id,
            dataRegistro: item.dataHoraSolicitacao,
            nomeUsuario: item.reguladorPlantao?.nome || 'Sistema/ECO', 
            acao: 'CRIACAO', 
            observacao: item.observacaoSolicitacao,
        }));


        res.json(historicoMapeado);
        
    } catch (err) {
        console.error(`Erro ao buscar histórico para prioridade ${prioridadeId}:`, err);
        res.status(500).json({ 
            message: 'Erro interno ao buscar histórico.', 
            error: err.message 
        });
    }
});
export default router;