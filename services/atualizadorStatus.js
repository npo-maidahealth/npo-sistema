// services/atualizadorStatus.js
import prisma from '../db/prisma.js';
import { fetchGuiaDetalhes } from './ecoService.js';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

// Variáveis de Ambiente (Lidas do .env)
const ECO_AUTH_URL = process.env.ECO_AUTH_URL || 'https://auth.maida.health/oauth2/token';
const ECO_CLIENT_ID = process.env.ECO_CLIENT_ID;
const ECO_CLIENT_SECRET = process.env.ECO_CLIENT_SECRET;
const ECO_BASE_URL = 'https://regulacao-api.issec.maida.health/v3';

// Variável para o serviço de token do Apps Script
const GAS_TOKEN_SERVICE_URL = process.env.GAS_TOKEN_SERVICE_URL; 

let ecoToken = ''; 

/**
 * Tenta obter um novo token de autenticação. Prioriza o Serviço de Token do Apps Script (GAS).
 * @returns {Promise<string>} O token.
 */
async function obterNovoTokenECO() {

    // 1. TENTA AUTENTICAÇÃO VIA GOOGLE APPS SCRIPT (MÉTODO PRIORITÁRIO)
    if (GAS_TOKEN_SERVICE_URL) {
        console.log('🔗 URL do GAS encontrada. Solicitando token ao Web App...');
        try {
            const response = await fetch(GAS_TOKEN_SERVICE_URL);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: 'Resposta não é JSON' }));
                throw new Error(`GAS Service falhou: ${response.status} - ${errorBody.error || response.statusText}`);
            }

            const data = await response.json();
            if (data.success && data.token) {
                ecoToken = data.token;
                console.log('✅ Token ECO obtido com sucesso via GAS Web App.');
                return ecoToken;
            } else {
                throw new Error(data.error || "GAS Service retornou erro desconhecido.");
            }
        } catch (err) {
            console.error('❌ Erro no serviço GAS/Token:', err.message);
            // Se falhar, segue para o fallback OAuth 2.0
        }
    }

    // 2. FALLBACK PARA OAUTH 2.0 (MÉTODO SECUNDÁRIO)
    if (ECO_CLIENT_ID && ECO_CLIENT_SECRET) {
        console.log('🔗 Serviço GAS falhou ou não configurado. Tentando renovação via OAuth 2.0...');
        try {
            const credentials = Buffer.from(`${ECO_CLIENT_ID}:${ECO_CLIENT_SECRET}`).toString('base64');
            const response = await fetch(ECO_AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Falha na renovação OAuth: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const newToken = data.access_token;
            ecoToken = newToken;
            console.log('✅ Token ECO renovado com sucesso via OAuth 2.0.');
            return newToken;
        } catch (err) {
            console.error('❌ Erro na renovação OAuth 2.0:', err.message);
        }
    }
    
    // 3. FALLBACK FINAL: USAR TOKEN ANTIGO
    if (ecoToken) {
        console.warn('⚠️ Usando token antigo pré-configurado. Nenhuma fonte de autenticação funcionou.');
        return ecoToken;
    }
    
    // 4. FALHA TOTAL
    throw new Error('Nenhuma credencial de autenticação válida (GAS, OAuth 2.0 ou Token antigo) encontrada.');
}

/**
 * Função para fazer requisição ao ECO com lógica de renovação de token.
 */
async function fetchECO(numeroGuia) {
    const urlGuia = `${ECO_BASE_URL}/historico-cliente?ordenarPor=DATA_SOLICITACAO&autorizacao=${numeroGuia}&page=0`;
    
    const makeRequest = async (token) => {
        const res = await fetch(urlGuia, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return res;
    };
    
    // Inicializa o token se estiver vazio (apenas na primeira tentativa de chamada)
    if (!ecoToken) ecoToken = await obterNovoTokenECO(); 
    
    let response = await makeRequest(ecoToken);

    // Se falhar por 401/403 (Token inválido ou expirado)
    if (response.status === 401 || response.status === 403) {
        console.log('🔁 Token ECO expirado (401/403). Tentando renovar...');
        
        try {
            ecoToken = await obterNovoTokenECO(); // Tenta obter um novo token
        } catch (err) {
            throw new Error('Falha crítica: Token expirou e não foi possível renovar.');
        }
        
        response = await makeRequest(ecoToken); // Tenta a requisição novamente com o novo token
    }
    
    return response;
}

export async function atualizarStatusGuias() {
    try {
        console.log('🔄 Iniciando atualização de status das guias...');
        
        // BUSCA MUITO SIMPLES - apenas guias não reguladas
        const guiasParaAtualizar = await prisma.prioridade.findMany({
        // Garante que temos um token (ou tentamos obter um) antes de começar
        if (!ecoToken) {
            await obterNovoTokenECO();
        }
        
        // Filtro para excluir guias já finalizadas ou em status de exclusão
        const guiasPendentes = await prisma.prioridade.findMany({
            where: {
                regulada: false
                capturada: false,
                regulada: false,
                fonte: 'ECO',
                // FILTRO NOT COMPLETO: Exclui guias com status final do BD
                NOT: {
                    OR: [
                        { status: { contains: 'AUTORIZAD', mode: 'insensitive' } },
                        { status: { contains: 'APROVAD', mode: 'insensitive' } }, 
                        { status: { contains: 'NEGAD', mode: 'insensitive' } },
                        { status: { contains: 'CANCELAD', mode: 'insensitive' } },
                        { status: { contains: 'CONCLUID', mode: 'insensitive' } },
                        { status: { contains: 'EXECUTAD', mode: 'insensitive' } } 
                    ]
                }
            },
            select: {
                id: true,
                numeroGuia: true,
                idGuiaECO: true,
                status: true, // ← ESTÁ FALTANDO NO SEU CÓDIGO ATUAL!
                fonte: true,
                regulada: true
            }
        });

        console.log(`📊 ${guiasParaAtualizar.length} guias para verificar status`);

        let guiasAtualizadas = 0;

        for (const guia of guiasParaAtualizar) {
            try {
                console.log(`🔍 Verificando guia ${guia.numeroGuia} (ID: ${guia.id})`);
                
                const detalhesGuia = await fetchGuiaDetalhes(guia.numeroGuia);
                
                if (!detalhesGuia) {
                    console.log(`❌ Guia ${guia.numeroGuia} não encontrada no ECO`);
                    continue;
                }

                // Pegar statusRegulacao da API
                const statusDaAPI = detalhesGuia.statusRegulacao || detalhesGuia.situacao || detalhesGuia.status;
                
                if (!statusDaAPI) {
                    console.log(`⚠️ Situação não disponível para guia ${guia.numeroGuia}`);
                    continue;
                }

                // Verificar se o status mudou
                if (guia.status !== statusDaAPI) {
                console.log(`🔄 Atualizando guia ${guia.numeroGuia}: ${guia.status} → ${statusDaAPI}`);
                
                // Determinar se deve marcar como regulada
                const statusUpper = statusDaAPI.toUpperCase();
                const deveMarcarRegulada = statusUpper.includes('AUTORIZAD') || 
                                        statusUpper.includes('APROVAD') ||
                                        statusUpper.includes('SEM RESTRIÇÃO') ||
                                        statusUpper.includes('NEGAD') ||
                                        statusUpper.includes('CANCELAD') ||
                                        statusUpper.includes('EXECUTAD') ||
                                        statusUpper.includes('EXECUTADA') ||
                                        statusUpper.includes('CONCLUID');
                
                await prisma.prioridade.update({
                    where: { id: guia.id },
                    data: { 
                        status: statusDaAPI,
                        regulada: deveMarcarRegulada,
                        // Se for marcar como regulada, adiciona data de regulacao
                        ...(deveMarcarRegulada && {
                            dataRegulacao: new Date(),
                            reguladorId: 1 // Ou o ID do usuário/system que está fazendo a atualização
                        })
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    if (data.content && data.content.length > 0) {
                        const guiaPrincipal = data.content[0];
                        
                        statusAtualizado = guiaPrincipal.status;
                        filaAtualizada = guiaPrincipal.fila || guia.fila;
                    } else {
                        // LOG DE ALERTA PARA RESPOSTAS VAZIAS (200 OK, mas sem content)
                        console.warn(`[AVISO ECO] Guia ${guia.numeroGuia} retornou 200 OK, mas o 'content' está vazio ou é nulo.`);
                    }
                } else {
                    console.warn(`⚠️ Falha HTTP na guia ${guia.numeroGuia}: ${res.status} ${res.statusText}`);
                }

                // LOG DE DEBUG CRÍTICO PARA VER A COMPARAÇÃO:
                if (statusAtualizado) {
                    console.log(`[DEBUG COMPARAÇÃO GUIA ${guia.numeroGuia}] BD Status: "${guia.status.toUpperCase()}" | ECO Status: "${statusAtualizado.toUpperCase()}"`);
                }


                if (statusAtualizado && statusAtualizado.toUpperCase() !== guia.status.toUpperCase()) {
                    
                    const upperStatus = statusAtualizado.toUpperCase();
                    const isStatusFinal = upperStatus.includes('AUTORIZAD') ||
                                          upperStatus.includes('APROVAD') || 
                                          upperStatus.includes('NEGAD') ||
                                          upperStatus.includes('CANCELAD') ||
                                          upperStatus.includes('CONCLUID') ||
                                          upperStatus.includes('EXECUTAD');

                    await prisma.prioridade.update({
                        where: { id: guia.id },
                        data: { 
                            status: statusAtualizado,
                            fila: filaAtualizada,
                            regulada: isStatusFinal,
                            dataRegulacao: isStatusFinal ? new Date() : null,
                            dataAtualizacao: new Date()
                        }
                    });
                    
                    guiasAtualizadas++;
                    console.log(`✅ Guia ${guia.numeroGuia} atualizada para: ${statusDaAPI}`);
                    
                } else {
                    console.log(`✅ Status da guia ${guia.numeroGuia} já está atualizado: ${statusDaAPI}`);
                }
                
            } catch (error) {
                console.error(`❌ Erro ao processar guia ${guia.numeroGuia}:`, error.message);
                continue;
            }
        }

        console.log(`✅ Atualização concluída: ${guiasAtualizadas} guias atualizadas`);
        return guiasAtualizadas;
        
    } catch (error) {
        console.error('❌ Erro geral na atualização de status:', error);
        throw error;
    }
}

export async function forcarAtualizacao() {
    return await atualizarStatusGuias();
}