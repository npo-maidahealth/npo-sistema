// protocolUI.js
import { PERMISSIONS, TAGS } from '/js/constants.js';
import { hasPermission, formatDate, formatStatus } from '/js/utils.js';
import { ModalManager } from '/js/modalManager.js';
import { ProtocolService } from '/js/protocolService.js';


export const protocolUI = {
    populateCard(protocolo, card, TAGS, currentUser, modalManager, modalFunctions) {
        // Importa a função de botões aqui para que ela tenha acesso às funções de modal
        import('./protocolActions.js').then(module => {
            // Chama a função que cria os botões, passando todos os parâmetros necessários
            module.protocolActionButtons(protocolo, card.querySelector('.protocolo-actions'), currentUser, modalManager, modalFunctions);
        });

        // Info principal
        card.querySelector('.protocolo-uid').textContent = `Protocolo ${protocolo.protocolo_uid}`;
        card.querySelector('.solicitante').textContent = `Solicitante: ${protocolo.solicitante?.nome || 'Não informado'}`;
        card.querySelector('.data-criacao').textContent = `Data: ${formatDate(protocolo.data_criacao)}`;
        card.querySelector('.protocolo-descricao').textContent = protocolo.descricao || 'Sem descrição';

        // Responsável
        if (protocolo.responsavel) {
            const resp = document.createElement('div');
            resp.textContent = `Analista: ${protocolo.responsavel.nome}`;
            resp.className = 'analista-responsavel';
            const infoContainer = card.querySelector('.protocolo-info');
            if (infoContainer) infoContainer.appendChild(resp);
        }

        // Tags
        const tagsContainer = card.querySelector('.protocolo-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            if (protocolo.nivel_dificuldade) {
                const difTag = document.createElement('span');
                difTag.className = `tag tag-dificuldade-${protocolo.nivel_dificuldade}`;
                difTag.textContent = `Nível ${protocolo.nivel_dificuldade}`;
                tagsContainer.appendChild(difTag);
            }
            if (protocolo.ferramentas_indicadas) {
                protocolo.ferramentas_indicadas.split(',').map(f => f.trim()).forEach(tool => {
                    const tagData = TAGS.find(t => t.name.toLowerCase() === tool.toLowerCase());
                    if (tagData) {
                        const toolTag = document.createElement('span');
                        toolTag.className = `tag ${tagData.class}`;
                        toolTag.textContent = tagData.name;
                        tagsContainer.appendChild(toolTag);
                    }
                });
            }
        }

        // Status
        const statusElement = card.querySelector('.protocolo-status');
        if (statusElement) {
            statusElement.textContent = `Status: ${formatStatus(protocolo.status)}`;
            statusElement.className = `protocolo-status status-${protocolo.status}`;
        }
    },

    async openAnaliseModal(protocolo, modalManager) {
        const analiseDescricao = document.getElementById('analise-descricao-resolucao');
        const pontoMelhoriaArea = document.getElementById('ponto-melhoria-area');
        const pontoMelhoriaInput = document.getElementById('ponto-melhoria-input');
        if (!analiseDescricao || !pontoMelhoriaArea || !pontoMelhoriaInput) return;

        analiseDescricao.textContent = protocolo.tratativas?.find(t => t.tipo_mensagem === 'resolucao_analista')?.descricao
            || 'Nenhuma descrição de resolução encontrada.';
        pontoMelhoriaArea.style.display = 'none';

        const aprovarBtn = document.getElementById('aprovar-btn');
        const pontoMelhoriaBtn = document.getElementById('ponto-melhoria-btn');
        const enviarMelhoriaBtn = document.getElementById('enviar-melhoria-btn');

        if (aprovarBtn) aprovarBtn.onclick = async () => {
            await import('./protocolService.js').then(mod => {
                mod.ProtocolService.analyzeProtocol(protocolo.id, 'aprovar');
                modalManager.hideModal('analise-modal-container');
            });
        };
        if (pontoMelhoriaBtn) pontoMelhoriaBtn.onclick = () => pontoMelhoriaArea.style.display = 'block';
        if (enviarMelhoriaBtn) enviarMelhoriaBtn.onclick = async () => {
            const motivo = pontoMelhoriaInput.value.trim();
            if (!motivo) return alert('Informe o motivo do ponto de melhoria.');
            await import('./protocolService.js').then(mod => {
                mod.ProtocolService.analyzeProtocol(protocolo.id, 'ponto-melhoria', motivo);
                modalManager.hideModal('analise-modal-container');
                pontoMelhoriaInput.value = '';
            });
        };

        modalManager.showModal('analise-modal-container');
    },

    openResolucaoFinalModal(protocolo, modalManager) {
        const resolucaoText = document.getElementById('resolucao-final-text');
        const resolucaoUid = document.getElementById('resolucao-protocol-uid');
        if (resolucaoUid) resolucaoUid.textContent = protocolo.protocolo_uid;
        if (resolucaoText) resolucaoText.textContent = protocolo.descricao_resolucao || 'Descrição final não disponível.';
        modalManager.showModal('resolucao-final-modal-container');
    },

    async openChatModal(protocoloId, protocoloUid, modalManager) {
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (!chatMessagesContainer) return;
        const chatUid = document.getElementById('chat-protocol-uid');
        if (chatUid) chatUid.textContent = protocoloUid;

        chatMessagesContainer.innerHTML = 'Carregando mensagens...';

        try {
            const conversas = await import('./protocolService.js').then(mod => mod.ProtocolService.getProtocolConversations(protocoloId));
            chatMessagesContainer.innerHTML = '';
            if (conversas.length) {
                conversas.forEach(msg => {
                    const messageElement = document.createElement('div');
                    messageElement.className = `chat-message ${msg.tipo_mensagem}`;
                    let senderInfo = `<strong>${msg.usuario?.nome || 'Usuário desconhecido'}</strong>`;
                    if (msg.tipo_mensagem === 'ponto_melhoria') senderInfo += ' (Ponto de Melhoria)';
                    if (msg.tipo_mensagem === 'aprovacao') senderInfo += ' (Aprovação)';
                    if (msg.tipo_mensagem === 'encerramento') senderInfo += ' (Encerramento)';
                    if (msg.tipo_mensagem === 'resolucao_analista') senderInfo += ' (Resolução)';
                    messageElement.innerHTML = `<span class="sender-name">${senderInfo}</span><p class="message-content">${msg.descricao || 'Sem conteúdo'}</p>`;
                    chatMessagesContainer.appendChild(messageElement);
                });
            } else chatMessagesContainer.innerHTML = '<p>Nenhuma mensagem ainda.</p>';
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            modalManager.showModal('chat-modal-container');
        } catch {
            chatMessagesContainer.innerHTML = '<p>Erro ao carregar o chat. Tente novamente.</p>';
        }
    },
};