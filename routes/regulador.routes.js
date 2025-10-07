// routes/regulador.routes.js
import express from 'express';
import prisma from '../db/prisma.js'; 
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { atualizarStatusGuias } from '../services/atualizadorStatus.js';
import removeAccents from 'remove-accents'; 


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

        console.log('Buscando prioridades pendentes...');
    
        const prioridades = await prisma.prioridade.findMany({
            where: { 
                regulada: false,  
                capturada: false,
                NOT: {
                    status: {
                        in: [
                            'AUTORIZADA', 'APROVADA', 'NEGADA', 'CANCELADA', 
                            'EXECUTADA', 'CONCLUIDA', 'SEM RESTRIÇÃO', 
                            'PARCIALMENTE AUTORIZADA', 'AGUARDANDO AUTENTICAÇÃO'
                        ],
                        mode: 'insensitive'
                    }
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
                dataCriacao: true,
                capturada: true,
                regulada: true,
                regulador: { 
                    select: { nome: true }
                },
                _count: {
                    select: {
                        solicitacoes: true
                    }
                }
            },
            orderBy: [{ dataSolicitacao: 'asc' }]
        });

        console.log(`Encontradas ${prioridades.length} prioridades pendentes`);
        
        console.log('📊 DEBUG - Distribuição das prioridades encontradas:');
        prioridades.forEach(p => {
            console.log(`- Guia ${p.numeroGuia}: status="${p.status}", regulada=${p.regulada}, capturada=${p.capturada}, solicitações=${p._count.solicitacoes}`);
        });

        const ordemCarater = {
            "URGENCIA E EMERGENCIA": 1, "PRORROGACAO": 2, "SP": 3, "SADT": 3,
            "INTERNACAO_ELETIVA": 4, "ELETIVA": 4
        };

        const prioridadesOrdenadas = prioridades.sort((a, b) => {
            function normaliza(str) {
                return removeAccents(str || '').toUpperCase().replace(/[\s_]+/g, ' ').trim();
            }
            const caraterA = normaliza(a.caracterAtendimento);
            const caraterB = normaliza(b.caracterAtendimento);

            const valorA = ordemCarater[caraterA] || 5;
            const valorB = ordemCarater[caraterB] || 5;

            if (valorA !== valorB) return valorA - valorB;
            return new Date(a.dataSolicitacao) - new Date(b.dataSolicitacao);
        });

        const prioridadesComContador = prioridadesOrdenadas.map(p => ({
            ...p,
            vezesSolicitado: p._count.solicitacoes
        }));

        res.json(prioridadesComContador);
        
    } catch (err) {
        console.error('Erro ao buscar prioridades pendentes:', err);
        res.status(500).json({ 
            message: 'Erro interno ao buscar prioridades pendentes', 
            error: err.message 
        });
    }
});

router.get('/reguladas', isAuthenticated, async (req, res) => {
    try {
        console.log('=== ACESSANDO /api/regulador/reguladas ===');
        
        const usuarioId = req.session.user?.id;
        if (!usuarioId) {
            console.log('Usuário não autenticado');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        console.log('Buscando prioridades reguladas...');
        
        const prioridades = await prisma.prioridade.findMany({
            where: { 
                capturada:false,
                NOT: { 
                    status: {contains: 'CANCELAD', mode: 'insensitive' }
                },
                OR: [
                    { regulada: true },
                    { 
                        OR: [
                            { status: { contains: 'AUTORIZAD', mode: 'insensitive' } },
                            { status: { contains: 'APROVAD', mode: 'insensitive' } },
                            { status: { contains: 'NEGAD', mode: 'insensitive' } },
                            { status: { contains: 'CANCELAD', mode: 'insensitive' } },
                            { status: { contains: 'EXECUTAD', mode: 'insensitive' } },
                            { status: { contains: 'EXECUTADA', mode: 'insensitive' } },
                            { status: { contains: 'CONCLUID', mode: 'insensitive' } }
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
                dataSolicitacao: true,
                dataVencimentoSla: true,
                dataRegulacao: true,
                fila: true,
                atrasada: true,
                atrasoRegulacao: true,
                area: true,
                fonte: true,
                dataCriacao: true,
                capturada: true,
                regulada: true,
                regulador: { 
                    select: { nome: true }
                },
                _count: {
                    select: {
                        solicitacoes: true
                    }
                }
            },
            orderBy: [{ dataRegulacao: 'desc' }, { dataSolicitacao: 'desc' }]
        });

        console.log(`Encontradas ${prioridades.length} prioridades reguladas`);
        
        const prioridadesComContador = prioridades.map(p => ({
            ...p,
            vezesSolicitado: p._count.solicitacoes
        }));

        res.json(prioridadesComContador);
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
            data: { statusRegulacao: status }
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

        const solicitacoes = await prisma.solicitacaoPrioridade.findMany({
            where: { prioridadeId: id },
            select: {
                id: true,
                dataHoraSolicitacao: true,
                observacaoSolicitacao: true,
                protocoloSPG: true,
                reguladorPlantao: {
                    select: { 
                        nome: true 
                    }
                },
                prioridade: {
                    select: {
                        usuario: {
                            select: {
                                nome: true
                            }
                        }
                    }
                }
            },
            orderBy: [{ dataHoraSolicitacao: 'desc' }] 
        });

        console.log('=== DEBUG HISTÓRICO ===');
        console.log(`Prioridade ID: ${id}`);
        console.log(`Total de solicitações encontradas: ${solicitacoes.length}`);
        console.log('Protocolos encontrados:', solicitacoes.map(s => s.protocoloSPG));
        console.log('=======================');
        console.log(`Encontradas ${solicitacoes.length} solicitações para prioridade ${prioridadeId}`);

        const historicoFormatado = solicitacoes.map(item => ({
            id: item.id,
            dataHora: item.dataHoraSolicitacao,
            nomeSolicitante: item.prioridade.usuario.nome, 
            protocolo: item.protocoloSPG,
            observacao: item.observacaoSolicitacao,
            reguladorPlantao: item.reguladorPlantao?.nome || 'Não atribuído' 
        }));

        res.json(historicoFormatado);
        
    } catch (err) {
        console.error(`Erro ao buscar histórico para prioridade ${prioridadeId}:`, err);
        res.status(500).json({ 
            message: 'Erro interno ao buscar histórico.', 
            error: err.message 
        });
    }
});
router.get('/debug/status', isAuthenticated, async (req, res) => {
    try {
        const stats = await prisma.prioridade.groupBy({
            by: ['status', 'regulada', 'capturada'],
            _count: {
                id: true
            }
        });

        const total = await prisma.prioridade.count();
        
        res.json({
            totalGuias: total,
            distribuicaoStatus: stats,
            message: 'Estatísticas das guias no sistema'
        });
    } catch (err) {
        console.error('Erro no debug:', err);
        res.status(500).json({ error: err.message });
    }
});
export default router;