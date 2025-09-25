// routes/eco.routes.js
import express from 'express';
import fetch from 'node-fetch';
import { obterNovoTokenECO } from '../services/authService.js';

const router = express.Router();

// Variável para armazenar o token atual (em memória)
let ecoToken = process.env.ECO_TOKEN || '';

// Função para fazer requisição com token renovável
async function fetchComTokenRenovavel(url, options = {}) {
    try {
        // Se não temos token, obtém um novo
        if (!ecoToken) {
            console.log('🔄 Obtendo token ECO inicial...');
            ecoToken = await obterNovoTokenECO();
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ecoToken}`
            }
        });

        // Se der 403/401, tenta renovar o token e repete a requisição
        if (response.status === 403 || response.status === 401) {
            console.log('🔁 Token expirado, renovando...');
            ecoToken = await obterNovoTokenECO();
            
            // Tenta novamente com o novo token
            const newResponse = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ecoToken}`
                }
            });
            
            return newResponse;
        }

        return response;

    } catch (err) {
        console.error('❌ Erro na requisição com token renovável:', err.message);
        throw err;
    }
}

// Endpoint para buscar guia ECO
router.get('/:numero', async (req, res) => {
    const numero = req.params.numero;

    console.log(`🔍 Buscando guia ECO: ${numero}`);

    try {
        const url = `https://regulacao-api.issec.maida.health/v3/historico-cliente?ordenarPor=DATA_SOLICITACAO&autorizacao=${numero}&page=0`;
        
        const response = await fetchComTokenRenovavel(url);

        if (!response.ok) {
            console.error(`❌ Erro API ECO: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({
                message: 'Erro na API ECO',
                statusText: response.statusText,
                status: response.status
            });
        }

        const data = await response.json();
        console.log(`✅ Guia ${numero} consultada com sucesso`);
        res.json(data);

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
    try {
        if (!ecoToken) {
            ecoToken = await obterNovoTokenECO();
        }
        
        res.json({
            tokenPresente: !!ecoToken,
            token: ecoToken ? `${ecoToken.substring(0, 20)}...` : 'N/A',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;