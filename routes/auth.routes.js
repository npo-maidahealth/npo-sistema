// API endpoints para autenticação: registro, login, logout e verificação de sessão.

import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import permissions from '../middleware/permissions.js';
import prisma from '../db/prisma.js';
const router = express.Router();

// -------------------- CADASTRO -> POST /api/auth/register --------------------
router.post('/pre-cadastro', async (req, res) => {
    // No pré-cadastro, pegamos apenas os dados essenciais
    const { nome, email, whatsapp } = req.body;

    // Validações básicas
    if (!nome || !email || !whatsapp) {
        return res.status(400).json({ message: "Nome, e-mail e WhatsApp são obrigatórios." });
    }
    if (!email.endsWith('@maida.health')) {
        return res.status(400).json({ message: "Cadastro permitido apenas com email corporativo (@maida.health)." });
    }

    try {
        const userExists = await prisma.usuario.findUnique({ where: { email } });
        if (userExists) {
            return res.status(409).json({ message: "Este e-mail já está em uso ou aguardando aprovação." });
        }

        // Cria o usuário com status PENDENTE e sem senha, cargo ou produto.
        // O schema.prisma já define o status padrão como PENDENTE.
        await prisma.usuario.create({
            data: { nome, email, whatsapp }
        });

        res.status(201).json({
            message: "Pré-cadastro realizado com sucesso! Aguarde a aprovação de um gestor para acessar o sistema."
        });

    } catch (error) {
        console.error("Erro no pré-cadastro:", error);
        res.status(500).json({ message: "Erro interno ao criar usuário." });
    }
});


// -------------------- LOGIN -> POST /api/auth/login --------------------
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ message: "Email e senha são obrigatórios." });

    try {
        const user = await prisma.usuario.findUnique({
            where: { email },
            include: {
                cargos: { include: { cargo: true } },
                produtos: { include: { produto: true } }
            }
        });

        if (!user) return res.status(401).json({ message: "Credenciais inválidas." });

        // -------------------- <<< ALTERAÇÃO 2: Bloquear usuários pendentes >>> --------------------
        if (user.status !== 'ATIVO') {
            return res.status(403).json({ message: "Sua conta está pendente de aprovação ou inativa. Fale com um gestor." });
        }
        // -----------------------------------------------------------------------------------------

        // O schema define senha_hash, então vamos usar esse nome de campo
        const isMatch = await bcrypt.compare(senha, user.senha_hash);
        if (!isMatch) return res.status(401).json({ message: "Credenciais inválidas." });

        const userRoles = user.cargos.map(uc => uc.cargo.nome);
        const userProducts = user.produtos.map(up => up.produto.nome);
        
        // O objeto de permissões não foi fornecido, então esta parte pode precisar de ajuste
        // Se `permissions` for o mesmo que `PERMISSIONS` de `constants.js`, está ok.
        let userPermissions = [];
        // ... (sua lógica de permissões)

        req.session.user = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            cargos: userRoles,
            produtos: userProducts
        };
        
        res.status(200).json({ message: "Login realizado com sucesso!", user: req.session.user });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro interno ao realizar login." });
    }
});


// -------------------- LOGOUT e SESSÃO (permanecem iguais) --------------------
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: "Não foi possível fazer logout." });
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logout realizado com sucesso." });
    });
});

router.get('/session', async (req, res) => {
    try {
        if (req.session.user) {
            res.status(200).json({ user: req.session.user });
        } else {
            res.status(401).json({ message: "Não autenticado." });
        }
    } catch (error) {
        console.error("Erro na rota de sessão:", error);
        res.status(500).json({ message: "Erro interno ao buscar sessão." });
    }
});

export default router;