function atualizarInterface(view, prioridades) {
    const viewTitle = document.getElementById('view-title');
    const totalCount = document.getElementById('total-count');
    
    if (view === 'pendentes') {
        viewTitle.textContent = 'Pedidos de Prioridade';
    } else {
        viewTitle.textContent = 'Guias Reguladas';
    }
    
    totalCount.textContent = prioridades.length;
}

function isSiswebGuia(prioridade) {
    return prioridade.fonte && prioridade.fonte.toUpperCase() === 'SISWEB';
}

function criarMenuStatus(prioridade, user) {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'status-menu-container';
    menuContainer.innerHTML = `
        <div class="status-menu">
            <div class="status-header">Selecione o Status:</div>
            <button class="status-option" data-status="Aguardando autenticação">Aguardando autenticação</button>
            <button class="status-option" data-status="Autorização sem restrição">Autorização sem restrição</button>
            <button class="status-option" data-status="Autorização Pendente">Autorização Pendente</button>
            <button class="status-option" data-status="Autorização estornada">Autorização estornada</button>
            <button class="status-option" data-status="Cancelada">Cancelada</button>
            <button class="status-cancel">Cancelar</button>
        </div>
    `;

    menuContainer.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', () => {
            const status = option.dataset.status;
            atualizarStatusGuia(prioridade.id, status, user);
            menuContainer.remove();
        });
    });

    menuContainer.querySelector('.status-cancel').addEventListener('click', () => menuContainer.remove());
    menuContainer.addEventListener('click', (e) => {
        if (e.target === menuContainer) menuContainer.remove();
    });

    return menuContainer;
}


async function atualizarStatusGuia(id, status, user) {
    try {
        const res = await fetch(`/api/regulador/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Erro ao atualizar status');

        const result = await res.json();
        
        if (status === 'Autorização sem restrição') {
            await marcarRegulada(id, user);
        } else {
            const activeTab = document.querySelector('.tab.active');
            const currentView = activeTab ? activeTab.dataset.view : 'pendentes';
            await carregarPrioridades(user, currentView);
        }
        
        alert(result.message || 'Status atualizado com sucesso!');

    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        alert('Erro ao atualizar status: ' + err.message);
    }
}

function abrirModal(texto) {
    const modal = document.getElementById('modal-observacao');
    const modalText = document.getElementById('modal-text');
    modalText.textContent = texto || "Sem observação";
    modal.style.display = "block";
}

async function marcarRegulada(id, user) {
    try {
        const res = await fetch(`/api/regulador/${id}/regulada`, { 
            method: 'PATCH', 
            credentials: 'include' 
        });
        if (!res.ok) throw new Error('Erro ao marcar como regulada');
        
        const activeTab = document.querySelector('.tab.active');
        const currentView = activeTab ? activeTab.dataset.view : 'pendentes';
        await carregarPrioridades(user, currentView);
        
    } catch (err) {
        console.error(err);
        alert('Erro ao marcar como regulada');
    }
}

// Lógica principal da página
document.addEventListener('DOMContentLoaded', () => {
    
    // Configura eventos que não dependem do usuário, como o modal.
    const modal = document.getElementById('modal-observacao');
    if(modal) {
        modal.style.display = "none";
        
        const closeModal = modal.querySelector('.close');
        closeModal.onclick = () => modal.style.display = "none";
        window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
    }

    // Espera o shared.js confirmar que o usuário está logado
    document.addEventListener('userReady', (event) => {
        const user = event.detail;

        // 1. Checa se o usuário tem permissão para esta página específica
        const allowedRoles = ['regulacao', 'atendente', 'coordenador', 'administrador'];
        const hasPermission = user.cargos.some(cargo => allowedRoles.includes(cargo));
        
        if (!hasPermission) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/';
            return;
        }

        // 2. Lógica para as abas de navegação da página
        const tabs = document.querySelectorAll('.tabs .tab');
        let currentView = 'pendentes';
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(i => i.classList.remove('active'));
                tab.classList.add('active');
                currentView = tab.dataset.view;
                carregarPrioridades(user, currentView);
            });
        });

        // 3. Carrega a visualização padrão e inicia a atualização automática
        carregarPrioridades(user, currentView);
        setInterval(() => {
            const activeTab = document.querySelector('.tab.active');
            const view = activeTab ? activeTab.dataset.view : 'pendentes';
            console.log('⏰ Atualização automática executada -', new Date().toLocaleTimeString());
            carregarPrioridades(user, view);
        }, 10 * 60 * 1000); // 10 minutos
    });
});

function atualizarInterface(view, prioridades) {
    const viewTitle = document.getElementById('view-title');
    const totalCount = document.getElementById('total-count');
    
    if (view === 'pendentes') {
        viewTitle.textContent = 'Pedidos de Prioridade';
    } else {
        viewTitle.textContent = 'Guias Reguladas';
    }
    
    totalCount.textContent = prioridades.length;
}

function isSiswebGuia(prioridade) {
    return prioridade.fonte && prioridade.fonte.toUpperCase() === 'SISWEB';
}

function criarMenuStatus(prioridade, user) {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'status-menu-container';
    menuContainer.innerHTML = `
        <div class="status-menu">
            <div class="status-header">Selecione o Status:</div>
            <button class="status-option" data-status="Aguardando autenticação">Aguardando autenticação</button>
            <button class="status-option" data-status="Autorização sem restrição">Autorização sem restrição</button>
            <button class="status-option" data-status="Autorização Pendente">Autorização Pendente</button>
            <button class="status-option" data-status="Autorização estornada">Autorização estornada</button>
            <button class="status-option" data-status="Cancelada">Cancelada</button>
            <button class="status-cancel">Cancelar</button>
        </div>
    `;

    menuContainer.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', () => {
            const status = option.dataset.status;
            atualizarStatusGuia(prioridade.id, status, user);
            menuContainer.remove();
        });
    });

    menuContainer.querySelector('.status-cancel').addEventListener('click', () => menuContainer.remove());
    menuContainer.addEventListener('click', (e) => {
        if (e.target === menuContainer) menuContainer.remove();
    });

    return menuContainer;
}

async function atualizarStatusGuia(id, status, user) {
    try {
        const res = await fetch(`/api/regulador/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Erro ao atualizar status');

        const result = await res.json();
        
        if (status === 'Autorização sem restrição') {
            await marcarRegulada(id, user);
        } else {
            const activeTab = document.querySelector('.tab.active');
            const currentView = activeTab ? activeTab.dataset.view : 'pendentes';
            await carregarPrioridades(user, currentView);
        }
        
        alert(result.message || 'Status atualizado com sucesso!');

    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        alert('Erro ao atualizar status: ' + err.message);
    }
}

function abrirModal(texto) {
    const modal = document.getElementById('modal-observacao');
    const modalText = document.getElementById('modal-text');
    modalText.textContent = texto || "Sem observação";
    modal.style.display = "block";
}

async function marcarRegulada(id, user) {
    try {
        const res = await fetch(`/api/regulador/${id}/regulada`, { 
            method: 'PATCH', 
            credentials: 'include' 
        });
        if (!res.ok) throw new Error('Erro ao marcar como regulada');
        
        const activeTab = document.querySelector('.tab.active');
        const currentView = activeTab ? activeTab.dataset.view : 'pendentes';
        await carregarPrioridades(user, currentView);
        
    } catch (err) {
        console.error(err);
        alert('Erro ao marcar como regulada');
    }
}
// Lógica principal da página
document.addEventListener('DOMContentLoaded', () => {
    
    // Configura eventos que não dependem do usuário, como o modal.
    const modal = document.getElementById('modal-observacao');
    if(modal) {
        modal.style.display = "none";
        
        const closeModal = modal.querySelector('.close');
        closeModal.onclick = () => modal.style.display = "none";
        window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
    }

    // Espera o shared.js confirmar que o usuário está logado
    document.addEventListener('userReady', (event) => {
        const user = event.detail;

        // 1. Checa se o usuário tem permissão para esta página específica
        const allowedRoles = ['regulacao', 'atendente', 'coordenador', 'administrador'];
        const hasPermission = user.cargos.some(cargo => allowedRoles.includes(cargo));
        
        if (!hasPermission) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/';
            return;
        }

        // 2. Lógica para as abas de navegação da página
        const tabs = document.querySelectorAll('.tabs .tab');
        let currentView = 'pendentes';
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(i => i.classList.remove('active'));
                tab.classList.add('active');
                currentView = tab.dataset.view;
                carregarPrioridades(user, currentView);
            });
        });

        // 3. Carrega a visualização padrão e inicia a atualização automática
        carregarPrioridades(user, currentView);
        setInterval(() => {
            const activeTab = document.querySelector('.tab.active');
            const view = activeTab ? activeTab.dataset.view : 'pendentes';
            console.log('⏰ Atualização automática executada -', new Date().toLocaleTimeString());
            carregarPrioridades(user, view);
        }, 10 * 60 * 1000); // 10 minutos
    });
});

async function carregarPrioridades(user, view) {
    try {
        console.log(`Carregando ${view}...`);
        const endpoint = `/api/regulador/${view}`;
        console.log('Endpoint:', endpoint);
        const res = await fetch(endpoint, { credentials: 'include' });

        if (!res.ok) throw new Error('Erro ao buscar prioridades');
        const prioridades = await res.json();
        console.log(`Prioridades recebidas: ${prioridades.length}`);
        atualizarInterface(view, prioridades);

        // Ordenar prioridades pelo caráter do atendimento e data
        const ordemCarater = {
            "URGÊNCIA": 1,
            "EMERGÊNCIA": 1,
            "PRORROGAÇÃO": 2,
            "SP": 3,
            "SADT": 3,
            "INTERNACAO_ELETIVA": 4
        };

        const prioridadesOrdenadas = prioridades.sort((a, b) => {
            const valorA = ordemCarater[a.caracterAtendimento?.toUpperCase()] || 5;
            const valorB = ordemCarater[b.caracterAtendimento?.toUpperCase()] || 5;
            if (valorA !== valorB) return valorA - valorB;
            return new Date(a.dataSolicitacao) - new Date(b.dataSolicitacao);
        });

        const container = document.getElementById('cards-container');
        container.innerHTML = '';

        prioridadesOrdenadas.forEach(prioridade => {
            const status = prioridade.status?.toUpperCase() || '';
            const isRegulada = prioridade.regulada || view === 'reguladas';
            const card = document.createElement('div');
            card.classList.add('prioridade-card');

            const formatValue = (value) => value || '-';
            
            const formatDate = (dateString, includeTime = true) => {
 
                if (!dateString) return '-';
                try {
                    const d = new Date(dateString);
                    if (isNaN(d.getTime())) return '-';
                    
                    if (includeTime) {
                        return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    } else {
                        return d.toLocaleDateString('pt-BR');
                    }
                } catch { return '-'; }
            };

            const dataCriacaoGuia = prioridade.dataHoraSolicitacao || prioridade.dataSolicitacao;
            const dataEmissao = formatDate(dataCriacaoGuia, false);
            
            // Lógica para a tarja de status e fonte
            const statusDisplay = formatValue(prioridade.status);
            let statusTarjaClass = '';
            
            if (isRegulada) {
                statusTarjaClass = 'autorizada';
            } else if (prioridade.caracterAtendimento?.includes('URGÊNCIA') || prioridade.caracterAtendimento?.includes('EMERGÊNCIA')) {
                statusTarjaClass = 'urgente';
            } else if (isSiswebGuia(prioridade)) {
                statusTarjaClass = 'sisweb';
            }
            
            // CONSTRUÇÃO DO HTML DO HISTÓRICO (CARD BACK)
            let historicoListHTML = '<ul class="historico-list">';
            const historico = prioridade.historicoSolicitacoes || [];
            
            // Ordenar do mais recente para o mais antigo para exibição
            const historicoOrdenado = historico.sort((a, b) => 
                new Date(b.dataHoraSolicitacao) - new Date(a.dataHoraSolicitacao));

            historicoOrdenado.forEach((hist, index) => {
                const dataHora = formatDate(hist.dataHoraSolicitacao, true);
                const regulador = hist.reguladorPlantao?.nome || 'Não Informado';
                const statusRegistro = hist.statusPrioridade || 'Pendente';
                const fonte = hist.fonte || 'N/A';
                
                historicoListHTML += `
                    <li>
                        <i class="fas fa-history"></i> **${index === 0 ? 'Último' : index + 1} Registro**
                        | <i class="fas fa-clock"></i> ${dataHora}
                        | <span class="regulador-nome"><i class="fas fa-user-md"></i> ${regulador}</span>
                        | Status: ${statusRegistro} (${fonte})
                    </li>
                `;
            });
            
            if (historico.length === 0) {
                 historicoListHTML += `<li><i class="fas fa-info-circle"></i> Não há histórico detalhado de solicitações.</li>`;
            }
            historicoListHTML += '</ul>';

            card.innerHTML = `
                <div class="prioridade-card-inner">
                    
                    <div class="card-front">
                        <div class="card-content">
                            
                            <div class="card-line-1">
                                <div class="guia-info-main">
                                    <div class="guia-tipo-numero">
                                        Guia de ${formatValue(prioridade.tipoGuia)} - Número da guia: ${formatValue(prioridade.numeroGuia)}
                                    </div>
                                </div>
                                
                                <div class="card-buttons">
                                    <button class="btn observacao-btn icon-only" title="Ver Observação">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    
                                    <button class="btn flip-btn icon-only" title="Ver Histórico"> 
                                        <i class="fas fa-history"></i>
                                    </button>
                                    
                                    ${!isRegulada && isSiswebGuia(prioridade) ? `
                                        <button class="btn marcar-regulada icon-only" title="Alterar Status">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="card-line-2">
                                </div>

                            <div class="card-line-3">
                                </div>

                        </div>
                    </div>
                    
                    <div class="card-back">
                        <div class="historico-header">
                            Histórico de Prioridade 
                            </div>
                        
                        ${historicoListHTML}
                        
                        <div class="back-button-container">
                            <button class="btn back-btn"><i class="fas fa-undo"></i> Voltar</button>
                        </div>
                    </div>

                </div>
            `;

            if (isRegulada) card.classList.add('regulada');
            
            
            // 1. Observação
            card.querySelector('.observacao-btn').addEventListener('click', () => abrirModal(prioridade.observacao));
            
            // 2. Flip (Histórico)
            const flipBtn = card.querySelector('.flip-btn');
            const backBtn = card.querySelector('.back-btn');
            
            const toggleFlip = () => {
                card.classList.toggle('flipped');
            };
            
            flipBtn.addEventListener('click', toggleFlip);
            backBtn.addEventListener('click', toggleFlip);
            
            // 3. Alterar Status
            const btnMarcar = card.querySelector('.marcar-regulada');
            if (btnMarcar) {
                btnMarcar.addEventListener('click', () => {
                    document.body.appendChild(criarMenuStatus(prioridade, user));
                });
            }

            container.appendChild(card);
            const cardInner = card.querySelector('.prioridade-card-inner');
            const cardFront = card.querySelector('.card-front');
            
            setTimeout(() => {
                const frontContentHeight = cardFront.offsetHeight;
                
                card.style.height = `${frontContentHeight}px`; 
                cardInner.style.height = `${frontContentHeight}px`; 
            }, 0); 
        });

    } catch (err) {
        console.error(err);
        alert('Erro ao carregar prioridades');
    }
}
function getStatusClass(status) {
    if (!status) return 'status-padrao';
    
    const statusUpper = status.toUpperCase();
    
    if (statusUpper.includes('AUTORIZADA') || statusUpper.includes('EXECUTADA')) {
        return 'status-autorizada';
    } else if (statusUpper.includes('NEGADA') || statusUpper.includes('CANCELADA')) {
        return 'status-negada';
    } else if (statusUpper.includes('DOCUMENTAÇÃO PENDENTE')) {
        return 'status-documentacao';
    } else {
        return 'status-padrao';
    }
}