// services/ecoService.js
import fetch from 'node-fetch';
import { obterNovoTokenECO } from './authService.js'; 

let ecoToken = process.env.ECO_TOKEN || '';

// Função auxiliar para requisição com token renovável 
export async function fetchComTokenRenovavel(url, options = {}, maxRetries = 2) { // Adicionado maxRetries
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (!ecoToken) {
                console.log(`🔄 Tentativa ${attempt}: Obtendo token ECO...`);
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

            // Lógica de renovação de token (se falhar, tenta novamente no próximo loop)
            if (response.status === 403 || response.status === 401) {
                console.log(`🔁 Tentativa ${attempt}: Token expirado ou inválido, renovando para próxima tentativa...`);
                ecoToken = await obterNovoTokenECO(); // Renovação do token
                lastError = new Error(`Token renovado após falha ${response.status} na tentativa ${attempt}.`);
                continue; // Pula para a próxima iteração (tentativa)
            }
            
            // Se a resposta for OK (2xx), retorna imediatamente
            if (response.ok) {
                return response;
            }

            // Tratamento de erros de API (como 500, 400, etc.)
            let errorText = await response.text();
            lastError = new Error(`Erro API ECO (${response.status}) na tentativa ${attempt}: ${errorText.substring(0, 150)}`);
            console.log(`⚠️ Aviso: ${lastError.message}`);
            
            // Se esta for a última tentativa, não continua
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            // Adiciona um pequeno delay antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 500)); 

        } catch (err) {
            lastError = err;
            console.error(`❌ Erro de rede/fetch na tentativa ${attempt}:`, err.message);
            
            // Se esta for a última tentativa, lança o erro
            if (attempt === maxRetries) {
                throw lastError;
            }
             // Adiciona um pequeno delay antes da próxima tentativa
             await new Promise(resolve => setTimeout(resolve, 500)); 
        }
    }
    
    // Deve ser inalcançável se o throw acima funcionar, mas é um fallback de segurança
    if (lastError) {
        throw lastError;
    }
}


/**
 * Busca os detalhes da guia principal e seus itens na API ECO.
 * (Resto da função fetchGuiaDetalhes inalterado, pois usa fetchComTokenRenovavel)
 */
export async function fetchGuiaDetalhes(numero) {
    // ... (Código inalterado)
    console.log(`🔍 Buscando guia ECO: ${numero}`);
    const API_BASE_URL = 'https://regulacao-api.issec.maida.health/v3/historico-cliente';
    
    // Correção: Defina urlGuia aqui (estava faltando na sua versão)
    const urlGuia = `${API_BASE_URL}?ordenarPor=DATA_SOLICITACAO&autorizacao=${numero}&page=0`;
        
    let responseGuia;
    try {
        // Esta chamada tentará 2x automaticamente!
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
    
    // Extraia guiaPrincipal aqui (estava faltando na sua versão, causando erro em idGuiaInterno)
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
    const idGuiaInterno = guiaPrincipal.idGuia || guiaPrincipal.id || guiaPrincipal.idSolicitacao;  
    console.log(`🔍 ID Interno da Guia para itens: ${idGuiaInterno}`);
    if (idGuiaInterno) {
        const urlItens = `https://regulacao-api.issec.maida.health/v3/guia/${idGuiaInterno}/itens`;
        
        try {
            const responseItens = await fetchComTokenRenovavel(urlItens); 
            
            if (responseItens.ok) {
                const dataItens = await responseItens.json();
                guiaPrincipal.itensSolicitados = dataItens.content || [];
            } else {
                // Trata 404 ou outros erros de forma não fatal
                console.warn(`⚠️ Aviso: Erro ao buscar itens (${responseItens.status}). O endpoint pode não existir para esta guia.`);
                guiaPrincipal.itensSolicitados = guiaPrincipal.itensGuia || [];
            }
            
        } catch (error) {
            // Captura o erro da dupla tentativa 
            console.warn(`⚠️ Aviso: Falha ao tentar buscar itens para ${idGuiaInterno}. Continuaremos sem itens.`);
            guiaPrincipal.itensSolicitados = guiaPrincipal.itensGuia || []; // Garante array vazio para evitar falha
        }
    }

    return guiaPrincipal;
}