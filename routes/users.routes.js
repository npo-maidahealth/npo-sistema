import express from 'express';
import prisma from '../db/prisma.js';
import { isAuthenticated, hasPermission } from '../middleware/auth.middleware.js';


const router = express.Router();

router.get('/analistas', isAuthenticated, hasPermission(['gestor_ti', 'admin']), async (req, res) => {
    try {
        const analistas = await prisma.usuario.findMany({
            where: {
                cargos: {
                    some: {
                        cargo: {
                            nome: {
                                in: ['analista', 'gestor', 'admin', 'gestor_ti']
                            }
                        }
                    }
                }
            },
            select: {
                id: true,
                nome: true,
            }
        });
        res.status(200).json(analistas);
    } catch (error) {
        console.error("Erro ao buscar analistas:", error);
        res.status(500).json({ message: "Erro interno ao buscar analistas." });
    }
});

export default router;