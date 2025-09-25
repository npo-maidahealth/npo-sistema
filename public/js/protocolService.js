// protocolService.js
import { fetchWithErrorHandling } from './utils.js';

export class ProtocolService {
    static async getAllProtocols() {
        return await fetchWithErrorHandling('/api/protocolos');
    }
    
    static async getUserProtocols() {
        return await fetchWithErrorHandling('/api/protocolos/meus-protocolos');
    }

    static async getTriageProtocols() {
        return await fetchWithErrorHandling('/api/triagem');
    }
    
    static async assumeProtocol(protocolId) {
        return await fetchWithErrorHandling(`/api/protocolos/${protocolId}/assumir`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    static async triageProtocol(protocolId, data) {
        return await fetchWithErrorHandling(`/api/protocolos/${protocolId}/triage`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
    
    static async forwardResolution(protocolId, description) {
        return await fetchWithErrorHandling(`/api/protocolos/${protocolId}/encaminhar-resolucao`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descricao_resolucao: description })
        });
    }
    
    //Função responsável por enviar para o servidor a decisão tomada na hora da análise (Aprovar ou Ponto de Melhoria)
    
    static async analyzeProtocol(protocolId, action, reason = '') {
        const url = `/api/protocolos/${protocolId}/analisar`;

        const body = action === 'aprovar' 
            ? { acao: 'aprovar' } 
            : { acao: 'ponto_melhoria', motivo_melhoria: reason };

        return await fetchWithErrorHandling(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    
    static async closeProtocol(protocolId, finalDescription) {
        return await fetchWithErrorHandling(`/api/protocolos/${protocolId}/encerrar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descricao_final: finalDescription })
        });
    }

    static async getProtocoloById(id) {
        return await fetchWithErrorHandling(`/api/protocolos/${id}`);
    }

    static async getProtocolConversations(protocoloId) {
        return await fetchWithErrorHandling(`/api/protocolos/${protocoloId}/conversas`);
    }
}