// routes/auth.routes.js

import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma.js';

const router = express.Router();

// -------------------- Rota de PRÉ-CADASTRO --------------------
router.post('/pre-cadastro', async (req, res) => {
    const { nome, email, whatsapp } = req.body;

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

        await prisma.usuario.create({
            data: { nome, email, whatsapp, status: 'PENDENTE' }
        });

        res.status(201).json({
            message: "Pré-cadastro realizado com sucesso! Aguarde a aprovação de um gestor."
        });
    } catch (error) {
        console.error("Erro no pré-cadastro:", error);
        res.status(500).json({ message: "Erro interno ao criar usuário." });
    }
});

// -------------------- Rota de LOGIN  --------------------
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    // --- Início dos Espiões ---
    console.log("===================================");
    console.log("Tentativa de login recebida no servidor");
    console.log("Email recebido:", email);
    // --- Fim dos Espiões ---

    if (!email || !senha) return res.status(400).json({ message: "Email e senha são obrigatórios." });

    try {
        const user = await prisma.usuario.findUnique({
            where: { email },
            include: {
                cargos: { include: { cargo: true } },
                produtos: { include: { produto: true } }
            }
        });
        console.log("DADOS COMPLETOS DO USUÁRIO VINDOS DO BANCO:", JSON.stringify(user, null, 2));
        // 1. Primeira verificação: O usuário existe?
        if (!user) {
            console.log("--> Usuário NÃO encontrado no DB.");
            return res.status(401).json({ message: "Credenciais inválidas." });
        }
        console.log("Usuário encontrado no DB:", user.email);

        // 2. Segunda verificação: O status do usuário é ATIVO?
        if (user.status !== 'ATIVO') {
            console.log("--> Tentativa de login falhou: Status do usuário é", user.status);
            return res.status(403).json({ message: "Sua conta está pendente de aprovação ou inativa." });
        }

        // 3. Terceira verificação: A senha bate com o hash salvo?
        console.log("Hash salvo no DB:", user.senha_hash);
        const isMatch = await bcrypt.compare(senha, user.senha_hash);
        console.log("Resultado da comparação bcrypt:", isMatch);

        if (!isMatch) {
            console.log("--> Senhas NÃO batem.");
            return res.status(401).json({ message: "Credenciais inválidas." });
        }
        
        console.log("✅ Login bem-sucedido. Criando sessão...");

        const userRoles = user.cargos.map(uc => uc.cargo.nome);
        const userProducts = user.produtos.map(up => up.produto.nome);

        req.session.user = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            cargos: userRoles,
            produtos: userProducts
        };
        
        req.session.save((err) => {
        if (err) {
            console.error("Erro ao salvar a sessão:", err);
            return res.status(500).json({ message: "Erro interno ao criar sessão." });
        }
        // A sessão foi salva com sucesso, agora podemos enviar a resposta.
        res.status(200).json({ message: "Login realizado com sucesso!", user: req.session.user });
    });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro interno ao realizar login." });
    }
});

// -------------------- LOGOUT e SESSÃO--------------------
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: "Não foi possível fazer logout." });
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logout realizado com sucesso." });
    });
});

router.get('/session', async (req, res) => {
    if (req.session.user) {
        res.status(200).json({ user: req.session.user });
    } else {
        res.status(401).json({ message: "Não autenticado." });
    }
});

export default router;