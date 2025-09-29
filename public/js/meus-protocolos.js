document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let allProtocols = [];

    // Referências a todos os modais necessários para esta página
    const chatModal = document.getElementById('chat-modal-container');
    const closeChatBtn = document.getElementById('close-chat-modal-btn');
    const chatMessagesContainer = document.getElementById('chat-messages');

    // Permissões adaptadas para esta página
    const permissions = {
        cliente: ['view_tools_description', 'request_module', 'view_own_protocols', 'filter_own_protocols'],
        gestor: ['view_tools_description', 'request_module', 'view_own_protocols', 'filter_own_protocols', 'access_panel_links'],
        analista: ['view_tools_description', 'view_all_protocols'], // Apenas permissões relevantes
        gestor_ti: ['view_tools_description', 'view_all_protocols'],
        Administrador: ['view_tools_description', 'view_all_protocols']
    };

    const TAGS = [
        { name: "JavaScript", class: "tag-javascript" }, { name: "Python", class: "tag-python" }, { name: "Java", class: "tag-java" },
        { name: "C", class: "tag-c" }, { name: "C++", class: "tag-cpp" }, { name: "C#", class: "tag-csharp" },
        { name: "PHP", class: "tag-php" }, { name: "Ruby", class: "tag-ruby" }, { name: "Go", class: "tag-go" },
        { name: "Rust", class: "tag-rust" }, { name: "Kotlin", class: "tag-kotlin" }, { name: "Swift", class: "tag-swift" },
        { name: "TypeScript", class: "tag-typescript" }, { name: "MySQL", class: "tag-mysql" }, { name: "PostgreSQL", class: "tag-postgresql" },
        { name: "MongoDB", class: "tag-mongodb" }, { name: "Oracle", class: "tag-oracle" }, { name: "SQLite", class: "tag-sqlite" },
        { name: "Redis", class: "tag-redis" }, { name: "Cassandra", class: "tag-cassandra" }, { name: "Firebird", class: "tag-firebird" },
        { name: "SQL Server", class: "tag-sql-server" }, { name: "DB2", class: "tag-db2" }, { name: "Sybase", class: "tag-sybase" },
        { name: "Informix", class: "tag-informix" }, { name: "DynamoDB", class: "tag-dynamodb" }
    ];

    function hasPermission(permission) {
        return currentUser && currentUser.cargos.some(role => permissions[role]?.includes(permission));
    }

    document.addEventListener('userReady', (event) => {
        currentUser = event.detail;
        if (currentUser) {
            initializePage();
            setupFilterListeners();
        }
    });

    async function initializePage() {
        try {
            console.log('🔄 Buscando meus protocolos...');
            const response = await fetch('/api/protocolos/meus-protocolos', {
                credentials: 'include'
            });
            
            console.log('📋 Status da resposta:', response.status);
            
            if (!response.ok) {
                console.error('❌ Erro na resposta:', response.statusText);
                throw new Error('Falha ao buscar meus protocolos');
            }
            
            allProtocols = await response.json();
            console.log('✅ Protocolos recebidos:', allProtocols);
            
            displayProtocols(allProtocols);

        } catch (error) {
            console.error("❌ Erro ao carregar meus protocolos:", error);
            document.getElementById('protocolos-list').innerHTML = 
                '<p>Erro ao carregar seus protocolos. Tente novamente.</p>';
        }
    }
    
    function displayProtocols(protocolList) {
        const protocolosContainer = document.getElementById('protocolos-list'); // ← CORRIGIDO: 'protocolos-list'
        protocolosContainer.innerHTML = '';
        const template = document.getElementById('protocolo-card-template');
        
        if (protocolList.length > 0) {
            protocolList.forEach(p => {
                const card = createProtocolCard(p, template);
                protocolosContainer.appendChild(card);
            });
        } else {
            protocolosContainer.innerHTML = '<p>Você não possui protocolos.</p>';
        }
    }

    function createProtocolCard(protocolo, template) {
        const card = template.content.cloneNode(true).querySelector('.protocolo-card');
        const actionsContainer = card.querySelector('.protocolo-actions');

        card.querySelector('.protocolo-uid').textContent = `Protocolo ${protocolo.protocolo_uid}`;
        card.querySelector('.solicitante').textContent = `Solicitante: ${protocolo.solicitante.nome}`;
        card.querySelector('.data-criacao').textContent = `Data: ${new Date(protocolo.data_criacao).toLocaleDateString()}`;
        card.querySelector('.protocolo-descricao').textContent = protocolo.descricao;
        
        if (protocolo.responsavel) {
            const responsavelElement = document.createElement('div');
            responsavelElement.textContent = `Analista: ${protocolo.responsavel.nome}`;
            responsavelElement.className = 'analista-responsavel';
            card.querySelector('.protocolo-info').appendChild(responsavelElement);
        }

        if (protocolo.tratativas?.length > 0) {
            const chatIcon = document.createElement('i');
            chatIcon.className = 'fas fa-comment-dots protocolo-chat-icon';
            chatIcon.title = 'Ver histórico de mensagens';
            chatIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                openChatModal(protocolo.id, protocolo.protocolo_uid);
            });
            card.querySelector('.protocolo-uid').appendChild(chatIcon);
        }

        const statusElement = card.querySelector('.protocolo-status');
        const statusText = protocolo.status.replace(/_/g, ' ');
        statusElement.textContent = `Status: ${statusText}`;
        statusElement.className = `protocolo-status status-${protocolo.status}`;

        const tagsContainer = card.querySelector('.protocolo-tags');
        tagsContainer.innerHTML = '';
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

        // Lógica corrigida para o botão de ver resolução
        if (protocolo.status === 'fechado') {
            const verResolucaoBtn = document.createElement('button');
            verResolucaoBtn.className = 'action-button';
            verResolucaoBtn.innerHTML = `<i class="fas fa-eye"></i> Ver Resolução`;
            verResolucaoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openResolucaoFinalModal(protocolo);
            });
            actionsContainer.appendChild(verResolucaoBtn);
        }

        card.addEventListener('click', () => {
            window.location.href = `protocolo-detalhe.html?id=${protocolo.id}`;
        });
        
        return card;
    }

    function openResolucaoFinalModal(protocolo) {
        const resolucaoFinalText = document.getElementById('resolucao-final-text');
        const resolucaoProtocolUid = document.getElementById('resolucao-protocol-uid');
        
        if (resolucaoFinalText) {
            resolucaoFinalText.textContent = protocolo.descricao_resolucao || 'Descrição final não disponível.';
        }

        if (resolucaoProtocolUid) {
            resolucaoProtocolUid.textContent = protocolo.protocolo_uid;
        }

        const modal = document.getElementById('resolucao-final-modal-container');
        if (modal) {
            const closeBtn = document.getElementById('close-resolucao-final-modal-btn');
            closeBtn.onclick = () => modal.style.display = 'none';
            modal.style.display = 'flex';
        }
    }
    
    async function openChatModal(protocoloId, protocoloUid) {
        document.getElementById('chat-protocol-uid').textContent = protocoloUid;
        chatMessagesContainer.innerHTML = 'Carregando mensagens...';
        
        try {
            const response = await fetch(`/api/protocolos/${protocoloId}/conversas`);
            if (!response.ok) throw new Error('Falha ao buscar conversas');
            const conversas = await response.json();
            
            chatMessagesContainer.innerHTML = '';
            if (conversas.length > 0) {
                conversas.forEach(msg => {
                    const messageElement = document.createElement('div');
                    const isMyMessage = msg.id_usuario === currentUser.id;
                    const messageClass = isMyMessage ? 'my-message' : 'other-message';

                    messageElement.className = `chat-message ${messageClass}`;
                    messageElement.innerHTML = `<p class="message-content">${msg.descricao}</p>`;
                    chatMessagesContainer.appendChild(messageElement);
                });
            } else {
                chatMessagesContainer.innerHTML = '<p>Nenhuma mensagem ainda.</p>';
            }
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            chatModal.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao carregar o chat:', error);
            chatMessagesContainer.innerHTML = '<p>Erro ao carregar o chat. Tente novamente.</p>';
        }
    }
    
    closeChatBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
    });

    function setupFilterListeners() {
        const filterBtn = document.getElementById('filter-btn');
        const filterDropdown = document.getElementById('filter-dropdown');
        const filterOptions = document.querySelectorAll('.filter-option');
        
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterDropdown.style.display = filterDropdown.style.display === 'none' ? 'flex' : 'none';
        });

        filterOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const status = e.target.getAttribute('data-status');
                
                filterOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                
                if (status === 'all') {
                    displayProtocols(allProtocols);
                } else {
                    const filtered = allProtocols.filter(p => p.status === status);
                    displayProtocols(filtered);
                }
                
                filterDropdown.style.display = 'none';
            });
        });

        document.addEventListener('click', (e) => {
            if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.style.display = 'none';
            }
        });
    }
});