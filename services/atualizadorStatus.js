// services/atualizadorStatus.js
import prisma from '../db/prisma.js';
import { fetchGuiaDetalhes } from './ecoService.js';

export async function atualizarStatusGuias() {
    try {
        console.log('🔄 Iniciando atualização de status das guias...');
        
        // BUSCA MUITO SIMPLES - apenas guias não reguladas
        const guiasParaAtualizar = await prisma.prioridade.findMany({
            where: {
                regulada: false
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