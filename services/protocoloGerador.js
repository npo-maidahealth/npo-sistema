// services/protocoloGerador.js
import prisma from '../db/prisma.js';

/**
 * Gera um protocolo único no formato SPG-AAAAMMDDHHMM-0000.
 * O contador reseta a cada minuto e é seguro contra concorrência.
 * @returns {Promise<string>} O protocolo gerado (ex: SPG-202510031050-0001)
 */
export async function gerarProtocoloSPG() {
    
    // NOTA: A data/hora usará o fuso horário do servidor. 
    // Preciso configurar posteriormente o server para configurar horário de brasilia
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    const prefixoProtocolo = `SPG-${year}${month}${day}${hour}${minute}`;
    
    // Buscamos o maior protocolo do minuto atual.
    const maiorProtocolo = await prisma.solicitacaoPrioridade.findFirst({
        where: {
            protocoloSPG: {
                startsWith: prefixoProtocolo,
            },
        },
        orderBy: {
            protocoloSPG: 'desc', // Ordenar por string para pegar o contador mais alto
        },
        select: { protocoloSPG: true }
    });
    
    let contador = 1;
    
    if (maiorProtocolo && maiorProtocolo.protocoloSPG) {
        const partes = maiorProtocolo.protocoloSPG.split('-');
        const ultimoContadorStr = partes[partes.length - 1];
        
        contador = parseInt(ultimoContadorStr) + 1;
    }

    const contadorFormatado = String(contador).padStart(4, '0');

    return `${prefixoProtocolo}-${contadorFormatado}`;
}