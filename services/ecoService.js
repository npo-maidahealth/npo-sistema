// services/ecoService.js
import fetch from 'node-fetch';
import { obterNovoTokenECO } from './authService.js'; 

let ecoToken = process.env.ECO_TOKEN || '';

// Função auxiliar para requisição com token renovável 
export async function fetchComTokenRenovavel(url, options = {}) {
    try {
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

        // Lógica de renovação de token
        if (response.status === 403 || response.status === 401) {
            console.log('🔁 Token expirado, renovando...');
            ecoToken = await obterNovoTokenECO();
            
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


/**
 * Busca os detalhes da guia principal e seus itens na API ECO.
 * Esta lógica foi movida do eco.routes.js.
 * @param {string} numero O número da guia a ser consultada.
 * @returns {Promise<Object | null>} Objeto de guia com detalhes, ou null se não encontrada.
 */
export async function fetchGuiaDetalhes(numero) {
    console.log(`🔍 Buscando guia ECO: ${numero}`);
    const API_BASE_URL = 'https://regulacao-api.issec.maida.health/v3/historico-cliente';
    
    // Correção: Defina urlGuia aqui (estava faltando na sua versão)
    const urlGuia = `${API_BASE_URL}?ordenarPor=DATA_SOLICITACAO&autorizacao=${numero}&page=0`;
        
    let responseGuia;
    try {
        responseGuia = await fetchComTokenRenovavel(urlGuia);
    } catch (err) {
        console.error(`❌ Erro ao chamar fetchComTokenRenovavel: ${err.message}`);
        throw err;
    }

    if (!responseGuia.ok) {
        if (responseGuia.status === 404) return null;
        
        let errorText;
        try {
            errorText = await responseGuia.text();
        } catch {
            errorText = 'Sem resposta de texto';
        }
        console.error(`❌ Erro API ECO (Guia): ${responseGuia.status} - ${errorText}`);
        throw new Error(`Erro ${responseGuia.status} ao buscar guia principal no ECO: ${errorText}`);
    }
    
    let dataGuia;
    try {
        dataGuia = await responseGuia.json();
    } catch (err) {
        console.error(`❌ Erro ao parsear JSON da guia: ${err.message}`);
        throw new Error('Resposta da API não é JSON válido.');
    }
    
    // Correção: Extraia guiaPrincipal aqui (estava faltando na sua versão, causando erro em idGuiaInterno)
    let guiaPrincipal = dataGuia.content && dataGuia.content.length > 0 ? dataGuia.content[0] : null;

    if (!guiaPrincipal) return null;

    // Lógica de correção de SLA (adicionada de volta, pois estava no original e pode ser necessária)
    if (guiaPrincipal.dataVencimentoSla) {
        try {
            const slaOriginal = new Date(guiaPrincipal.dataVencimentoSla);
            const slaCorrigidoMs = slaOriginal.getTime() - (24 * 60 * 60 * 1000);
            guiaPrincipal.dataVencimentoSla = new Date(slaCorrigidoMs).toISOString();
        } catch (error) {
            console.error("❌ Erro ao subtrair 24h do SLA:", error.message);
        }
    }
    
    // Lógica de busca dos ITENS 
    const idGuiaInterno = guiaPrincipal.idGuia || guiaPrincipal.id || guiaPrincipal.idSolicitacao;  // CORREÇÃO: Priorize idGuia do JSON exemplo (115415)
    console.log(`🔍 ID Interno da Guia para itens: ${idGuiaInterno}`);
    if (idGuiaInterno) {
        const urlItens = `https://regulacao-api.issec.maida.health/v3/guia/${idGuiaInterno}/itens`;
        const responseItens = await fetchComTokenRenovavel(urlItens);
        
        if (responseItens.ok) {
            const dataItens = await responseItens.json();
            guiaPrincipal.itensSolicitados = dataItens.content || [];
        } else {
            console.warn(`⚠️ Aviso: Erro ao buscar itens (${responseItens.status}). Usando fallback itensGuia.`);
            guiaPrincipal.itensSolicitados = guiaPrincipal.itensGuia || [];  // Fallback para o array já presente no JSON
        }

    }

    return guiaPrincipal;
}