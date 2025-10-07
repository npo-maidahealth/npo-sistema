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

// ==============================================================
// FUNÇÕES DE RENDERIZAÇÃO E FORMATAÇÃO 
// ==============================================================

function formatarTempoRestante(dataVencimentoSla) {
    if (!dataVencimentoSla) {
        return 'SLA Não Informado';
    }

    const agora = new Date();
    const vencimento = new Date(dataVencimentoSla);
    let diferencaMs = vencimento.getTime() - agora.getTime();

    if (diferencaMs <= 0) {
        return 'SLA Vencido';
    }

    const totalSegundos = Math.floor(diferencaMs / 1000);
    const dias = Math.floor(totalSegundos / (3600 * 24));
    const segundosRestantes = totalSegundos % (3600 * 24);
    const horas = Math.floor(segundosRestantes / 3600);
    const minutos = Math.floor((segundosRestantes % 3600) / 60);

    let tempoDisplay = '';
    
    if (dias > 0) {
        tempoDisplay += `${dias} dia${dias !== 1 ? '(s)' : ''}, `;
    }
    
    tempoDisplay += `${horas}h e ${minutos}min`;

    return `Dentro do prazo de ${tempoDisplay}`;
}

function getStatusStyles(statusDisplay) {
    if (!statusDisplay) return 'status-em-analise';
    
    const statusUpper = statusDisplay.toUpperCase();
    
    if (statusUpper.includes('AUTORIZADA') || statusUpper.includes('EXECUTADA') || statusUpper.includes('APROVAD')) {
        return 'status-autorizada';
    } else if (statusUpper.includes('NEGADA') || statusUpper.includes('CANCELADA')) {
        return 'status-negada';
    } else if (statusUpper.includes('DOCUMENTAÇÃO PENDENTE') || statusUpper.includes('EM_REANALISE') || statusUpper.includes('EM_ANALISE') || statusUpper.includes('PENDENTE') || statusUpper.includes('AGUARDANDO AUTENTICAÇÃO')) {
        return 'status-em-analise'; 
    } else {
        return 'status-em-analise'; // Padrão
    }
}

function formatarStatusItem(status) {
    const statusUpper = status?.toUpperCase() || 'PENDENTE';
    
    if (statusUpper === 'EM_ANALISE' || statusUpper === 'EM ANÁLISE') {
        return 'Em Análise';
    } else if (statusUpper === 'PENDENTE') {
        return 'Pendente';
    } else if (statusUpper === 'AUTORIZADA') {
        return 'Autorizada';
    } else if (statusUpper === 'EM_REANALISE') {
        return 'Em Reanálise';
    }
    return statusUpper.charAt(0) + statusUpper.slice(1).toLowerCase();
}

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

// SVG do ícone de internação 
const internacaoIconSVG = `
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
        width="400.000000pt" height="550.000000pt" viewBox="0 0 400.000000 550.000000"
        preserveAspectRatio="xMidYMid meet">
        <defs>
            <style>
                /* O SVG lê a variável do CSS global */
                .theme-icon {
                    fill: var(--colorfont-internacao, #E59500); 
                    transition: fill 0.3s ease;
                }
            </style>
        </defs>
        <g transform="translate(0.000000,550.000000) scale(0.100000,-0.100000)" 
            class="theme-icon" stroke="none">
            <path d="M1862 5485 c-213 -46 -411 -238 -466 -450 -8 -33 -18 -111 -22 -173
            l-7 -112 -344 0 c-376 0 -438 -6 -563 -59 -175 -73 -328 -226 -401 -400 -61
            -146 -59 -94 -59 -1541 0 -1447 -2 -1395 59 -1540 70 -169 220 -322 385 -395
            116 -51 156 -57 423 -62 l251 -5 4 -276 c3 -239 6 -283 21 -317 23 -50 70
            -100 122 -128 40 -22 45 -22 720 -25 759 -3 728 -6 808 67 77 69 81 89 85 404
            l4 277 219 0 c161 0 240 4 297 16 298 61 527 291 587 589 14 72 15 223 13
            1430 -3 1265 -5 1354 -22 1410 -77 259 -275 456 -531 531 -51 15 -116 18 -436
            21 l-376 4 -7 112 c-13 210 -60 323 -190 452 -60 60 -101 90 -157 118 -130 64
            -277 82 -417 52z m194 -501 c49 -24 64 -59 64 -154 l0 -80 -120 0 -120 0 0 80
            c0 94 14 130 62 153 42 21 71 21 114 1z m1279 -751 c29 -9 66 -33 90 -58 80
            -80 75 21 75 -1425 0 -1446 5 -1345 -75 -1425 -80 -80 21 -75 -1425 -75 -1446
            0 -1345 -5 -1425 75 -80 80 -75 -21 -75 1425 0 1446 -5 1345 75 1425 78 79
            -23 73 1421 74 1176 1 1295 0 1339 -16z m-965 -3608 l0 -125 -370 0 -370 0 0
            125 0 125 370 0 370 0 0 -125z"/>
            <path d="M1370 3459 c-41 -4 -115 -19 -163 -34 -116 -33 -459 -204 -509 -253
            -76 -73 -73 -38 -73 -867 0 -703 1 -742 19 -775 34 -64 63 -95 117 -125 l54
            -30 1185 0 1185 0 52 27 c52 28 84 63 119 128 18 33 19 72 19 780 0 824 4 775
            -65 854 -51 58 -103 80 -185 80 -68 0 -75 -2 -255 -91 -212 -104 -242 -114
            -351 -114 -138 0 -229 39 -349 146 -188 169 -373 253 -608 275 -59 5 -109 9
            -112 9 -3 -1 -39 -5 -80 -10z m316 -543 c44 -21 98 -58 136 -93 182 -169 386
            -263 610 -282 122 -10 253 2 356 32 l82 24 -2 -361 -3 -361 -867 0 -868 0 0
            486 0 486 93 45 c110 55 124 59 202 67 95 10 180 -5 261 -43z"/>
        </g>
    </svg>
`;

// ==============================================================
// FUNÇÃO DE RENDERIZAÇÃO DO CARD (COMPATÍVEL COM REGULACAO.HTML)
// ==============================================================

function renderizarCardPrioridade(prioridade, view, user) {
    const isRegulada = prioridade.regulada || view === 'reguladas';
    const isSisweb = isSiswebGuia(prioridade);
    
    const card = document.createElement('div');
    card.classList.add('prioridade-card');
    if (isRegulada) card.classList.add('regulada');
    
    // Funções de formato
    const formatValue = (value) => value || '-';
    const statusDisplay = formatarStatusItem(prioridade.status); 
    const statusClass = getStatusStyles(prioridade.status); 

    // Dados formatados
    const dataVencimentoSla = prioridade.dataVencimentoSla ? new Date(prioridade.dataVencimentoSla) : null;
    const slaTooltip = dataVencimentoSla && !isNaN(dataVencimentoSla.getTime()) 
        ? dataVencimentoSla.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : 'Não informado';
    const slaContador = formatarTempoRestante(prioridade.dataVencimentoSla);
    const qtdPrioridades = prioridade.vezesSolicitado || prioridade._count?.solicitacoes || 1;

    // Tipo de Guia formatado
    let tipoGuiaDisplay = prioridade.tipoGuia ? prioridade.tipoGuia.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : 'Guia Desconhecida';
    if (tipoGuiaDisplay === 'Solicitacao De Opme') {
        tipoGuiaDisplay = 'Anexo OPME';
    } else if (tipoGuiaDisplay === 'Sp/sadt') {
        tipoGuiaDisplay = 'SP/SADT';
    } else if (tipoGuiaDisplay === 'Internacao Eletiva') {
        tipoGuiaDisplay = 'Internação Eletiva';
    } else if (tipoGuiaDisplay.includes('Solicitacao Internacao')) {
        tipoGuiaDisplay = 'Solicitação Internação';
    }

    // Data de solicitação (ou data de criação)
    const dataEmissaoDate = prioridade.dataSolicitacao ? new Date(prioridade.dataSolicitacao) : new Date(prioridade.dataCriacao);
    const dataEmissao = dataEmissaoDate && !isNaN(dataEmissaoDate.getTime()) ? dataEmissaoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
    
    // Verifica Internação
    const isInternacao = prioridade.tipoGuia?.toUpperCase().includes('INTERNACAO') || prioridade.tipoGuia?.toUpperCase().includes('PRORROGACAO');

    // HTML  ao do regulacao.html
     card.innerHTML = `
        <div class="prioridade-card-inner-flex">
            <div class="card-front-content">
                <div class="card-content">
                    
                    <div class="detalhes-header novo-header">
                        <span class="detalhes-tipo-guia">Guia de ${tipoGuiaDisplay} - Nº Guia: ${prioridade.numeroGuia || '-'}</span>
                        <button class="btn btn-historico abrir-historico" title="Ver Histórico de Prioridades">
                            Ver Histórico
                            <i class="fas fa-chevron-right toggle-icon historico-icon-tema"></i>
                        </button>
                    </div>

                    <div class="detalhes-body novo-body">
                        
                        <p class="status-sla-row">
                            <span class="status-visual ${statusClass}">${statusDisplay}</span>
                            
                            <span 
                                class="status-visual status-sla-visual sla-info" 
                                title="SLA: ${slaTooltip}"
                            >
                                <i class="far fa-clock"></i> ${slaContador}
                            </span> 
                            
                            ${qtdPrioridades > 0 ? `<span class="contador-prioridade">${qtdPrioridades}x Solicitado</span>` : ''} 
                        </p>
                    
                        <div class="beneficiario-info-container">
                            <span class="beneficiario-info">
                                <strong>Beneficiário:</strong> ${formatValue(prioridade.beneficiario)} 
                                | <strong>CPF:</strong> ${formatValue(prioridade.cpfBeneficiario)} 
                                | <strong>Cartão:</strong> ${formatValue(prioridade.cartaoBeneficiario)}
                            </span>

                            <div class="card-buttons-beneficiario">
                                ${prioridade.observacao ? `
                                    <button class="btn observacao-btn icon-only" title="Ver Observação">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                ` : ''}
                                ${!isRegulada ? ` 
                                    <button class="btn regular-btn" title="Ir para Regulação">
                                        <i class="fas fa-clipboard-list"></i> Regular
                                    </button>
                                ` : ''}
                                ${!isRegulada && isSisweb ? `
                                    <button class="btn marcar-regulada" title="Alterar Status">
                                        <i class="fas fa-edit"></i> Alterar Status
                                    </button>
                                ` : ''}
                                
                                ${isRegulada ? `
                                    <span class="status-visual status-autorizada">Regulada</span>
                                ` : ''}
                            </div>
                        </div>

                        ${isInternacao ? `
                            <p class="internacao-info-row">
                                <span class="status-visual internacao-visual status-internado">
                                    ${internacaoIconSVG} PACIENTE INTERNADO
                                </span>
                            </p>
                        ` : ''}
                        
                        <p class="fila-info">
                            <strong>Fila:</strong> ${formatValue(prioridade.fila)}
                            ${prioridade.caracterAtendimento ? `| <strong>Caráter:</strong> ${formatValue(prioridade.caracterAtendimento)}` : ''}
                        </p>
                        
                        <p class="data-emissao-info">
                            <strong>Data de emissão da guia:</strong> ${dataEmissao}
                        </p>

                        <div class="procedimentos-section">
                            <h4 style="cursor: pointer;" class="procedimentos-toggle-header">
                                <i class="fas fa-chevron-right toggle-icon"></i>
                                Procedimentos Solicitados:
                            </h4>
                            <ul class="procedimentos-list" style="display: none;">
                                <li class="procedimento-item-simples">
                                    <span>Informações de procedimentos disponíveis na consulta detalhada</span>
                                    <span class="procedimento-status status-em-analise">Consultar ECO</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Painel Lateral de Histórico -->
            <div class="prioridade-historico-panel">
                <div class="historico-header">
                    <span>Histórico de Prioridades</span>
                    <button class="btn fechar-historico icon-only" title="Fechar Histórico">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="historico-list" id="historico-list-${prioridade.id}">
                    <!-- O histórico será carregado dinamicamente -->
                    <div class="loading-historico">Carregando histórico...</div>
                </div>
            </div>
        </div>
    `;
    const cardInnerFlex = card.querySelector('.prioridade-card-inner-flex');
    const historicoPanel = card.querySelector('.prioridade-historico-panel');
    const historicoToggle = card.querySelector('.abrir-historico');
    const fecharButton = card.querySelector('.fechar-historico');
    const historicoList = card.querySelector(`#historico-list-${prioridade.id}`);

    let historicoCarregado = false;

    if (historicoToggle) {
        historicoToggle.addEventListener('click', async () => {
            cardInnerFlex.classList.add('show-historico');
            
            // Carrega o histórico apenas na primeira vez
            if (!historicoCarregado) {
                await carregarHistoricoPrioridade(prioridade.id, historicoList);
                historicoCarregado = true;
            }
        });
    }

    if (fecharButton) {
        fecharButton.addEventListener('click', () => {
            cardInnerFlex.classList.remove('show-historico');
        });
    }
    card.addEventListener('click', (e) => {
        if (cardInnerFlex.classList.contains('show-historico') && 
            !historicoPanel.contains(e.target) && 
            !historicoToggle.contains(e.target)) {
            cardInnerFlex.classList.remove('show-historico');
        }
    });
    // Event Listeners para funcionalidades
    if (prioridade.observacao) {
        card.querySelector('.observacao-btn').addEventListener('click', () => abrirModal(prioridade.observacao));
    }
    const btnRegular = card.querySelector('.regular-btn');
    if (btnRegular) {
        btnRegular.addEventListener('click', () => {
            console.log("DEBUG: Dados do Card Prioridade no clique 'Regular':", prioridade);

            // Usa o 'id' da prioridade para construir o link
            const guiaId = prioridade.idGuiaECO; 
            if (!guiaId) {
                alert(`Erro: O ID da guia ECO (esperado em 'idGuiaECO') não foi encontrado no registro. Verifique o console (F12) para os dados completos do card e o nome correto do campo.`);
                return;
            }
            
            let path;
            const isOpme = prioridade.tipoGuia?.toUpperCase().includes('SOLICITACAO_DE_OPME');

            if (isOpme) {
                path = '/regulacao/cotacao-opme/analise/detalhe-guia';
            } else {
                path = '/regulacao/guia/detalhe-guia';
            }

            const redirectUrl = `https://issec.maida.health${path}?id=${guiaId}`;
            
            window.open(redirectUrl, '_blank'); 
        });
    }

    // Alternar Status para guias SISWEB não reguladas
    const btnMarcar = card.querySelector('.marcar-regulada');
    if (btnMarcar) {
        btnMarcar.addEventListener('click', () => {
            document.body.appendChild(criarMenuStatus(prioridade, user));
        });
    }
    
    // Lógica de expansão dos procedimentos -  AO REGULACA.HTML
    const procedimentosToggleHeader = card.querySelector('.procedimentos-section h4'); 
    const procedimentosList = card.querySelector('.procedimentos-list');
    const toggleIcon = card.querySelector('.procedimentos-section .toggle-icon');

    if (procedimentosToggleHeader) {
        procedimentosToggleHeader.addEventListener('click', async () => {
            const isVisible = procedimentosList.style.display === 'block';
            const isLoaded = procedimentosList.dataset.loaded === 'true';

            if (isVisible) {
                // Fechar
                procedimentosList.style.display = 'none';
                toggleIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
            } else {
                // Abrir
                procedimentosList.style.display = 'block';
                toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');

                // Carregar dados se ainda não tiver carregado
                if (!isLoaded) {
                    const numeroGuia = prioridade.numeroGuia;
                    if (numeroGuia) {
                        await carregarProcedimentosECO(numeroGuia, procedimentosList);
                    } else {
                        procedimentosList.innerHTML = `<li class="procedimento-item-simples"><span>Guia sem número para consulta.</span></li>`;
                    }
                }
            }
        });
    }

    return card;
}

function getStatusStyles(statusDisplay) {
    if (!statusDisplay) return 'status-em-analise';
    
    const statusUpper = statusDisplay.toUpperCase();
    
    // ... (Mantenha o resto da sua lógica getStatusStyles) ...
    if (statusUpper.includes('AUTORIZADA') || statusUpper.includes('EXECUTADA') || statusUpper.includes('APROVAD')) {
        return 'status-autorizada';
    } else if (statusUpper.includes('NEGADA') || statusUpper.includes('CANCELADA')) {
        return 'status-negada';
    } else if (statusUpper.includes('DOCUMENTAÇÃO PENDENTE') || statusUpper.includes('EM_REANALISE') || statusUpper.includes('EM_ANALISE') || statusUpper.includes('PENDENTE') || statusUpper.includes('AGUARDANDO AUTENTICAÇÃO')) {
        return 'status-em-analise'; 
    } else {
        return 'status-em-analise'; // Padrão
    }
}

function formatarStatusItem(status) {
    const statusUpper = status?.toUpperCase() || 'PENDENTE';
    
    if (statusUpper === 'EM_ANALISE' || statusUpper === 'EM ANÁLISE') {
        return 'Em Análise';
    } else if (statusUpper === 'PENDENTE') {
        return 'Pendente';
    } else if (statusUpper === 'AUTORIZADA') {
        return 'Autorizada';
    } else if (statusUpper === 'EM_REANALISE') {
        return 'Em Reanálise';
    }
    return statusUpper.charAt(0) + statusUpper.slice(1).toLowerCase();
}


async function carregarProcedimentosECO(numeroGuia, listElement) {
    listElement.innerHTML = `<li class="loading-item procedimento-item-simples"><span>Carregando...</span></li>`;

    try {
        // Usa a rota de consulta do ECO que já está no seu backend
        const res = await fetch(`/api/eco/${numeroGuia}`); 
        
        if (!res.ok) throw new Error('Erro ao buscar guia no ECO');
        
        const data = await res.json();
        const guiaPrincipal = data.content && data.content.length > 0 ? data.content[0] : null;
        const itens = guiaPrincipal?.itensSolicitados || [];

        if (itens.length === 0) {
            listElement.innerHTML = `<li class="procedimento-item-simples"><span>Nenhum procedimento detalhado encontrado.</span></li>`;
            return;
        }

        const itensHtml = itens.map(item => {
            const statusItem = item.ultimaSituacao || item.status || 'EM ANALISE';
            const statusDisplayItem = formatarStatusItem(statusItem);
            const statusClass = getStatusStyles(statusItem);
            
            return `
                <li class="procedimento-item-simples">
                    <span>${item.descricao || 'Item sem descrição'} (${item.codigo || '-'})</span>
                    <span class="procedimento-status ${statusClass}">${statusDisplayItem}</span>
                </li>
            `;
        }).join('');

        listElement.innerHTML = itensHtml;
        listElement.dataset.loaded = 'true'; // Marca como carregado
        
    } catch (err) {
        console.error('Erro ao carregar procedimentos do ECO:', err);
        listElement.innerHTML = `<li class="procedimento-item-simples" style="color: var(--maida-rosa);">
                                    <span>Erro ao carregar. Verifique o console.</span>
                                </li>`;
    }
}




async function carregarHistoricoPrioridade(prioridadeId, container) {
    try {
        console.log(`Carregando histórico para prioridade ${prioridadeId}...`);
        
        const res = await fetch(`/api/regulador/historico/${prioridadeId}`, {
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Erro ao buscar histórico');
        
        const historico = await res.json();
        console.log(`Histórico recebido: ${historico.length} registros`);

        renderizarHistorico(historico, container);
        
    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        container.innerHTML = `<div class="error-historico">Erro ao carregar histórico: ${err.message}</div>`;
    }
}

function renderizarHistorico(historico, container) {
    if (!historico || historico.length === 0) {
        container.innerHTML = '<div class="no-historico">Nenhum registro de histórico encontrado.</div>';
        return;
    }

    const historicoHTML = historico.map(item => {
        return `
            <div class="historico-item">
                <div class="historico-header">
                    <div class="historico-usuario-info">
                        ${item.nomeSolicitante}
                    </div>
                    <div class="historico-data">
                        ${formatarDataHistorico(item.dataHora)}
                    </div>
                </div>
                
                <div class="historico-protocolo">
                    <strong>Protocolo SPG:</strong> 
                    <span class="protocolo-number">${item.protocolo}</span>
                </div>

                <div class="historico-regulador">
                    <strong>Regulador de Plantão:</strong> ${item.reguladorPlantao}
                </div>

                ${item.observacao ? `
                    <div class="historico-observacao">
                        <strong>Observação:</strong> ${item.observacao}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = historicoHTML;
}

// Mantenha a função de formatação de data
function formatarDataHistorico(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatarAcaoHistorico(acao) {
    const acoes = {
        'CRIACAO': 'Solicitação criada',
        'ATUALIZACAO': 'Atualização de dados',
        'STATUS_ALTERADO': 'Status alterado',
        'REGULADA': 'Guia marcada como regulada',
        'OBSERVACAO_ADD': 'Observação adicionada',
        'PRIORIDADE_ALTERADA': 'Prioridade alterada (manual)'
    };
    
    // Retorna a descrição amigável ou a ação bruta se não mapeada
    return acoes[acao] || acao;
}
function getStatusClass(status) {
    const statusUpper = status?.toUpperCase() || '';
    
    if (statusUpper.includes('AUTORIZADA') || statusUpper.includes('APROVAD') || statusUpper.includes('SEM RESTRIÇÃO')) {
        return 'status-autorizada'; // Verde
    } else if (statusUpper.includes('NEGADA') || statusUpper.includes('CANCELADA')) {
        return 'status-negada'; // Vermelho
    } else if (statusUpper.includes('PENDENTE') || statusUpper.includes('AGUARDANDO')) {
        return 'status-pendente'; // Amarelo
    } else {
        return 'status-em-analise'; // Azul (Padrão para análise)
    }
}

// ==============================================================
// FUNÇÃO PRINCIPAL DE CARREGAMENTO 
// ==============================================================

async function carregarPrioridades(user, view) {
    try {
        console.log(`Carregando ${view}...`);
        const endpoint = (view === 'pendentes') 
            ? '/api/regulador/pendentes/sincronizar'
            : `/api/regulador/${view}`; 
        console.log('Endpoint:', endpoint);
        const res = await fetch(endpoint, { credentials: 'include' });

        if (!res.ok) throw new Error('Erro ao buscar prioridades');
        const prioridades = await res.json();
        console.log(`Prioridades recebidas: ${prioridades.length}`);
        
        atualizarInterface(view, prioridades);

        const container = document.getElementById('cards-container');
        container.innerHTML = '';

        prioridades.forEach(prioridade => { 
            const card = renderizarCardPrioridade(prioridade, view, user);
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        alert('Erro ao carregar prioridades');
    }
}