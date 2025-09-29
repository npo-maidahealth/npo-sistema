// Funções auxiliares (movidas para o topo para melhor organização)
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

async function carregarPrioridades(user, view) {
    // Esta função permanece igual à original
    // ...
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
        const allowedRoles = ['regulacao', 'atendente', 'coordenador', 'Administrador'];
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

// A função carregarPrioridades precisa ser colada aqui, pois ela é muito grande
// e não foi alterada. Cole o conteúdo da sua função carregarPrioridades original aqui.
// ... (Cole a função carregarPrioridades aqui)
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
            const dataGuiaFormatada = formatDate(dataCriacaoGuia, false);
            const dataRegistroPrioridade = formatDate(prioridade.dataCriacao, true);

            let solicitacoesHTML = (prioridade.vezesSolicitado > 1) ? `
                <div class="multiplas-solicitacoes">
                    <strong>Solicitado ${prioridade.vezesSolicitado} vezes</strong>
                    <div class="solicitacao-info">
                        <div class="data-principal">${formatDate(dataCriacaoGuia, false)}</div>
                        <div class="vezes-adicionais">+${prioridade.vezesSolicitado - 1}</div>
                    </div>
                </div>` : `
                <div class="unica-solicitacao">
                    <strong>Única solicitação em:</strong> ${formatDate(dataCriacaoGuia, false)}
                </div>`;
            
            card.innerHTML = `
                <h3>Guia: ${formatValue(prioridade.numeroGuia)} 
                    <span class="contador-solicitacoes">${prioridade.vezesSolicitado || 1}x</span>
                </h3>
                <p><strong>Paciente:</strong> ${formatValue(prioridade.beneficiario)}</p>
                <p><strong>Status:</strong> ${formatValue(prioridade.status)}</p>
                <p><strong>Guia criada em:</strong> ${dataGuiaFormatada}</p>
                <p><strong>Fila:</strong> ${formatValue(prioridade.caracterAtendimento)}</p>
                <p><strong>Sistema:</strong> ${formatValue(prioridade.fonte)}</p>

                ${isRegulada && prioridade.dataRegulacao ? `
                <div class="data-autorizacao">
                    <i class="fas fa-check-circle"></i>
                    <strong>Autorizada em:</strong> ${formatDate(prioridade.dataRegulacao, true)}
                </div>` : ''}

                ${!isRegulada ? `
                <div class="sla-info ${prioridade.caracterAtendimento?.includes('URGÊNCIA') ? 'urgente' : ''}">
                    <strong>SLA:</strong> ${formatValue(prioridade.atrasoRegulacao)}
                </div>` : ''}

                ${solicitacoesHTML}

                <div class="data-registro">
                    <strong>Prioridade registrada em:</strong> ${dataRegistroPrioridade}
                </div>

                ${prioridade.regulador ? `
                <div class="regulador-info">
                    <i class="fas fa-user-md"></i> Regulador: ${prioridade.regulador.nome || '-'}
                </div>` : ''}

                <div class="card-buttons">
                    <button class="btn observacao-btn"><i class="fas fa-eye"></i> Ver Observação</button>
                    ${!isRegulada && isSiswebGuia(prioridade) ? `<button class="btn marcar-regulada"><i class="fas fa-check"></i> Marcar como Regulada</button>` : ''}
                </div>
            `;

            if (isRegulada) card.classList.add('regulada');
            
            card.querySelector('.observacao-btn').addEventListener('click', () => abrirModal(prioridade.observacao));
            
            const btnMarcar = card.querySelector('.marcar-regulada');
            if (btnMarcar) {
                btnMarcar.addEventListener('click', () => {
                    document.body.appendChild(criarMenuStatus(prioridade, user));
                });
            }

            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        alert('Erro ao carregar prioridades');
    }
}