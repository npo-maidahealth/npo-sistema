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

router.get('/:numero', async (req, res) => {
    const numero = req.params.numero;

    console.log(`🔍 Buscando guia ECO: ${numero}`);

    try {
        const urlGuia = `https://regulacao-api.issec.maida.health/v3/historico-cliente?ordenarPor=DATA_SOLICITACAO&autorizacao=${numero}&page=0`;
        
        // 1. REQUISIÇÃO PRINCIPAL DA GUIA
        const responseGuia = await fetchComTokenRenovavel(urlGuia);

        if (!responseGuia.ok) {
            console.error(`❌ Erro API ECO (Guia): ${responseGuia.status} ${responseGuia.statusText}`);
            return res.status(responseGuia.status).json({
                message: 'Erro ao buscar a guia principal na API ECO',
                statusText: responseGuia.statusText,
                status: responseGuia.status
            });
        }
        
        const dataGuia = await responseGuia.json();
        const guiaPrincipal = dataGuia.content && dataGuia.content.length > 0 ? dataGuia.content[0] : null;

        if (!guiaPrincipal) {
            console.log(`❌ Guia ${numero} não encontrada no ECO.`);
            return res.status(404).json({ message: 'Guia não encontrada.' });
        }

        if (guiaPrincipal.dataVencimentoSla) {
            try {
                const slaOriginal = new Date(guiaPrincipal.dataVencimentoSla);
                const slaCorrigidoMs = slaOriginal.getTime() - (24 * 60 * 60 * 1000);
                const slaCorrigido = new Date(slaCorrigidoMs);

                guiaPrincipal.dataVencimentoSla = slaCorrigido.toISOString();
                
                console.log(`✅ SLA Corrigido: ${slaCorrigido.toISOString()}`);
            } catch (error) {
                console.error("❌ Erro ao subtrair 24h do SLA:", error.message);
            }
        }
        // 2. REQUISIÇÃO DOS ITENS, SE A GUIA FOI ENCONTRADA
        const idGuiaInterno = guiaPrincipal.id || guiaPrincipal.idGuia || guiaPrincipal.idSolicitacao; // Assume que o campo 'id' é o identificador interno
        
        console.log(`🔎 Buscando itens da guia interna ID: ${idGuiaInterno}`);
        
        if (!idGuiaInterno) {
            console.warn('⚠️ ID interno da guia ausente. Não é possível buscar os itens.');
            guiaPrincipal.itensSolicitados = guiaPrincipal.itensGuia || [];
            dataGuia.content = [guiaPrincipal]; 
            return res.json(dataGuia);
        }

        const urlItens = `https://regulacao-api.issec.maida.health/v3/guia/${idGuiaInterno}/itens`;
        const responseItens = await fetchComTokenRenovavel(urlItens);
        
        if (!responseItens.ok) {
            console.warn(`⚠️ Aviso: Erro ao buscar itens (${responseItens.status}). Retornando dados da guia sem itens.`);
            // Neste caso, decidimos seguir, mas com a lista de itens vazia.
            guiaPrincipal.itensSolicitados = guiaPrincipal.itensGuia || [];
            guiaPrincipal.idInterno = guiaPrincipal.id;
        } else {
            const dataItens = await responseItens.json();
            guiaPrincipal.itensSolicitados = dataItens.content || [];
            dataGuia.content = [guiaPrincipal]; 
            console.log(`✅ Guia ${numero} consultada e enriquecida com ${guiaPrincipal.itensSolicitados.length} item(s).`);
            res.json(dataGuia);

            if (guiaPrincipal.itensSolicitados.length > 0) {
                console.log('✅ Status dos primeiros 2 itens recebidos do ECO:');
                guiaPrincipal.itensSolicitados.slice(0, 2).forEach((item, index) => {
                    console.log(`  Item ${index + 1}: Código: ${item.codigo}, Status: ${item.status}`);
                });
            }
        }

        // 3. RETORNA O OBJETO COMPLETO
        dataGuia.content = [guiaPrincipal]; 
        console.log(`✅ Guia ${numero} consultada e enriquecida com ${guiaPrincipal.itensSolicitados.length} item(s).`);
        res.json(dataGuia);

    } catch (err) {
        console.error('❌ Erro ao consultar ECO:', err.message);
        res.status(500).json({ 
            message: 'Erro ao consultar ECO', 
            error: err.message 
        });
    }
})


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