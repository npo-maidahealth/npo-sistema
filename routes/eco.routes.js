// routes/eco.routes.js
import express from 'express';
import { fetchGuiaDetalhes } from '../services/ecoService.js'; 
import { obterNovoTokenECO } from '../services/authService.js';

const router = express.Router();

// Rota de busca de detalhes da guia.
router.get('/:numero', async (req, res) => {
    const numero = req.params.numero;

    try {
        // Chama a função que já resolve o token e a URL correta (Maida Health)
        const guiaPrincipal = await fetchGuiaDetalhes(numero); 

        if (!guiaPrincipal) {
            return res.status(404).json({ message: 'Guia não encontrada.' });
        }
        
        // Retorna o objeto no formato que o frontend espera (envelopado em content)
        res.json({ content: [guiaPrincipal] }); // Formato esperado pelo frontend

    } catch (err) {
        console.error('❌ Erro ao consultar ECO:', err.message);
        res.status(500).json({ 
            message: 'Erro ao consultar ECO', 
            error: err.message 
        });
    }
});

// Endpoint para verificar status do token
router.get('/debug/token', async (req, res) => {
    let ecoToken = '';
    try {
        ecoToken = await obterNovoTokenECO();
        
        res.json({
            tokenPresente: !!ecoToken,
            token: ecoToken ? `${ecoToken.substring(0, 10)}...${ecoToken.slice(-10)}` : 'N/A'
        });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao obter token de debug.', error: err.message });
    }
});

export default router;