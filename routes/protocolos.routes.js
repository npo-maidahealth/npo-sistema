import express from 'express';
import prisma from '../db/prisma.js';
import { isAuthenticated, hasPermission } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, async (req, res) => {
    const { tipo_automacao, descricao, regional } = req.body;
    const id_solicitante = req.session.user.id;
    if (!tipo_automacao || !descricao) {
        return res.status(400).json({ message: "Tipo de automação e descrição são obrigatórios." });
    }
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;
        const countToday = await prisma.protocolo.count({
            where: { protocolo_uid: { startsWith: datePrefix } }
        });
        const protocolo_uid = `${datePrefix}-${countToday + 1}`;
        const novoProtocolo = await prisma.protocolo.create({
            data: {
                protocolo_uid,
                descricao,
                tipo_automacao,
                status: 'pendente_triagem',
                id_solicitante,
            }
        });
        res.status(201).json({ message: "Protocolo criado com sucesso!", protocolo: novoProtocolo });
    } catch (error) {
        console.error("Erro ao criar protocolo:", error);
        res.status(500).json({ message: "Erro interno ao criar protocolo." });
    }
});

router.get('/meus-protocolos', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const protocolos = await prisma.protocolo.findMany({
            where: { id_solicitante: userId },
            orderBy: { data_criacao: 'desc' },
            include: { solicitante: { select: { nome: true, email: true } } }
        });
        res.json(protocolos);
    } catch (error) {
        console.error('Erro ao buscar meus protocolos:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

router.get('/analistas/disponiveis', isAuthenticated, hasPermission(['administrador', 'gestor_ti']), async (req, res) => {
    try {
        const analistas = await prisma.usuario.findMany({
            where: { cargos: { some: { cargo: { nome: 'analista' } } } },
            select: { id: true, nome: true, email: true }
        });
        res.json(analistas);
    } catch (error) {
        console.error('Erro ao buscar analistas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

router.put('/:id/assumir', isAuthenticated, hasPermission(['analista', 'gestor_ti', 'administrador']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });
    try {
        const protocolo = await prisma.protocolo.findUnique({ where: { id: protocoloId } });
        if (!protocolo) return res.status(404).json({ message: "Protocolo não encontrado." });
        if (protocolo.id_responsavel && protocolo.id_responsavel !== userId) {
            return res.status(400).json({ message: "Este protocolo já está atribuído a outro analista." });
        }
        const protocoloAtualizado = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: { id_responsavel: userId, status: 'em_andamento' },
            include: { responsavel: { select: { nome: true } } }
        });
        res.status(200).json({ message: "Protocolo assumido com sucesso!", protocolo: protocoloAtualizado });
    } catch (error) {
        console.error("Erro ao assumir protocolo:", error);
        res.status(500).json({ message: "Erro interno ao assumir protocolo." });
    }
});

router.put('/:id/encaminhar-resolucao', isAuthenticated, hasPermission(['analista', 'gestor_ti', 'administrador']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const { descricao_resolucao } = req.body;
    const userId = req.session.user.id;
    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });
    if (!descricao_resolucao) return res.status(400).json({ message: "A descrição da resolução é obrigatória." });
    try {
        const protocolo = await prisma.protocolo.findUnique({ where: { id: protocoloId } });
        if (!protocolo) return res.status(404).json({ message: "Protocolo não encontrado." });
        if (protocolo.id_responsavel !== userId) return res.status(403).json({ message: "Você não é o responsável por este protocolo." });
        const protocoloAtualizado = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: { status: 'pendente' }
        });
        await prisma.tratativa.create({
            data: {
                id_protocolo: protocoloId,
                id_usuario: userId,
                descricao: descricao_resolucao,
                tipo_mensagem: 'resolucao_analista'
            }
        });
        res.status(200).json({ message: "Resolução encaminhada para análise!", protocolo: protocoloAtualizado });
    } catch (error) {
        console.error("Erro ao encaminhar resolução:", error);
        res.status(500).json({ message: "Erro interno ao encaminhar resolução." });
    }
});

router.put('/:id/analisar', isAuthenticated, hasPermission(['gestor_ti', 'administrador']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const { acao, motivo_melhoria } = req.body;
    const userId = req.session.user.id;
    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });
    if (!['aprovar', 'ponto_melhoria'].includes(acao)) return res.status(400).json({ message: "Ação inválida." });
    if (acao === 'ponto_melhoria' && !motivo_melhoria) return res.status(400).json({ message: "O motivo do ponto de melhoria é obrigatório." });
    try {
        const mensagemTratativa = acao === 'aprovar' ? 'Resolução aprovada.' : motivo_melhoria;
        const protocoloAtualizado = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: { status: 'em_andamento' }
        });
        await prisma.tratativa.create({
            data: {
                id_protocolo: protocoloId,
                id_usuario: userId,
                descricao: mensagemTratativa,
                tipo_mensagem: acao === 'aprovar' ? 'aprovacao' : 'ponto_melhoria'
            }
        });
        res.status(200).json({
            message: acao === 'aprovar' ? "Resolução aprovada com sucesso!" : "Ponto de melhoria registrado!",
            protocolo: protocoloAtualizado
        });
    } catch (error) {
        console.error("Erro ao analisar resolução:", error);
        res.status(500).json({ message: "Erro interno ao analisar resolução." });
    }
});

router.put('/:id/encerrar', isAuthenticated, hasPermission(['analista', 'gestor_ti', 'administrador']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const { descricao_final } = req.body;
    const userId = req.session.user.id;
    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });
    if (!descricao_final) return res.status(400).json({ message: "A descrição final é obrigatória." });
    try {
        const aprovacao = await prisma.tratativa.findFirst({
            where: { id_protocolo: protocoloId, tipo_mensagem: 'aprovacao' }
        });
        if (!aprovacao) return res.status(400).json({ message: "Este protocolo ainda não foi aprovado para encerramento." });
        const protocoloAtualizado = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: {
                status: 'fechado',
                data_fechamento: new Date(),
                descricao_resolucao: descricao_final
            }
        });
        await prisma.tratativa.create({
            data: { id_protocolo: protocoloId, id_usuario: userId, descricao: descricao_final, tipo_mensagem: 'encerramento' }
        });
        res.status(200).json({ message: "Protocolo encerrado com sucesso!", protocolo: protocoloAtualizado });
    } catch (error) {
        console.error("Erro ao encerrar protocolo:", error);
        res.status(500).json({ message: "Erro interno ao encerrar protocolo." });
    }
});

router.get('/', isAuthenticated, async (req, res) => {
    const user = req.session.user;
    try {
        const temPermissaoadministrador = user.cargos.some(c => ['analista', 'gestor', 'administrador', 'gestor_ti'].includes(c));
        const includeRelations = { solicitante: { select: { nome: true } }, responsavel: { select: { nome: true } }, tratativas: { include: { usuario: { select: { nome: true } } } } };
        const protocolos = temPermissaoadministrador
            ? await prisma.protocolo.findMany({ orderBy: { data_criacao: 'desc' }, include: includeRelations })
            : await prisma.protocolo.findMany({ where: { id_solicitante: user.id }, orderBy: { data_criacao: 'desc' }, include: includeRelations });
        res.status(200).json(protocolos);
    } catch (error) {
        console.error("Erro ao buscar protocolos:", error);
        res.status(500).json({ message: "Erro interno ao buscar protocolos." });
    }
});

router.put('/:id/triage', isAuthenticated, hasPermission(['administrador']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const { nivel_dificuldade, ferramentas_indicadas } = req.body;
    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });
    try {
        const triagedProtocolo = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: { nivel_dificuldade: parseInt(nivel_dificuldade, 10), ferramentas_indicadas, status: 'aberto' }
        });
        res.status(200).json({ message: "Triagem do protocolo realizada com sucesso!", protocolo: triagedProtocolo });
    } catch (error) {
        console.error("Erro na triagem do protocolo:", error);
        res.status(500).json({ message: "Erro interno na triagem do protocolo." });
    }
});

router.put('/:id/assign', isAuthenticated, hasPermission(['administrador', 'gestor_ti']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const { analistaId } = req.body;
    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });
    if (!analistaId) return res.status(400).json({ message: "É necessário selecionar um analista." });
    try {
        const assignedProtocolo = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: { id_responsavel: parseInt(analistaId, 10), status: 'em_andamento' }
        });
        res.status(200).json({ message: "Protocolo atribuído com sucesso!", protocolo: assignedProtocolo });
    } catch (error) {
        console.error("Erro ao atribuir protocolo:", error);
        res.status(500).json({ message: "Erro interno ao atribuir protocolo." });
    }
});

// ROTA CORRIGIDA PARA A PÁGINA DE DETALHES
router.get('/:id', isAuthenticated, async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    if (!req.params.id || isNaN(protocoloId)) {
        return res.status(400).json({ message: 'ID do protocolo inválido ou não informado' });
    }
    try {
        const protocolo = await prisma.protocolo.findUnique({
            where: { id: protocoloId },
            include: {
                solicitante: { select: { nome: true } },
                responsavel: { select: { nome: true } },
                tratativas: { 
                    orderBy: { data_criacao: 'asc' },
                    include: {
                        usuario: { 
                            select: { 
                                id: true, 
                                nome: true, 
                                cargos: { 
                                    include: { 
                                        cargo: true 
                                    } 
                                } 
                            } 
                        } 
                    } 
                }
            }
        });
        if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado' });
        res.status(200).json(protocolo);
    } catch (error) {
        console.error('Erro ao buscar protocolo:', error);
        res.status(500).json({ message: 'Erro interno ao buscar protocolo.' });
    }
});

export default router;