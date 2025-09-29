// protocolo-detalhe.js
import { PERMISSIONS, TAGS } from '/js/constants.js';
import { hasPermission, formatDate, formatStatus } from '/js/utils.js';
import { ProtocolService } from '/js/protocolService.js';
import { ModalManager } from '/js/modalManager.js';
import { protocolActionButtons } from '/js/protocolActions.js';
import { protocolUI } from '/js/protocolUI.js';
import '/js/session.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let currentProtocolo = null;

    const urlParams = new URLSearchParams(window.location.search);
    const protocoloId = urlParams.get('id');

    const modalManager = new ModalManager();
    const modais = [
        { id: 'resolucao-modal-container', closeBtnId: 'close-resolucao-modal-btn' },
        { id: 'encerrar-modal-container', closeBtnId: 'close-encerrar-modal-btn' },
        { id: 'analise-modal-container', closeBtnId: 'close-analise-modal-btn' },
    ];
    modais.forEach(({ id, closeBtnId }) => {
        const modalEl = document.getElementById(id);
        const closeBtn = document.getElementById(closeBtnId);
        if (modalEl) modalManager.registerModal(id, modalEl, closeBtn);
    });

    document.getElementById('voltar-btn')?.addEventListener('click', () => window.history.back());

    document.addEventListener('userReady', async (event) => {
        currentUser = event.detail;
        if (!currentUser) return;
        await carregarProtocolo();
    });

    // Função principal que carrega todos os dados e renderiza a página
    async function carregarProtocolo() {
        if (!protocoloId) return alert('Protocolo não encontrado');
        try {
            const protocolo = await ProtocolService.getProtocoloById(protocoloId);
            if (!protocolo) throw new Error('Protocolo não encontrado');
            currentProtocolo = protocolo;

            console.log('Usuário completo:', currentUser);
            
            // Renderiza as informações principais do protocolo
            protocolUI.exibirProtocolo(protocolo, TAGS, currentUser);
            exibirTagsEStatus(protocolo);
            exibirResolucaoFinal(protocolo);
            
            // Renderiza o histórico de tratativas
            const cargosPermitidos = ['analista', 'gestor_ti', 'Administrador'];
            const tratativasSection = document.querySelector('.tratativas-section');
            const usuarioTemAcesso = currentUser.cargos?.some(cargo => 
                cargosPermitidos.includes(cargo.toLowerCase()));

            if (tratativasSection) {
                if (usuarioTemAcesso) {
                    tratativasSection.style.display = 'block';
                    const tratativasFiltradas = protocolo.tratativas.filter(
                        t => t.tipo_mensagem !== 'resolucao_final'
                    );
                    exibirTratativas(tratativasFiltradas);
                } else {
                    tratativasSection.style.display = 'none';
                }
            }
            
            // Renderiza os botões de ação
            const acoesContainer = document.getElementById('acoes-section');
            acoesContainer.innerHTML = '';
            
            if (hasPermission(currentUser, PERMISSIONS.GERENCIAR_PROTOCOLOS)) {
                const modalFunctions = {
                    openResolucaoModal: () => { modalManager.showModal('resolucao-modal-container'); },
                    openAnaliseModal: (p) => { protocolUI.openAnaliseModal(p, modalManager); },
                    openEncerrarModal: () => { modalManager.showModal('encerrar-modal-container'); }
                };
                protocolActionButtons(protocolo, acoesContainer, currentUser, modalManager, modalFunctions);
            }

            configurarEventosModal(protocoloId);

        } catch (error) {
            console.error('Erro ao carregar protocolo:', error);
            alert('Erro ao carregar protocolo');
        }
    }

    // Funções auxiliares para renderização e eventos
    function exibirResolucaoFinal(protocolo) {
        const card = document.getElementById('resolucao-final-card');
        const texto = document.getElementById('resolucao-texto-final');
        if (!card || !texto) return;
        if (!protocolo.descricao_resolucao) {
            card.style.display = 'none';
            return;
        }
        card.style.display = 'block';
        texto.textContent = protocolo.descricao_resolucao;
    }

    function exibirTratativas(tratativas) {
        const listContainer = document.getElementById('tratativas-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        if (!tratativas || !tratativas.length) {
            listContainer.textContent = 'Nenhuma tratativa ainda.';
            return;
        }
        tratativas.forEach(t => {
            const isAnalista = t.usuario?.cargos?.some(c => c.cargo?.nome === 'analista');
            const isAdministrador = t.usuario?.cargos?.some(c => c.cargo?.nome === 'Administrador');
            let roleLabel = '';
            if (isAnalista) {
                roleLabel = 'Analista';
            } else if (isAdministrador) {
                roleLabel = 'Administrador';
            }
            const userNameHtml = roleLabel ? 
                `<span class="tratativa-usuario">${t.usuario?.nome || 'Usuário'}</span> <span class="tratativa-role-label">(${roleLabel})</span>` :
                `<span class="tratativa-usuario">${t.usuario?.nome || 'Usuário'}</span>`;
            const formattedDate = t.data_criacao ? formatDate(t.data_criacao) : '';
            const div = document.createElement('div');
            div.className = `tratativa-item ${t.tipo_mensagem || ''}`;
            div.innerHTML = `
                <div class="tratativa-header">
                    ${userNameHtml}
                    <span class="tratativa-data">${formattedDate}</span>
                </div>
                <div class="tratativa-conteudo">${t.descricao || '-'}</div>
            `;
            listContainer.appendChild(div);
        });
    }

    function exibirTagsEStatus(protocolo) {
        const tagsContainer = document.getElementById('tags-container');
        const statusBadge = document.getElementById('status-badge');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            if (protocolo.nivel_dificuldade) {
                const nivelTag = document.createElement('span');
                nivelTag.className = `tag tag-dificuldade-${protocolo.nivel_dificuldade}`;
                nivelTag.textContent = `Nível ${protocolo.nivel_dificuldade}`;
                tagsContainer.appendChild(nivelTag);
            }
            if (protocolo.ferramentas_indicadas) {
                const ferramentas = protocolo.ferramentas_indicadas.split(',').map(f => f.trim());
                ferramentas.forEach(ferramenta => {
                    const ferramentaTag = document.createElement('span');
                    const className = `tag tag-${ferramenta.toLowerCase().replace(/\s/g, '-')}`;
                    ferramentaTag.className = className;
                    ferramentaTag.textContent = ferramenta;
                    tagsContainer.appendChild(ferramentaTag);
                });
            }
        }
        if (statusBadge) {
            statusBadge.className = 'status-badge'; 
            statusBadge.textContent = formatStatus(protocolo.status);
            statusBadge.classList.add(`status-${protocolo.status}`);
        }
    }
    
    function configurarEventosModal(protocoloId) {
        const resolucaoText = document.getElementById('resolucao-text');
        const enviarResolucaoBtn = document.getElementById('enviar-resolucao-btn');
        const encerramentoText = document.getElementById('encerramento-text');
        const confirmarEncerramentoBtn = document.getElementById('confirmar-encerramento-btn');
        const motivoMelhoriaContainer = document.getElementById('motivo-melhoria-container');
        const motivoMelhoriaText = document.getElementById('motivo-melhoria-text');
        const confirmarMelhoriaBtn = document.getElementById('confirmar-melhoria-btn');
        const aprovarBtn = document.getElementById('aprovar-btn');
        const pontoMelhoriaBtn = document.getElementById('ponto-melhoria-btn');

        enviarResolucaoBtn?.addEventListener('click', async () => {
            const descricao = resolucaoText.value.trim();
            if (!descricao) return alert('Por favor, descreva a resolução');
            try {
                await ProtocolService.forwardResolution(protocoloId, descricao);
                modalManager.hideModal('resolucao-modal-container');
                resolucaoText.value = '';
                carregarProtocolo();
            } catch { alert('Erro ao encaminhar resolução'); }
        });

        confirmarEncerramentoBtn?.addEventListener('click', async () => {
            const descricao = encerramentoText.value.trim();
            if (!descricao) return alert('Por favor, descreva a resolução final');
            try {
                await ProtocolService.closeProtocol(protocoloId, descricao);
                modalManager.hideModal('encerrar-modal-container');
                encerramentoText.value = '';
                carregarProtocolo();
            } catch { alert('Erro ao encerrar protocolo'); }
        });

        aprovarBtn?.addEventListener('click', async () => {
            try {
                await ProtocolService.analyzeProtocol(protocoloId, 'aprovar');
                modalManager.hideModal('analise-modal-container');
                carregarProtocolo();
            } catch { alert('Erro ao aprovar resolução'); }
        });

        pontoMelhoriaBtn?.addEventListener('click', () => { motivoMelhoriaContainer.style.display = 'block'; });

        confirmarMelhoriaBtn?.addEventListener('click', async () => {
            const motivo = motivoMelhoriaText.value.trim();
            if (!motivo) return alert('Informe o motivo do ponto de melhoria.');
            try {
                await ProtocolService.analyzeProtocol(protocoloId, 'ponto-melhoria', motivo);
                modalManager.hideModal('analise-modal-container');
                motivoMelhoriaText.value = '';
                motivoMelhoriaContainer.style.display = 'none';
                carregarProtocolo();
            } catch { alert('Erro ao processar análise'); }
        });

        window.addEventListener('load', () => {
            modais.forEach(({ id }) => {
                const modal = document.getElementById(id);
                modal?.classList.add('is-hidden');
            });
        });
    }
});