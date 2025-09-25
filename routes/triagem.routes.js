import express from 'express';
import prisma from '../db/prisma.js'; // <-- ADICIONADO
import { isAuthenticated, hasPermission } from '../middleware/auth.middleware.js';

const router = express.Router();

// Rota para buscar protocolos pendentes de triagem
router.get('/', isAuthenticated, hasPermission(['triage_protocol']), async (req, res) => {
    try {
        const protocolos = await prisma.protocolo.findMany({
            where: {
                status: 'pendente_triagem'
            },
            orderBy: { data_criacao: 'asc' },
            include: { solicitante: { select: { nome: true } } }
        });
        res.status(200).json(protocolos);
    } catch (error) {
        console.error("Erro ao buscar protocolos pendentes:", error);
        res.status(500).json({ message: "Erro interno ao buscar protocolos." });
    }
});

// NOVO: Rota para fazer a triagem do protocolo
router.put('/:id/triage', isAuthenticated, hasPermission(['triage_protocol']), async (req, res) => {
    const protocoloId = parseInt(req.params.id, 10);
    const { nivel_dificuldade, ferramentas_indicadas } = req.body;

    if (isNaN(protocoloId)) return res.status(400).json({ message: "ID inválido." });

    try {
        const triagedProtocolo = await prisma.protocolo.update({
            where: { id: protocoloId },
            data: {
                nivel_dificuldade: parseInt(nivel_dificuldade, 10),
                ferramentas_indicadas,
                status: 'aberto'
            }
        });
        res.status(200).json({ message: "Triagem do protocolo realizada com sucesso!", protocolo: triagedProtocolo });

    } catch (error) {
        console.error("Erro na triagem do protocolo:", error);
        res.status(500).json({ message: "Erro interno na triagem do protocolo." });
    }
});

export default router;