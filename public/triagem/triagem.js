import { hasPermission } from '../protocolos/utils.js';
import { TAGS } from '../protocolos/constants.js';
import { ModalManager } from '../protocolos/modalManager.js';
import { ProtocolService } from '../protocolos/protocolService.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let allProtocols = [];
    const modalManager = new ModalManager();

    console.log('Página de triagem carregada - aguardando userReady...');

    const ferramentasCardsContainer = document.getElementById('ferramentas-cards');
    const triageModal = document.getElementById('triage-modal-container');
    const triageForm = document.getElementById('triage-form');
    const closeTriageBtn = document.getElementById('close-triage-modal-btn');
    const tagSearch = document.getElementById('tag-search');
    const tagSuggestions = document.getElementById('tag-suggestions');
    const selectedTagsContainer = document.getElementById('selected-tags');
    const tagInput = document.getElementById('tag-input');
    let selectedTags = [];

    // Registro dos modais
    modalManager.registerModal('triage-modal-container', triageModal, closeTriageBtn);

    document.addEventListener('userReady', (event) => {
        console.log('🎉 Evento userReady RECEBIDO!', event.detail);
        currentUser = event.detail;
        
        if (currentUser) {
            console.log('✅ Usuário carregado:', currentUser.nome);
            console.log('📋 Cargos do usuário:', currentUser.cargos);
            console.log('🔐 Permissões do usuário:', currentUser.permissoes);
            
            console.log('🔍 Tem permissão triage_protocol:', hasPermission(currentUser, 'triage_protocol'));
            console.log('🔍 Tem permissão administrador:', hasPermission(currentUser, 'administrador'));
            
            initializePage();
            setupTagSystemListeners();
        } else {
            console.log('❌ Usuário veio vazio no evento');
        }
    });

    setTimeout(() => {
        console.log('⏰ Verificando fallback após 1s...');
        if (!currentUser && window.currentUser) {
            console.log('🔄 Usando fallback do window.currentUser');
            currentUser = window.currentUser;
            initializePage();
            setupTagSystemListeners();
        } else if (!currentUser) {
            console.log('❌ Nenhum usuário encontrado após 1 segundo');
            fetch('/api/auth/session')
                .then(response => response.json())
                .then(data => {
                    if (data.user) {
                        console.log('🔓 Usuário obtido via fetch manual:', data.user);
                        currentUser = data.user;
                        initializePage();
                        setupTagSystemListeners();
                    }
                })
                .catch(error => {
                    console.error('Erro ao buscar sessão manualmente:', error);
                });
        }
    }, 1000);

    async function initializePage() {
        console.log('🚀 Inicializando página...');
        try {
            const protocolos = await ProtocolService.getTriageProtocols();
            allProtocols = protocolos;
            console.log('📊 Protocolos carregados:', protocolos.length);
            protocolos.forEach(p => {
                console.log(`   - Protocolo ${p.id}: ${p.status}, dificuldade: ${p.nivel_dificuldade}`);
            });
            displayProtocols(allProtocols);
        } catch (error) {
            console.error("❌ Erro ao inicializar a página:", error);
        }
    }

    function setupTagSystemListeners() {
        if (!tagSearch || !ferramentasCardsContainer) {
            console.error('Elementos necessários não encontrados');
            return;
        }

        tagSearch.addEventListener('input', () => {
            const query = tagSearch.value.toLowerCase();
            filtrarCardsFerramentas(query);
        });

        tagSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstCard = ferramentasCardsContainer.querySelector('.ferramenta-card');
                if (firstCard) {
                    const tagName = firstCard.textContent;
                    const tagData = TAGS.find(t => t.name === tagName);
                    if (tagData) addTag(tagData);
                }
            }
        });
    }


    function filtrarCardsFerramentas(query) {
        ferramentasCardsContainer.innerHTML = '';
        
        if (query.length === 0) {
            ferramentasCardsContainer.innerHTML = '<div class="ferramentas-placeholder">Digite acima para buscar ferramentas</div>';
            return;
        }
        
        const filteredTags = TAGS.filter(tag => 
            tag.name.toLowerCase().includes(query) && !selectedTags.includes(tag.name)
        );
        
        if (filteredTags.length === 0) {
            ferramentasCardsContainer.innerHTML = '<div class="ferramentas-placeholder">Nenhuma ferramenta encontrada</div>';
            return;
        }
        
        filteredTags.forEach(tag => {
            const card = document.createElement('div');
            card.className = `ferramenta-card ${tag.class}`;
            card.dataset.tagName = tag.name;
            card.textContent = tag.name;
            
            card.addEventListener('click', () => {
                addTag(tag);
            });
            
            ferramentasCardsContainer.appendChild(card);
        });
    }

    
    // Funções de display e renderização
    function displayProtocols(protocolList) {
        const triagemContainer = document.getElementById('triagem-list');
        if (!triagemContainer) return;
        triagemContainer.innerHTML = '';
        const template = document.getElementById('protocolo-card-template');

        if (protocolList.length > 0) {
            protocolList.forEach(p => {
                const card = createProtocolCard(p, template);
                triagemContainer.appendChild(card);
            });
        } else {
            triagemContainer.innerHTML = '<p>Nenhum protocolo pendente de triagem.</p>';
        }
    }

    function createProtocolCard(protocolo, template) {
        console.log('Criando card para:', protocolo.id, 'Status:', protocolo.status);
        console.log('Usuário atual:', currentUser);
        console.log('Tem permissão triage_protocol:', hasPermission(currentUser, 'triage_protocol'));
        const card = template.content.cloneNode(true).querySelector('.protocolo-card');
        const actionsContainer = card.querySelector('.protocolo-actions');

        card.querySelector('.protocolo-uid').textContent = `Protocolo ${protocolo.protocolo_uid}`;
        card.querySelector('.solicitante').textContent = `Solicitante: ${protocolo.solicitante.nome}`;
        card.querySelector('.data-criacao').textContent = `Data: ${new Date(protocolo.data_criacao).toLocaleDateString()}`;
        card.querySelector('.protocolo-descricao').textContent = protocolo.descricao;

        const statusElement = card.querySelector('.protocolo-status');
        const statusText = protocolo.status.replace(/_/g, ' ');
        statusElement.textContent = `Status: ${statusText}`;
        statusElement.className = `protocolo-status status-${protocolo.status}`;

        const tagsContainer = card.querySelector('.protocolo-tags');
        tagsContainer.innerHTML = '';

        if (protocolo.status === 'pendente_triagem' && hasPermission(currentUser, 'triage_protocol')) {
            const triageButton = document.createElement('button');
            triageButton.className = 'action-button triage';
            triageButton.innerHTML = `<i class="fas fa-clipboard-check"></i> Fazer Triagem`;
            triageButton.addEventListener('click', () => openTriageModal(protocolo));
            actionsContainer.appendChild(triageButton);
        }

        if (protocolo.nivel_dificuldade) {
            const difTag = document.createElement('span');
            difTag.className = `tag tag-dificuldade-${protocolo.nivel_dificuldade}`;
            difTag.textContent = `Nível ${protocolo.nivel_dificuldade}`;
            tagsContainer.appendChild(difTag);
        }
        if (protocolo.ferramentas_indicadas) {
            const ferramentas = protocolo.ferramentas_indicadas.split(',').map(f => f.trim());
            ferramentas.forEach(tool => {
                const tagData = TAGS.find(t => t.name.toLowerCase() === tool.toLowerCase());
                if (tagData) {
                    const toolTag = document.createElement('span');
                    toolTag.className = `tag ${tagData.class}`;
                    toolTag.textContent = tagData.name;
                    tagsContainer.appendChild(toolTag);
                }
            });
        }
        
        return card;
    }

    function openTriageModal(protocolo) {
        triageForm.reset();
        document.getElementById('triage-protocol-id').value = protocolo.id;
        
        if (protocolo.nivel_dificuldade) {
            document.getElementById('triage-dificuldade').value = protocolo.nivel_dificuldade;
        }

        selectedTags = [];
        selectedTagsContainer.innerHTML = '';
        tagSearch.value = '';
        tagInput.value = '';
        
        // Verifique se o elemento existe antes de manipular
        if (ferramentasCardsContainer) {
            ferramentasCardsContainer.innerHTML = '<div class="ferramentas-placeholder">Digite acima para buscar ferramentas</div>';
        }

        if (protocolo.ferramentas_indicadas) {
            const ferramentas = protocolo.ferramentas_indicadas.split(',').map(f => f.trim());
            ferramentas.forEach(tool => {
                const tagData = TAGS.find(t => t.name.toLowerCase() === tool.toLowerCase());
                if (tagData) {
                    addTag(tagData);
                }
            });
        }

        modalManager.showModal('triage-modal-container');
        setTimeout(() => tagSearch.focus(), 100);
    }

    if (!ferramentasCardsContainer) {
        console.error('❌ Elemento ferramentas-cards não encontrado no DOM');
    }

    function addTag(tag) {
        if (selectedTags.includes(tag.name)) return;
        
        selectedTags.push(tag.name);

        const tagEl = document.createElement('span');
        tagEl.className = `tag ${tag.class}`;
        tagEl.textContent = tag.name;
        const removeIcon = document.createElement('span');
        removeIcon.className = 'tag-remove';
        removeIcon.innerHTML = '&times;';
        removeIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTag(tag.name, tagEl);
        });
        
        tagEl.appendChild(removeIcon);
        selectedTagsContainer.appendChild(tagEl);

        tagInput.value = selectedTags.join(', ');

        const query = tagSearch.value.toLowerCase();
        if (query.length > 0) {
            filtrarCardsFerramentas(query);
        }
        
        tagSearch.focus();
    }

    function removeTag(tagName, tagEl) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        if (tagEl) tagEl.remove();
        tagInput.value = selectedTags.join(', ');
        
        const query = tagSearch.value.toLowerCase();
        if (query.length > 0) {
            filtrarCardsFerramentas(query);
        }
    }
    
    triageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const protocoloId = document.getElementById('triage-protocol-id').value;
        const data = {
            nivel_dificuldade: document.getElementById('triage-dificuldade').value,
            ferramentas_indicadas: tagInput.value,
        };
        
        try {
            const response = await ProtocolService.triageProtocol(protocoloId, data);
            
            if (response.ok) {
                modalManager.hideModal('triage-modal-container');
                initializePage();
            } else {
                const result = await response.json();
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            alert('Erro de conexão ao fazer triagem.');
        }
    });
});