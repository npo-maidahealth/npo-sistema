// protocolos.js
import { PERMISSIONS, TAGS } from '/js/constants.js';
import { hasPermission, formatDate, formatStatus } from '/js/utils.js';
import { ModalManager } from '/js/modalManager.js';
import { ProtocolService } from '/js/protocolService.js';
import { protocolActionButtons } from '/js/protocolActions.js';
import { protocolUI } from '/js/protocolUI.js';


console.log('🔹 protocolos.js iniciado');

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let allProtocols = [];
    const modalManager = new ModalManager();

    // ----------------- REGISTRO DE MODAIS -----------------
    const modais = [
        { id: 'assign-modal-container', closeBtnId: 'close-assign-modal-btn' },
        { id: 'resolucao-modal-container', closeBtnId: 'close-resolucao-modal-btn' },
        { id: 'analise-modal-container', closeBtnId: 'close-analise-modal-btn' },
        { id: 'encerrar-modal-container', closeBtnId: 'close-encerrar-modal-btn' },
        { id: 'chat-modal-container', closeBtnId: 'close-chat-modal-btn' },
        { id: 'resolucao-final-modal-container', closeBtnId: 'close-resolucao-final-modal-btn' },
    ];

    modais.forEach(({ id, closeBtnId }) => {
        const el = document.getElementById(id);
        const closeBtn = document.getElementById(closeBtnId);
        if (el) modalManager.registerModal(id, el, closeBtn);
    });

    // ----------------- FUNÇÕES DE MODAL -----------------
    const modalFunctions = {
        openAssignModal: (protocoloId) => {
            const input = document.getElementById('assign-protocol-id');
            if (!input) return;
            input.value = protocoloId;
            modalManager.showModal('assign-modal-container');
        },
        openResolucaoModal: (protocoloId) => {
            const input = document.getElementById('resolucao-protocol-id');
            if (!input) return;
            input.value = protocoloId;
            modalManager.showModal('resolucao-modal-container');
        },
        openAnaliseModal: async (protocolo) => {
            protocolUI.openAnaliseModal(protocolo, modalManager);
        },
        openEncerrarModal: (protocoloId) => {
            const input = document.getElementById('encerrar-protocol-id');
            if (input) input.value = protocoloId;
            modalManager.showModal('encerrar-modal-container');
        },
        openResolucaoFinalModal: (protocolo) => {
            protocolUI.openResolucaoFinalModal(protocolo, modalManager);
        },
        openChatModal: async (protocoloId, protocoloUid) => {
            await protocolUI.openChatModal(protocoloId, protocoloUid, modalManager);
        },
    };

    // ----------------- CRIAÇÃO DE CARDS -----------------
    function createProtocolCard(protocolo, template) {
        const card = template.content.cloneNode(true).querySelector('.protocolo-card');
        if (!card) return document.createElement('div');

        // Passa todas as informações para a função que preenche o card
        protocolUI.populateCard(protocolo, card, TAGS, currentUser, modalManager, modalFunctions);

        card.addEventListener('click', e => {
            const ignore = e.target.closest('.protocolo-chat-icon') || e.target.closest('.action-button') || e.target.closest('.protocolo-actions');
            if (!ignore) window.location.href = `protocolo-detalhe.html?id=${protocolo.id}`;
        });

        return card;
    }

    function displayProtocols(protocolList) {
        const container = document.getElementById('all-protocols-list');
        const template = document.getElementById('protocolo-card-template');
        if (!container || !template) return;

        container.innerHTML = '';
        if (!protocolList.length) {
            container.innerHTML = '<p>Nenhum protocolo encontrado.</p>';
            return;
        }

        protocolList.forEach(p => container.appendChild(createProtocolCard(p, template)));
    }

    // ----------------- INICIALIZAÇÃO -----------------
    async function initializePage() {
        try {
            allProtocols = await ProtocolService.getAllProtocols();
            const AdministradorView = document.getElementById('Administrador-view');
            const clientView = document.getElementById('client-view');
            if (AdministradorView) AdministradorView.style.display = 'block';
            if (clientView) clientView.style.display = 'none';

            displayProtocols(allProtocols);
        } catch (error) {
            console.error('Erro em initializePage:', error);
            const container = document.querySelector('.content-container');
            if (container) container.innerHTML = '<h1>Erro ao carregar dados. Tente novamente.</h1>';
        }
    }

    // ----------------- FILTROS -----------------
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', e => {
            e.stopPropagation();
            const dropdown = document.getElementById('filter-dropdown');
            if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.querySelectorAll('.filter-option').forEach(btn => {
            btn.addEventListener('click', e => {
                const status = e.target.dataset.status;
                const filteredList = status === 'all' ? allProtocols : allProtocols.filter(p => p.status === status);
                document.querySelectorAll('.filter-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const title = document.getElementById('protocolos-title');
                if (title) title.textContent = status === 'all' ? 'Todos' : formatStatus(status);
                displayProtocols(filteredList);

                const dropdown = document.getElementById('filter-dropdown');
                if (dropdown) dropdown.style.display = 'none';
            });
        });

        window.addEventListener('click', e => {
            const dropdown = document.getElementById('filter-dropdown');
            if (dropdown && dropdown.style.display === 'block') dropdown.style.display = 'none';
        });
    }

    // ----------------- LISTENER userReady -----------------
    document.addEventListener('userReady', e => {
        currentUser = e.detail;
        if (currentUser) initializePage();
    });

    // fallback se session.js já carregou
    if (window.userReady) {
        currentUser = window.userReady;
        initializePage();
    }

    // ----------------- ASSIGN FORM -----------------
    const assignForm = document.getElementById('assign-form');
    const assignAnalistaSelect = document.getElementById('assign-analista');
    const assignErrorMessage = document.getElementById('assign-error-message');

    if (assignForm && assignAnalistaSelect && assignErrorMessage) {
        assignForm.addEventListener('submit', async e => {
            e.preventDefault();
            const protocoloId = document.getElementById('assign-protocol-id').value;
            const analistaId = assignAnalistaSelect.value;
            try {
                await ProtocolService.assignProtocol(protocoloId, analistaId);
                modalManager.hideModal('assign-modal-container');
                initializePage();
            } catch {
                assignErrorMessage.textContent = 'Erro de conexão ou ao atribuir protocolo.';
            }
        });
    }

    // ----------------- BOTÕES DE FECHAR MODAIS -----------------
    const closeButtons = ['close-assign-modal-btn', 'close-chat-modal-btn'];
    closeButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => {
            const modalId = id.replace('close-', '').replace('-btn', '-container');
            modalManager.hideModal(modalId);
        });
    });

    console.log('🔹 protocolos.js completamente carregado');
});