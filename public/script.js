document.addEventListener('DOMContentLoaded', () => {

    const gruposDeFila = [ { name: "ISSEC", groupId: 52, queueIds: [514, 515] }, { name: "Plano de ação PLANSERV", groupId: 40, queueIds: [371, 250, 248, 249, 155, 157, 158, 325, 251, 276, 417] }, { name: "Planserv - Beneficiários", groupId: 34, queueIds: [248, 249, 276, 155, 251, 325, 157, 158, 274, 417] }, { name: "Planserv - Central de atendimento", groupId: 18, queueIds: [18, 157, 713, 325, 158, 274, 709, 714, 248, 249, 250, 251, 253, 256, 257, 258, 371, 417] }, { name: "Planserv geral", groupId: 25, queueIds: [25, 362, 367, 371, 275, 325, 155, 250, 257, 258, 157, 248, 249, 253, 254, 256, 274, 158, 276, 710, 713, 712, 714] }, { name: "PLANSERV IR", groupId: 36, queueIds: [36, 155] }, { name: "Planserv - Ouvidoria", groupId: 23, queueIds: [23, 252, 158] }, { name: "Planserv - Prestador", groupId: 35, queueIds: [35, 371, 250, 253, 254, 256, 257, 258, 712, 714, 709, 713, 710] }, { name: "Planserv - Remoções", groupId: 22, queueIds: [22, 274, 256] }, { name: "Sassepe - Central de Atendimento", groupId: 54, queueIds: [54, 357, 521, 522] }, { name: "Senado", groupId: 55, queueIds: [55, 528] }, { name: "INAS GDF SAÚDE", groupId: 41, queueIds: [41, 24, 25, 29, 31, 34, 35] }, { name: "SC SAÚDE - Central de atendimento", groupId: 48, queueIds: [48, 470, 471] } ];
    const LIMITES_DE_PAUSA = { 'Almoço': 3600, 'Pausa nr17 - 10min': 600, 'Pausa nr17 - 20min': 1200, 'Feedback': 300 };
    let estadoAtualDoPainel = {};
    let ultimasChamadas = {}
    let serverTimeOffset = 0;
    
    function calcularOffsetServidor(serverTime) {
        const serverTimeMs = new Date(serverTime).getTime();
        const clientTimeMs = Date.now();
        serverTimeOffset = serverTimeMs - clientTimeMs;
    }

    function getCurrentTime() {
        return Date.now() + serverTimeOffset;
    }
    function formatarDuracaoHHMMSS(totalSegundos) {
        if (totalSegundos === null || isNaN(totalSegundos) || totalSegundos < 0) 
            totalSegundos = 0;
        
        const h = Math.floor(totalSegundos / 3600);
        const m = Math.floor((totalSegundos % 3600) / 60);
        const s = Math.round(totalSegundos % 60);
        
        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    function formatarTempoIndicador(segundos) {
        if (segundos === null || isNaN(segundos) || segundos < 0) {
            segundos = 0;
        }
        
        const m = Math.floor(segundos / 60);
        const s = Math.round(segundos % 60);
        
        const pad = (num) => num.toString().padStart(2, '0');
        
        return `${pad(m)}:${pad(s)}`;
    }
    function formatarTempo(timestamp) {
        if (!timestamp) return '00:00:00';

        const inicio = new Date(timestamp).getTime();
        const agora = getCurrentTime();
        
        let segundos = Math.max(0, Math.round((agora - inicio) / 1000));
        return formatarDuracaoHHMMSS(segundos);
    }

    const updateTable = (tbodyId, items, renderRowFunc, getItemId) => { const tbody = document.getElementById(tbodyId); if (!tbody) return; const itemIds = new Set(items.map(getItemId)); Array.from(tbody.children).forEach(row => { if (!itemIds.has(row.id)) tbody.removeChild(row); }); items.forEach(item => { const rowId = getItemId(item); let row = document.getElementById(rowId); if (!row) { row = document.createElement('tr'); row.id = rowId; row.classList.add('row-enter'); tbody.appendChild(row); } renderRowFunc(row, item); }); };
    function renderRowEspera(row, c, filas) { 
        const agora = getCurrentTime(); 
        const inicio = new Date(c.start_time).getTime(); 
        const tempoTotalSegundos = (agora - inicio) / 1000; 
        row.classList.remove('vermelho', 'amarelo'); 
        if (tempoTotalSegundos >= 30) { 
            row.classList.add('vermelho'); 
        } else if (tempoTotalSegundos >= 25) { 
            row.classList.add('amarelo'); 
        } 
        const fila = filas[c.queue_id]; 
        const nomeFila = fila ? fila.name : 'N/A'; 
        row.innerHTML = `<td>${c.caller_number || 'Desconhecido'}</td><td>${nomeFila}</td><td>${formatarTempo(c.start_time)}</td>`; 
    }
    function renderRowAtivas(row, c, agentes, filas) { 
        const agente = agentes[c.agent_id]; 
        const fila = filas[c.queue_id]; 
        const agora = getCurrentTime(); 
        const inicio = new Date(c.answered_time).getTime();
        const tempoTotalSegundos = (agora - inicio) / 1000; 
        row.classList.remove('vermelho', 'amarelo'); 
        if (tempoTotalSegundos >= 300) { 
            row.classList.add('vermelho'); 
        } else if (tempoTotalSegundos >= 240) { 
            row.classList.add('amarelo'); 
        } 
        row.innerHTML = `<td><span class="info-operador">${agente ? agente.name : 'Desconhecido'}</span><span class="info-detalhe">${c.caller_number || 'N/A'}</span></td><td>${fila ? fila.name : 'N/A'}</td><td>${formatarTempo(c.answered_time)}</td>`; 
    }
    function renderRowPausados(row, a) { 
        const pausaInfo = a.pause; 
        row.innerHTML = `<td>${a.name}</td><td>${pausaInfo.reason || 'N/A'}</td><td>${formatarTempo(pausaInfo.pause_start)}</td>`; 
        const agora = getCurrentTime();
        const inicio = new Date(pausaInfo.pause_start).getTime();
        const tempoPausadoSegundos = (agora - inicio) / 1000; 
        const motivoDaPausa = pausaInfo.reason; 
        const limiteDaPausa = LIMITES_DE_PAUSA[motivoDaPausa]; 
        if (limiteDaPausa && tempoPausadoSegundos > limiteDaPausa) { 
            row.classList.add('vermelho'); 
        } else { 
            row.classList.remove('vermelho'); 
        } 
    }
    function renderRowLivres(row, a) { 
        const timestampUltimaChamada = ultimasChamadas[a.id]; 
        let ultimaChamadaDisplay = '--:--:--'; 
        let disponivelDisplay = '--:--:--'; 
        if (timestampUltimaChamada) { 
            const agora = getCurrentTime(); 
            const segundosDesdeUltima = Math.round((agora - timestampUltimaChamada) / 1000); 
            const duracaoFormatada = formatarDuracaoHHMMSS(segundosDesdeUltima); 
            ultimaChamadaDisplay = duracaoFormatada; 
        } 
        row.innerHTML = `<td>${a.name}</td><td>${a.position || 'N/A'}</td><td>${formatarTempo(a.login_start)}</td><td>${ultimaChamadaDisplay}</td>`; 
    }
    function renderRowIndisponiveis(row, a, filas) { const chamada = a.calls[0]; const filaDaChamada = filas[chamada.queue_id]; const nomeFila = filaDaChamada ? filaDaChamada.name : 'Desconhecida'; row.innerHTML = `<td>${a.name}</td><td>${nomeFila}</td><td>${formatarTempo(chamada.answered_time)}</td>`; }
    
    function renderizarPainel() {
        const grupoSelecionadoNome = document.getElementById("select-grupo").value;
        const data = estadoAtualDoPainel;
        if (!data.agents || !grupoSelecionadoNome) return;
        const todosAgentes = data.agents;
        const todasChamadas = data.calls ? Object.values(data.calls) : [];
        const todasFilas = data.queues || {};
        const grupoSelecionado = gruposDeFila.find(g => g.name === grupoSelecionadoNome);
        if (!grupoSelecionado) return;
        const idsDasFilasDoGrupo =
         new Set(grupoSelecionado.queueIds);
        let agentesDoGrupoIds = new Set();
        grupoSelecionado.queueIds.forEach(queueId => { if (todasFilas[queueId] && todasFilas[queueId].agent_ids) { todasFilas[queueId].agent_ids.forEach(agentId => agentesDoGrupoIds.add(String(agentId))); } });
        
        const chamadasEmEsperaDoGrupo = todasChamadas.filter(c => c.state === 'ringing' && idsDasFilasDoGrupo.has(c.queue_id));
        const chamadasAtivasDoGrupo = todasChamadas.filter(c => c.state === 'talking' && idsDasFilasDoGrupo.has(c.queue_id));
        const agentesEmChamadaNoGrupoIds = new Set(chamadasAtivasDoGrupo.map(c => String(c.agent_id)));
        
        const operadoresPausados = [];
        const operadoresIndisponiveis = [];
        let operadoresLivres = [];
        agentesDoGrupoIds.forEach(agentId => {
            const agente = todosAgentes[agentId];
            if (!agente || !agente.logged) return;
            if (agentesEmChamadaNoGrupoIds.has(String(agente.id))) {}
            else if (agente.pause && Object.keys(agente.pause).length > 0) { operadoresPausados.push(agente); }
            else if (agente.calls && agente.calls.length > 0) { operadoresIndisponiveis.push(agente); }
            else { operadoresLivres.push(agente); }
        });

        chamadasEmEsperaDoGrupo.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        chamadasAtivasDoGrupo.sort((a, b) => new Date(a.answered_time) - new Date(b.answered_time));
        operadoresPausados.sort((a, b) => new Date(a.pause.pause_start).getTime() - new Date(b.pause.pause_start).getTime());
        operadoresIndisponiveis.sort((a, b) => new Date(a.calls[0].answered_time) - new Date(b.calls[0].answered_time));

        console.log("Conteúdo de 'ultimasChamadas' neste render:", ultimasChamadas);

    operadoresLivres.sort((a, b) => {
        const timeA = ultimasChamadas[a.id] || 0;
        const timeB = ultimasChamadas[b.id] || 0;

        const aNaoAtendeu = timeA === 0;
        const bNaoAtendeu = timeB === 0;

        if (aNaoAtendeu && !bNaoAtendeu) {
            return -1; 
        }

        if (!aNaoAtendeu && bNaoAtendeu) {
            return 1; 
        }

        if (!aNaoAtendeu && !bNaoAtendeu) {

            return timeA - timeB;
        }

        return 0;
    });

        document.getElementById('qtd-espera').innerText = chamadasEmEsperaDoGrupo.length;
        document.getElementById('qtd-ativas').innerText = chamadasAtivasDoGrupo.length;
        document.getElementById('qtd-pausados').innerText = operadoresPausados.length;
        document.getElementById('qtd-livres').innerText = operadoresLivres.length;
        const qtdIndisponiveisEl = document.getElementById('qtd-indisponiveis');
        if (qtdIndisponiveisEl) { qtdIndisponiveisEl.innerText = operadoresIndisponiveis.length; }

        updateTable('tabela-espera', chamadasEmEsperaDoGrupo, (row, c) => renderRowEspera(row, c, todasFilas), c => `call-${c.uuid}`);
        updateTable('tabela-ativas', chamadasAtivasDoGrupo, (row, c) => renderRowAtivas(row, c, todosAgentes, todasFilas), c => `call-${c.uuid}`);
        updateTable('tabela-pausados', operadoresPausados, renderRowPausados, a => `agent-${a.id}`);
        updateTable('tabela-livres', operadoresLivres, renderRowLivres, a => `agent-${a.id}`);
        updateTable('tabela-indisponiveis', operadoresIndisponiveis, (row, a) => renderRowIndisponiveis(row, a, todasFilas), a => `agent-${a.id}`);
    }
    function popularGrupos() { const select = document.getElementById("select-grupo"); select.innerHTML = ''; gruposDeFila.forEach(grupo => { const option = document.createElement("option"); option.value = grupo.name; option.innerText = grupo.name; select.appendChild(option); }); }
    function salvarPreferencias() { const checkboxes = document.querySelectorAll('#settings-dropdown input[type="checkbox"]'); const preferencias = {}; checkboxes.forEach(cb => { preferencias[cb.dataset.cardId] = cb.checked; }); localStorage.setItem('preferenciasVisibilidadePainel', JSON.stringify(preferencias)); }
    
    function reposicionarCardsDinamicamente() {
        const cards = {
            'card-espera': document.getElementById('card-espera'),
            'card-ativas': document.getElementById('card-ativas'),
            'card-pausados': document.getElementById('card-pausados'),
            'card-livres': document.getElementById('card-livres'),
            'card-indisponiveis': document.getElementById('card-indisponiveis')
        };
        
        Object.values(cards).forEach(card => {
            if (card) {
                card.style.gridArea = '';
                card.style.gridColumn = '';
                card.style.gridRow = '';
            }
        });
        
        const esperaOculto = cards['card-espera'].classList.contains('card-hidden');
        const ativasOculto = cards['card-ativas'].classList.contains('card-hidden');
        const pausadosOculto = cards['card-pausados'].classList.contains('card-hidden');
        
        if (!esperaOculto && ativasOculto && !pausadosOculto) {
            cards['card-pausados'].style.gridArea = 'ativas';
            cards['card-livres'].style.gridArea = 'pausados';
            cards['card-indisponiveis'].style.gridArea = 'livres';
        }
        else if (esperaOculto && !ativasOculto && !pausadosOculto) {
            cards['card-ativas'].style.gridArea = 'espera';
            cards['card-pausados'].style.gridArea = 'ativas';
            cards['card-livres'].style.gridArea = 'pausados';
            cards['card-indisponiveis'].style.gridArea = 'livres';
        }
        else if (esperaOculto && ativasOculto && !pausadosOculto) {
            cards['card-pausados'].style.gridArea = 'espera';
            cards['card-livres'].style.gridArea = 'ativas';
            cards['card-indisponiveis'].style.gridArea = 'pausados';
        }
        else if (!esperaOculto && ativasOculto && pausadosOculto) {
            cards['card-livres'].style.gridArea = 'ativas';
            cards['card-indisponiveis'].style.gridArea = 'pausados'; 
        }
        else if (!esperaOculto && !ativasOculto && pausadosOculto) {
            cards['card-livres'].style.gridArea = 'pausados';
            cards['card-indisponiveis'].style.gridArea = 'livres';
        }
        else if (pausadosOculto && 
                cards['card-livres'].classList.contains('card-hidden') && 
                cards['card-indisponiveis'].classList.contains('card-hidden')) {
            if (!esperaOculto) cards['card-espera'].style.gridRow = 'span 1';
            if (!ativasOculto) cards['card-ativas'].style.gridRow = 'span 1';
        }
    }
      
    function forceReflow(element) {
        void element.offsetHeight;
    }

    function ajustarLayoutDoPainel() {
        reposicionarCardsDinamicamente();
    }

    function aplicarPreferencias() { 
        const checkboxes = document.querySelectorAll('#settings-dropdown input[type="checkbox"]'); 
        const preferenciasSalvas = JSON.parse(localStorage.getItem('preferenciasVisibilidadePainel')); 
        if (preferenciasSalvas) { 
            checkboxes.forEach(cb => { 
                const cardId = cb.dataset.cardId; 
                const isChecked = preferenciasSalvas[cardId] !== false; 
                cb.checked = isChecked; 
                const cardElement = document.getElementById(cardId); 
                if (cardElement) { 
                    cardElement.classList.toggle('card-hidden', !isChecked); 
                } 
            }); 
        }
        
        setTimeout(() => {
            reposicionarCardsDinamicamente();
            
            const painel = document.querySelector('.painel');
            forceReflow(painel);
        }, 50);
    }
    async function buscarDadosGerais() {
        try {
            const response = await fetch(`/api/painel/filas`);
            if (!response.ok) { estadoAtualDoPainel = {}; return; }
            const responseData = await response.json();
            estadoAtualDoPainel = responseData.dados || {};

            if (estadoAtualDoPainel.server_time) {
                calcularOffsetServidor(estadoAtualDoPainel.server_time);
            } else {
                
                console.warn('Server time não disponível, usando tempo local');
                serverTimeOffset = 0;
            }

        } catch (error) {
            console.error('Erro de rede ao buscar dados:', error);
            estadoAtualDoPainel = {};
        }
    }
        

    async function buscarUltimasChamadas() { 
        const grupoSelecionado = document.getElementById("select-grupo").value; 
        if (!grupoSelecionado) return; 
        try { 
            const response = await fetch(`/api/painel/ultimas-chamadas?grupo=${encodeURIComponent(grupoSelecionado)}`); 
            if (!response.ok) { ultimasChamadas = {}; return; } 
            ultimasChamadas = await response.json(); 
            
            Object.keys(ultimasChamadas).forEach(agentId => {
                if (ultimasChamadas[agentId] < 1000000000000) { 
                    ultimasChamadas[agentId] = ultimasChamadas[agentId] * 1000;
                }
            });
        } catch (error) { 
            console.error('Erro ao buscar últimas chamadas:', error); 
            ultimasChamadas = {}; 
        } 
    }
    async function carregarTmaTme() {
        const grupoSelecionado = document.getElementById("select-grupo").value;
        if (!grupoSelecionado) return;
        try {
            const response = await fetch(`/api/painel/indicadores/tma-tme?grupo=${encodeURIComponent(grupoSelecionado)}`);
            if (!response.ok) throw new Error(`Falha ao buscar TMA/TME`);
            const indicadores = await response.json();
            if (indicadores) {
                document.getElementById('indicador-tma').innerText = formatarTempoIndicador(indicadores.tma);
                document.getElementById('indicador-tme').innerText = formatarTempoIndicador(indicadores.tme);
            }
        } catch (error) {
            console.error("Erro ao carregar TMA/TME:", error);
            document.getElementById('indicador-tma').innerText = 'Erro';
            document.getElementById('indicador-tme').innerText = 'Erro';
        }
    }
    async function carregarAbandonoDia() {
        const grupoSelecionado = document.getElementById("select-grupo").value;
        if (!grupoSelecionado) return;
        try {
            const response = await fetch(`/api/painel/indicadores/abandono-dia?grupo=${encodeURIComponent(grupoSelecionado)}`);
            if (!response.ok) throw new Error(`Falha ao buscar abandono do dia`);
            const indicadores = await response.json();
            if (indicadores) {
                const taxaAcumulada = parseFloat(indicadores.abandono_dia_acumulado || 0);
                document.getElementById('indicador-abandono-principal').innerText = `${taxaAcumulada.toFixed(2)}%`;
            }
        } catch (error) {
            console.error("Erro ao carregar abandono do dia:", error);
            document.getElementById('indicador-abandono-principal').innerText = 'Erro';
        }
    }

    async function carregarVariacaoAbandono() {
        const grupoSelecionado = document.getElementById("select-grupo").value;
        if (!grupoSelecionado) return;
        try {
            const response = await fetch(`/api/painel/indicadores/variacao?grupo=${encodeURIComponent(grupoSelecionado)}`);
            if (!response.ok) throw new Error(`Falha ao buscar variação do abandono`);
            const indicadores = await response.json();
            if (indicadores) {
                const taxaAcumulada = parseFloat(indicadores.abandono_dia_acumulado || 0);
                const taxaInicioDaHora = parseFloat(indicadores.abandono_inicio_hora || 0);
                const variacao = taxaAcumulada - taxaInicioDaHora;
                const variacaoEl = document.getElementById('indicador-abandono-variacao');
                if (variacao > 0.005) {
                    variacaoEl.innerHTML = `↑ +${variacao.toFixed(2)}%`;
                    variacaoEl.className = 'variacao subiu';
                } else if (variacao < -0.005) {
                    variacaoEl.innerHTML = `↓ ${variacao.toFixed(2)}%`;
                    variacaoEl.className = 'variacao desceu';
                } else {
                    variacaoEl.innerHTML = '—';
                    variacaoEl.className = 'variacao';
                }
            }
        } catch (error) {
            console.error("Erro ao carregar variação do abandono:", error);
        }
    }
    
    async function sequenciaDeCargaCompleta() {
        await buscarDadosGerais();
        const grupoSelecionado = document.getElementById("select-grupo").value;
        if (grupoSelecionado) {
            await Promise.all([
                carregarTmaTme(),
                carregarAbandonoDia(),
                carregarVariacaoAbandono(),
                buscarUltimasChamadas()
            ]);
        }
        renderizarPainel();
        reposicionarCardsDinamicamente();
    }

    function iniciarPainel() {
        popularGrupos();
        sequenciaDeCargaCompleta();
        setInterval(buscarDadosGerais, 3000);
        
        let lastUpdate = 0;
        function animarContadores(timestamp) {
            if (timestamp - lastUpdate > 1000) {
                renderizarPainel();
                lastUpdate = timestamp;
            }
            requestAnimationFrame(animarContadores);
        }
        requestAnimationFrame(animarContadores);
        
        setInterval(() => {
            buscarUltimasChamadas();
            carregarTmaTme();
        }, 10000);
        
        setInterval(() => {
            carregarAbandonoDia();
        }, 30000);
        
        setInterval(() => {
            carregarVariacaoAbandono();
        }, 300000);
    }

    iniciarPainel();
    
    const settingsButton = document.getElementById('settings-button'); const settingsDropdown = document.getElementById('settings-dropdown'); const settingsContainer = document.querySelector('.settings-container');
    settingsButton.addEventListener('click', (event) => { event.stopPropagation(); settingsContainer.classList.toggle('active'); });
    document.addEventListener('click', () => { if (settingsContainer.classList.contains('active')) { settingsContainer.classList.remove('active'); } });
    settingsDropdown.addEventListener('click', (event) => { event.stopPropagation(); });
    const checkboxes = document.querySelectorAll('#settings-dropdown input[type="checkbox"]');
    checkboxes.forEach(cb => { 
        cb.addEventListener('change', () => { 
            const cardId = cb.dataset.cardId; 
            const cardElement = document.getElementById(cardId); 
            if (cardElement) { 
                cardElement.classList.toggle('card-hidden', !cb.checked); 
                salvarPreferencias(); 
                reposicionarCardsDinamicamente();
            } 
        }); 
    });
    
    document.getElementById("select-grupo").addEventListener("change", () => {
        renderizarPainel();
        carregarTmaTme();
        carregarAbandonoDia();
        carregarVariacaoAbandono();
        buscarUltimasChamadas();
    });

    window.addEventListener('resize', ajustarLayoutDoPainel);
    aplicarPreferencias();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                setTimeout(reposicionarCardsDinamicamente, 10);
            }
        });
    });
    document.querySelectorAll('.card').forEach(card => {
        observer.observe(card, { attributes: true });
    });
});