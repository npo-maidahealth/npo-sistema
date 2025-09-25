import express from 'express';
import bcrypt from 'bcryptjs';
import { body, param, validationResult } from 'express-validator';
import prisma from '../db/prisma.js';
import { isAuthenticated, hasPermission } from '../middleware/auth.middleware.js';

const router = express.Router();

// Permissões necessárias para acessar estas rotas
const requiredPermissions = ['admin', 'gestor_ti', 'coordenador'];

// Middleware de validação para a rota de atualização de usuário
const validateUserUpdate = [
    param('id').isInt().withMessage('O ID do usuário deve ser um número inteiro.'),
    body('nome').trim().notEmpty().withMessage('O nome é obrigatório.'),
    body('email').isEmail().withMessage('O e-mail fornecido é inválido.').normalizeEmail(),
    body('whatsapp').optional({ checkFalsy: true }).trim().isLength({ min: 10 }).withMessage('O WhatsApp deve ter no mínimo 10 dígitos.'),
    body('regional').optional({ checkFalsy: true }).trim(),
    body('status').isIn(['ATIVO', 'INATIVO', 'PENDENTE']).withMessage('O status fornecido é inválido.'),
    body('cargosIds').isArray({ min: 1 }).withMessage('É necessário fornecer ao menos um cargo.'),
    body('cargosIds.*').isInt().withMessage('Todos os IDs de cargo devem ser números inteiros.')
];


/**
 * ROTA 1: GET /api/usuarios
 * Lista todos os usuários para a página de gerenciamento.
 * Segurança: Requer autenticação e permissão específica. Não retorna senhas.
 */
router.get('/', isAuthenticated, hasPermission(requiredPermissions), async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                cargos: { include: { cargo: true } }
            }
        });

        // Remove o hash da senha de cada usuário antes de enviar a resposta
        const usuariosSeguros = usuarios.map(user => {
            const { senha_hash, ...userSemSenha } = user;
            return userSemSenha;
        });

        res.status(200).json(usuariosSeguros);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
    }
});


/**
 * ROTA 2: GET /api/usuarios/cargos
 * Lista todos os cargos disponíveis no sistema.
 * Segurança: Requer autenticação e permissão, pois revela a estrutura de cargos.
 */
router.get('/cargos', isAuthenticated, hasPermission(requiredPermissions), async (req, res) => {
    try {
        const cargos = await prisma.cargo.findMany({ orderBy: { nome: 'asc' }});
        res.status(200).json(cargos);
    } catch (error) {
        console.error("Erro ao buscar cargos:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar cargos.' });
    }
});


/**
 * ROTA 3: PUT /api/usuarios/:id
 * Atualiza um usuário (aprova, edita cargos, status, etc.).
 * Segurança: Validação de entrada, permissões, impede auto-modificação, gerenciamento de senha.
 */
router.put('/:id', isAuthenticated, hasPermission(requiredPermissions), validateUserUpdate, async (req, res) => {
    // 1. Verifica se houve erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.id, 10);
    const { nome, email, whatsapp, regional, status, cargosIds } = req.body;

    // 2. Medida de segurança: Impede que um administrador edite a si mesmo por esta rota
    // Isso evita que ele remova o próprio cargo de admin acidentalmente e perca o acesso.
    if (req.session.user.id === userId) {
        return res.status(403).json({ message: 'Você não pode editar seu próprio perfil por esta interface. Use a página "Meu Perfil".' });
    }

    try {
        const userAtual = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!userAtual) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        let novaSenhaHash = userAtual.senha_hash;
        
        // 3. Gerenciamento de Senha: Só cria uma nova senha se o usuário estiver sendo ativado
        if (userAtual.status === 'PENDENTE' && status === 'ATIVO') {
            const tempPassword = Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            novaSenhaHash = await bcrypt.hash(tempPassword, salt);
            
            // !! ALERTA DE SEGURANÇA PARA PRODUÇÃO !!
            // Em produção, NUNCA exiba a senha no console.
            // Esta linha deve ser substituída por um serviço de envio de e-mail seguro
            // que envie um link de "primeiro acesso" ou a senha temporária para o usuário.
            console.log(`=======================================================`);
            console.log(`  USUÁRIO ATIVADO: ${email}`);
            console.log(`  SENHA TEMPORÁRIA: ${tempPassword}`);
            console.log(`=======================================================`);
        }

        // 4. Transação no Banco de Dados: Atualiza o usuário e seus cargos de forma atômica
        await prisma.usuario.update({
            where: { id: userId },
            data: {
                nome,
                email,
                whatsapp,
                regional,
                status,
                senha_hash: novaSenhaHash,
                cargos: {
                    deleteMany: {}, // Limpa os cargos antigos
                    create: cargosIds.map(cargoId => ({ // Adiciona os novos cargos
                        cargoId: parseInt(cargoId, 10)
                    }))
                }
            }
        });

        res.status(200).json({ message: "Usuário atualizado com sucesso!" });

    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        // Verifica se o erro é por e-mail duplicado
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(409).json({ message: 'O e-mail informado já está em uso por outro usuário.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar usuário.' });
    }
});


export default router;