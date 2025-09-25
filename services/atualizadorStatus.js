import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

// Função para atualizar status das guias a partir da API ECO
export async function atualizarStatusGuias() {
    try {
        console.log('🔄 Iniciando atualização de status das guias...');
        
        // Buscar todas as guias pendentes que não estão autorizadas/negadas
        const guiasPendentes = await prisma.prioridade.findMany({
            where: {
                capturada: false,
                regulada: false,
                NOT: {
                    OR: [
                        { status: { contains: 'AUTORIZAD', mode: 'insensitive' } },
                        { status: { contains: 'NEGAD', mode: 'insensitive' } },
                        { status: { contains: 'CANCELAD', mode: 'insensitive' } }
                    ]
                }
            },
            select: {
                id: true,
                numeroGuia: true,
                status: true,
                fonte: true
            }
        });

        console.log(`📊 ${guiasPendentes.length} guias para verificar status`);

        let atualizadas = 0;

        for (const guia of guiasPendentes) {
            try {
                // DEBUG ESPECÍFICO PARA A GUIA 228406
                if (guia.numeroGuia === '228406') {
                    console.log(`🔍 [DEBUG] Verificando guia 228406 - Status no BD: "${guia.status}"`);
                }
                
                let statusAtualizado = null;

                // Verificar status na API correspondente à fonte
                if (guia.fonte === 'ECO') {
                    const url = `http://localhost:3000/api/eco/${guia.numeroGuia}`;
                    
                    // DEBUG: Log da URL para a guia 228406
                    if (guia.numeroGuia === '228406') {
                        console.log(`🔍 [DEBUG] URL da API: ${url}`);
                        console.log(`🔍 [DEBUG] Token: ${process.env.ECO_TOKEN ? 'PRESENTE' : 'AUSENTE'}`);
                    }
                    
                    // REQUEST COM TOKEN BEARER
                    const res = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.ECO_TOKEN}`
                        }
                    });
                    
                    // DEBUG: Status da resposta para a guia 228406
                    if (guia.numeroGuia === '228406') {
                        console.log(`🔍 [DEBUG] Status da resposta: ${res.status}`);
                    }
                    
                    if (res.ok) {
                        const data = await res.json();
                        
                        // DResposta completa da API para a guia 228406
                        if (guia.numeroGuia === '228406') {
                            console.log(`🔍 [DEBUG] Resposta da API:`, JSON.stringify(data, null, 2));
                        }
                        
                        if (data.content && data.content.length > 0) {
                            statusAtualizado = data.content[0].statusRegulacao;
                            
                            // DEBUG: Status retornado pela API
                            if (guia.numeroGuia === '228406') {
                                console.log(`🔍 [DEBUG] Status da API: "${statusAtualizado}"`);
                                console.log(`🔍 [DEBUG] Status diferente do BD? ${statusAtualizado !== guia.status}`);
                            }
                        } else if (guia.numeroGuia === '228406') {
                            console.log(`🔍 [DEBUG] API retornou array vazio ou sem content`);
                        }
                    } else if (guia.numeroGuia === '228406') {
                        console.log(`🔍 [DEBUG] Erro na resposta da API: ${res.status} ${res.statusText}`);
                        // Tentar ler o corpo do erro
                        try {
                            const errorBody = await res.text();
                            console.log(`🔍 [DEBUG] Corpo do erro: ${errorBody.substring(0, 200)}...`);
                        } catch (e) {
                            console.log(`🔍 [DEBUG] Não foi possível ler corpo do erro`);
                        }
                    }
                }
                // Adicione outros else if  (SISWEB, etc.)

                // Se o status mudou, atualizar no banco
                if (statusAtualizado && statusAtualizado !== guia.status) {
                    const isStatusFinal = statusAtualizado.toUpperCase().includes('AUTORIZAD') ||
                                        statusAtualizado.toUpperCase().includes('NEGAD') ||
                                        statusAtualizado.toUpperCase().includes('CANCELAD');

                    await prisma.prioridade.update({
                        where: { id: guia.id },
                        data: { 
                            status: statusAtualizado,
                            regulada: isStatusFinal,
                            dataRegulacao: isStatusFinal ? new Date() : null
                        }
                    });
                    
                    console.log(`✅ Guia ${guia.numeroGuia} atualizada: ${guia.status} → ${statusAtualizado}`);
                    atualizadas++;
                
                } else if (guia.numeroGuia === '228406') {
                    console.log(`🔍 [DEBUG] Nenhuma atualização necessária para guia 228406`);
                }

                // Pequeno delay para não sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (err) {
                console.error(`❌ Erro ao atualizar guia ${guia.numeroGuia}:`, err.message);
                
                // DEBUG: Log completo do erro para a guia 228406
                if (guia.numeroGuia === '228406') {
                    console.error(`🔍 [DEBUG] Erro completo:`, err);
                }
            }
        }

        console.log(`✅ Atualização concluída: ${atualizadas} guias atualizadas`);

    } catch (err) {
        console.error('❌ Erro na atualização de status:', err);
    }
}

// Função para forçar atualização via API
export async function forcarAtualizacao() {
    return await atualizarStatusGuias();
}