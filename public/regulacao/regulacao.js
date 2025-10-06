document.addEventListener('DOMContentLoaded', async () => { 
    
    // Tabs (sem alterações)
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Lógica unificada para gerenciamento de abas
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            const target = tab.dataset.tab;
            document.getElementById(`${target}-content`).classList.add('active');
        });
    });

    const ecoForm = document.getElementById('eco-form');
    const ecoPrioridadeContainer = document.getElementById('eco-prioridade-form'); 
    let guiaSelecionado = null;

    ecoForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const ecoGuiaInput = document.getElementById('eco-guia');
        const numeroGuia = ecoGuiaInput.value.trim();

        if (!numeroGuia) {
            exibirErro('Por favor, insira o número da guia.');
            return;
        }

        limparErro();
        ecoPrioridadeContainer.style.display = 'none';

        try {
            // 1. BUSCAR A GUIA (Chamada da API) - FIXED: Added hyphen in 'consulta-detalhada'
            const res = await fetch(`/api/prioridades/consulta-detalhada/${numeroGuia}`, {
                credentials: 'include'
            });
            
            // Tratamento 404: Guia não encontrada no ECO
            if (res.status === 404) {
                exibirErro('Guia não encontrada no ECO. Verifique o número e tente novamente.');
                return;
            }

            // Tratamento de ERRO GERAL (500, 400, etc.)
            if (!res.ok) {
                let errorData;
                try {
                    errorData = await res.json();
                } catch (jsonErr) {
                    // If not JSON, read as text and provide a generic message
                    const errorText = await res.text();
                    console.error('Non-JSON response from server:', errorText);
                    throw new Error(`Server returned an unexpected error. Status: ${res.status}. Response starts with: ${errorText.substring(0, 100)}...`);
                }
                throw new Error(errorData.message || 'Erro ao buscar dados da guia.');
            }

            // Tratamento 200 OK
            const data = await res.json(); 
            guiaSelecionado = data; 
            
            const statusAtual = verificarStatusGuia(data.statusRegulacao); 
            
            // 2. RENDERIZAR O CARD DE DETALHES/ENVIO
            const cardHtml = renderizarCardDetalhes(
                data, 
                statusAtual.statusDisplay, 
                !statusAtual.invalido, 
                statusAtual
            ); 
            
            ecoPrioridadeContainer.innerHTML = cardHtml;
            ecoPrioridadeContainer.style.display = 'block';

            // 3. ANEXAR LISTENER AO BOTÃO DE ENVIO DE PRIORIDADE
            const accordionHeaders = ecoPrioridadeContainer.querySelectorAll('.accordion-header');
            accordionHeaders.forEach(header => {
                header.addEventListener('click', () => toggleAccordion(header));
            });

            // 3. ANEXAR LISTENER AO BOTÃO DE ENVIO DE PRIORIDADE
            const novoEnviarPrioridadeBtn = document.getElementById('eco-enviar-prioridade');
            if (novoEnviarPrioridadeBtn) {
                novoEnviarPrioridadeBtn.addEventListener('click', enviarPrioridadeHandler);
            }

        } catch (error) {
            console.error('Erro na busca da guia:', error);
            exibirErro(error.message);
            ecoPrioridadeContainer.style.display = 'none';
        }
    });


    function exibirErro(mensagem) {
        const ecoContent = document.getElementById('eco-content');
        let erroDiv = document.getElementById('eco-erro');
        if (!erroDiv) {
            erroDiv = document.createElement('div');
            erroDiv.id = 'eco-erro';
            erroDiv.style.color = 'red';
            erroDiv.style.marginTop = '10px';
            erroDiv.style.padding = '10px';
            erroDiv.style.backgroundColor = '#ffe6e6';
            erroDiv.style.borderRadius = '5px';
            ecoContent.appendChild(erroDiv);
        }
        erroDiv.textContent = mensagem; 
    }
    
    function limparErro() {
        const erroDiv = document.getElementById('eco-erro');
        if (erroDiv) {
            erroDiv.remove();
        }
    }
    
    function verificarStatusGuia(status) {
        const statusUpperCase = status?.toUpperCase() || '';
        
        const statusBloqueadores = [
            'AUTORIZADA', 
            'CAPTURADA', 
            'NEGADA', 
            'CANCELADA', 
            'EXECUTADA', 
            'AGUARDANDO_DOCUMENTACAO_PRESTADOR'
        ];
        
        const invalido = statusBloqueadores.includes(statusUpperCase);
        
        let statusDisplay = status || 'EM ANÁLISE'; // Valor padrão para exibição
        
        if (statusUpperCase === 'AGUARDANDO_DOCUMENTACAO_PRESTADOR') {
            statusDisplay = 'Documentação pendente';
        } else if (statusUpperCase === 'EM_REANALISE') {
            statusDisplay = 'Em Reanálise';
        } else if (statusUpperCase === 'EM_ANALISE') {
            statusDisplay = 'Em Análise';
        } 
        
        return {
            invalido: invalido,
            motivo: invalido ? `Status "${statusDisplay}" não permite envio para prioridade` : '',
            statusDisplay: statusDisplay
        };
    }

    function getStatusStyles(statusDisplay) {
        const statusUpper = statusDisplay.toUpperCase();
        
        if (statusUpper.includes('AUTORIZADA') || statusUpper.includes('EXECUTADA')) {
            return 'status-autorizada';
        } else if (statusUpper.includes('NEGADA') || statusUpper.includes('CANCELADA')) {
            return 'status-negada';
        } else if (statusUpper.includes('DOCUMENTAÇÃO PENDENTE') || statusUpper.includes('EM_REANALISE') || statusUpper.includes('EM_ANALISE')) {
            return 'status-em-analise';
        } else if (statusUpper.includes('PENDENTE')) {
            return 'status-pendente';
        } else {
            return 'status-em-analise'; 
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
        }
        return statusUpper.charAt(0) + statusUpper.slice(1).toLowerCase();
    }
    function renderizarCardDetalhes(guia, statusDisplay, permitirEnvio, statusInfo, mostrarElementosEnvio = true) {
        const statusClass = getStatusStyles(statusDisplay);
        
        let tipoGuiaDisplay = guia.tipoDeGuia ? guia.tipoDeGuia.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : 'Guia Desconhecida';
        if (tipoGuiaDisplay === 'Solicitacao De Opme') {
            tipoGuiaDisplay = 'Anexo OPME';
        } else if (tipoGuiaDisplay === 'Sp/sadt') {
            tipoGuiaDisplay = 'SP/SADT';
        } else if (tipoGuiaDisplay === 'Internacao Eletiva') {
            tipoGuiaDisplay = 'Internação Eletiva';
        }
        
        const dataDate = guia.dataHoraSolicitacao ? new Date(guia.dataHoraSolicitacao) : null;
        const dataEmissao = dataDate && !isNaN(dataDate.getTime()) ? dataDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
        
        // SLA de vencimento para a Linha 2
        const dataVencimentoSla = guia.dataVencimentoSla ? new Date(guia.dataVencimentoSla) : null;
        const slaTooltip = dataVencimentoSla && !isNaN(dataVencimentoSla.getTime()) 
            ? dataVencimentoSla.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Não informado';
        const slaContador = formatarTempoRestante(guia.dataVencimentoSla);
        
        const qtdPrioridades = guia.quantidadeSolicitacoes || 0; 
        
        const internacaoIconSVG = `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                width="400.000000pt" height="550.000000pt" viewBox="0 0 400.000000 550.000000"
                preserveAspectRatio="xMidYMid meet">
                <defs>
                    <style>
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

        // Elementos de envio (textarea e botão) - só mostram se mostrarElementosEnvio for true
        const elementosEnvio = mostrarElementosEnvio ? `
            <textarea id="eco-observacao" placeholder="Observações (opcional)"></textarea>
            
            <button 
                id="eco-enviar-prioridade" 
                type="button" 
                title="${permitirEnvio ? 'Enviar para prioridade' : statusInfo.motivo}"
                ${!permitirEnvio ? 'disabled' : ''}
            >
                Enviar para Prioridade
            </button>
        ` : '';

        const cardHtml = `
            <h3>Detalhes da Guia</h3>
            <div class="card-guia-container">
                
                <div class="detalhes-header novo-header">
                    <span class="detalhes-tipo-guia">Guia de ${tipoGuiaDisplay} - Nº Guia: ${guia.autorizacaoGuia || guia.numeroGuia || '-'}</span>
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
                
                    <p class="beneficiario-info">
                        <strong>Beneficiário:</strong> ${guia.beneficiario || '-'} 
                        | <strong>CPF:</strong> ${guia.cpfBeneficiario || '-'} 
                        | <strong>Cartão:</strong> ${guia.cartaoBeneficiario || '-'}
                    </p>

                    ${guia.pacienteInternado ? `
                        <p class="internacao-info-row">
                            <span class="status-visual internacao-visual status-internado">
                                ${internacaoIconSVG} PACIENTE INTERNADO
                            </span>
                        </p>
                    ` : ''}
                    <p class="fila-info">
                        <strong>Fila:</strong> ${guia.fila || 'Não Informada'}
                    </p>
                    
                    <p class="data-emissao-info">
                        <strong>Data de emissão da guia:</strong> ${dataEmissao}
                    </p>

                    <div class="procedimentos-section">
                        <h4 class="accordion-header" id="procedimentos-toggle-header" style="cursor: pointer;">
                            <i class="fas fa-chevron-right toggle-icon" id="procedimentos-main-toggle"></i>
                            Procedimentos Solicitados:
                        </h4>
                        <ul id="procedimentos-list" style="display: none;"> 
                            ${guia.itensSolicitados && guia.itensSolicitados.length > 0 ? 
                                guia.itensSolicitados.map((item, index) => {
                                    const statusItem = item.ultimaSituacao || item.status;
                                    const statusDisplayItem = formatarStatusItem(statusItem);
                                    const statusClass = statusDisplayItem.toLowerCase().replace(' ', '-');
                                    
                                    return `
                                        <li class="procedimento-item-simples">
                                            <span>${item.descricao || 'Item sem descrição'} (${item.codigo || '-'})</span>
                                            <span class="procedimento-status status-${statusClass}">${statusDisplayItem}</span>
                                        </li>
                                    `;
                                }).join('') : 
                                '<li>Nenhum procedimento encontrado.</li>'
                            }
                        </ul>
                    </div>
                </div>
            </div>
            
            ${elementosEnvio}
        `;

        return cardHtml;
    }


    function renderizarCardConsulta(dados) {
        const guiaMock = {
            autorizacaoGuia: dados.numeroGuia,
            numeroGuia: dados.numeroGuia,
            tipoDeGuia: dados.tipoGuia || 'Consulta',
            statusRegulacao: dados.status,
            beneficiario: dados.beneficiario,
            cpfBeneficiario: dados.cpfBeneficiario,
            cartaoBeneficiario: dados.cartaoBeneficiario,
            pacienteInternado: false, 
            fila: dados.fila,
            dataHoraSolicitacao: dados.dataCriacao, 
            dataVencimentoSla: dados.dataVencimentoSla,
            quantidadeSolicitacoes: dados.quantidade,
            itensSolicitados: [] // Array vazio pois consulta não tem procedimentos
        };
        
        const statusInfo = verificarStatusGuia(dados.status);
        
        // Chamar com mostrarElementosEnvio = false para a aba de consulta
        return renderizarCardDetalhes(guiaMock, statusInfo.statusDisplay, false, statusInfo, false);
    }
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
    // Enviar prioridade ECO (Handler de Envio)
    async function enviarPrioridadeHandler(e) {
        e.preventDefault();
        
        const currentEnviarBtn = document.getElementById('eco-enviar-prioridade');
        if (currentEnviarBtn.disabled) return;
        if (!guiaSelecionado) {
            mostrarNotificacao('Nenhuma guia selecionada', 'erro');
            return;
        }

        const statusGuia = guiaSelecionado.statusRegulacao || '';
        const statusInfo = verificarStatusGuia(statusGuia);
        
        if (statusInfo.invalido) {
            mostrarNotificacao(statusInfo.motivo, 'erro');
            return;
        }

        currentEnviarBtn.disabled = true;    

        // 1. Montar dados
        const observacao = document.getElementById('eco-observacao').value || '';
        const dadosEnvio = {
            numeroGuia: guiaSelecionado.autorizacaoGuia,
            tipoGuia: guiaSelecionado.tipoDeGuia || 'DESCONHECIDO',
            status: guiaSelecionado.statusRegulacao || 'PENDENTE',
            caracterAtendimento: guiaSelecionado.fila || 'SP',
            observacao: observacao,
            produtoId: guiaSelecionado.produtoId || 1, // Garantir que produtoId seja incluído
            beneficiario: guiaSelecionado.beneficiario || '',
            beneficiarioNomeSocial: guiaSelecionado.beneficiarioNomeSocial || '',
            cartaoBeneficiario: guiaSelecionado.cartaoBeneficiario || '',
            cpfBeneficiario: guiaSelecionado.cpfBeneficiario || '',
            dataHoraSolicitacao: guiaSelecionado.dataHoraSolicitacao || null,
            dataSolicitacao: guiaSelecionado.dataSolicitacao || null,
            dataVencimentoSla: guiaSelecionado.dataVencimentoSla || null,
            fila: guiaSelecionado.fila || '',
            atrasada: guiaSelecionado.atrasada || false,
            atrasoRegulacao: guiaSelecionado.atrasoRegulacao || '',
            area: guiaSelecionado.area || '',
            fonte: 'ECO',
            idGuiaECO: guiaSelecionado.idGuia
        };

        let protocoloGerado;

        try {
            // 2. CHAMA A ROTA NO BACKEND PARA GERAR O PROTOCOLO
            let res = await fetch('/api/prioridades/protocolo', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            let data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Erro ao gerar protocolo no servidor.');
            }

            protocoloGerado = data.protocolo;
            dadosEnvio.protocoloSPG = protocoloGerado; // ADICIONA O PROTOCOLO AO OBJETO DE ENVIO

            // 3. FAZ O POST FINAL PARA SALVAR NO BANCO DE DADOS
            res = await fetch('/api/prioridades', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(dadosEnvio) 
            });
            
            data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Erro ao processar prioridade.');
            }

           const qtdPrioridades = (guiaSelecionado.quantidadeSolicitacoes || 0) + 1;
            const statusInfo = verificarStatusGuia(dadosEnvio.status);
            const statusClass = getStatusStyles(statusInfo.statusDisplay); // Reutiliza a função
            
            // Formatando Data e SLA
            const dataEmissaoDate = dadosEnvio.dataSolicitacao ? new Date(dadosEnvio.dataSolicitacao) : new Date();
            const dataEmissao = dataEmissaoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const slaContador = formatarTempoRestante(dadosEnvio.dataVencimentoSla);
            const slaTooltip = dadosEnvio.dataVencimentoSla ? new Date(dadosEnvio.dataVencimentoSla).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Não informado';


            // Preenchimento dos campos do modal
            
            // 1. HEADER (Guia + Tipo)
            document.getElementById('modal-guia-tipo-numero').textContent = `${dadosEnvio.tipoGuia.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - Nº Guia: ${dadosEnvio.numeroGuia}`;
            document.getElementById('modal-contador-solicitacoes').textContent = `Solicitado Prioridade ${qtdPrioridades}x`;
            
            // 2. STATUS / SLA (Injeta o HTML completo com as classes)
            document.getElementById('modal-status-sla-row').innerHTML = `
                <span class="status-visual ${statusClass}">${statusInfo.statusDisplay}</span>
                <span 
                    class="status-visual status-sla-visual sla-info" 
                    title="SLA: ${slaTooltip}"
                >
                    <i class="far fa-clock"></i> ${slaContador}
                </span> 
                `;

            // 3. BENEFICIÁRIO, FILA E DATA
            document.getElementById('modal-beneficiario').textContent = dadosEnvio.beneficiario;
            document.getElementById('modal-cpf').textContent = dadosEnvio.cpfBeneficiario;
            document.getElementById('modal-cartao').textContent = dadosEnvio.cartaoBeneficiario;

            document.getElementById('modal-fila').textContent = dadosEnvio.fila;
            document.getElementById('modal-data-emissao').textContent = dataEmissao;
            
            document.getElementById('modal-protocolo-numero').textContent = protocoloGerado;
            
            modalProtocolo.style.display = 'block';
            // Limpeza após sucesso
            ecoForm.reset();
            ecoPrioridadeContainer.style.display = 'none';
            limparErro(); 
            guiaSelecionado = null;
            
        } catch (err) {
            console.error(err);
            mostrarNotificacao(`Falha no Envio: ${err.message}`, 'erro');    
            
        } finally {
            currentEnviarBtn.disabled = false; // Reabilita o botão principal
        }
    }

    // SISWEB: enviar prioridade manual
    const siswebForm = document.getElementById('sisweb-form');
    siswebForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const statusGuia = document.getElementById('sisweb-status').value;
        const statusInfo = verificarStatusGuia(statusGuia);
        
        if (statusInfo.invalido) {
            alert(statusInfo.motivo);
            return;
        }

        const data = {
            numeroGuia: document.getElementById('sisweb-numero-guia').value,
            tipoGuia: document.getElementById('sisweb-tipo-guia').value,
            status: statusGuia,
            caracterAtendimento: document.getElementById('sisweb-carater').value,
            observacao: document.getElementById('sisweb-observacao').value,
            beneficiario: document.getElementById('sisweb-nome').value || '',
            produtoId: 1, 
            fila: document.getElementById('sisweb-carater').value,
            fonte: 'SISWEB'
        };

        try {
            const res = await fetch(`/api/prioridades/consultadetalhada/${numeroGuia}`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Erro ao enviar prioridade');
            }

            alert('Prioridade SISWEB registrada com sucesso!');
            siswebForm.reset();
        } catch (err) {
            console.error(err);
            alert(`Erro ao registrar prioridade SISWEB: ${err.message}`);
        }
    });
     const consultaForm = document.getElementById('consulta-form');
    const consultaResultados = document.getElementById('consulta-resultados');

    consultaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const numeroGuia = document.getElementById('consulta-guia').value;
        consultaResultados.innerHTML = ''; 

        if (!numeroGuia) {
            mostrarNotificacao('Por favor, digite o número da guia.', 'erro');
            return;
        }

        try {
            const res = await fetch(`/api/prioridades/consulta/${numeroGuia}`, { credentials: 'include' });
            if (res.status === 404) {
                consultaResultados.innerHTML = `<p class="consulta-info">Nenhuma prioridade encontrada para esta guia.</p>`;
                return;
            }

            if (!res.ok) {
                throw new Error('Erro ao buscar a prioridade. Verifique o número da guia e tente novamente.');
            }

            const data = await res.json();
            
            const formatarData = (dataISO) => {
                if (!dataISO) return 'Não informado';
                const data = new Date(dataISO);
                return data.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };

            consultaResultados.innerHTML = `
                <div class="resultado-item">
                    <h4>Status da Guia ${data.numeroGuia || '-'}</h4>
                    <div class="detalhes-grid">
                        <p><strong>Status:</strong> <span class="status-${(data.status || 'pendente').toLowerCase()}">${data.status || 'Pendente'}</span></p>
                        <p><strong>Fonte:</strong> ${data.fonte || '-'}</p>
                        <p><strong>Criado em:</strong> ${formatarData(data.dataCriacao)}</p>
                        <p><strong>Atualizado em:</strong> ${formatarData(data.dataAtualizacao)}</p>
                        ${data.quantidade > 1 ? `<p><strong>Quantidade de solicitações:</strong> ${data.quantidade}</p>` : ''}
                    </div>
                    ${data.observacao ? `
                        <div class="observacao-section">
                            <strong>Observações:</strong>
                            <p>${data.observacao}</p>
                        </div>
                    ` : ''}
                </div>
            `;

        } catch (err) {
            console.error('Erro na consulta:', err);
            consultaResultados.innerHTML = `<p class="consulta-erro">${err.message}</p>`;
        }
    });

    function toggleAccordion(header) {
        const content = header.nextElementSibling;
        if (!content) {
            console.error('Conteúdo do accordion não encontrado!');
            return;
        }
        const isOpen = content.style.display === 'block';
        
        // Altera o display do conteúdo
        content.style.display = isOpen ? 'none' : 'block';
        
        header.classList.toggle('active', !isOpen);
        
        // Rotaciona o ícone usando as classes fa-chevron-right/fa-chevron-down
        const toggleIcon = header.querySelector('.toggle-icon');
        if (toggleIcon) {
            if (!isOpen) {
                // Se estava fechado e vai abrir
                toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');
            } else {
                // Se estava aberto e vai fechar
                toggleIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
            }
        }
        
    }
    function mostrarNotificacao(mensagem, tipo = 'sucesso') {
        let notificacaoDiv = document.getElementById('notificacao-global');
        if (!notificacaoDiv) {
            notificacaoDiv = document.createElement('div');
            notificacaoDiv.id = 'notificacao-global';
            notificacaoDiv.classList.add('notificacao');
            document.body.appendChild(notificacaoDiv);
        }
        
        notificacaoDiv.textContent = mensagem;
        notificacaoDiv.classList.remove('erro');
        
        if (tipo === 'erro') {
            notificacaoDiv.classList.add('erro');
        }
        
        notificacaoDiv.classList.add('show');
        
        setTimeout(() => {
            notificacaoDiv.classList.remove('show');
        }, 4000); 
    }


// ===================================
// LÓGICA DO MODAL DE PROTOCOLO E CÓPIA
// ===================================

const modalProtocolo = document.getElementById('modal-protocolo');

if (modalProtocolo) {
    const closeCustomSpan = modalProtocolo.querySelector('.close-custom');
    const copyProtocoloBtn = document.getElementById('copy-protocolo-btn');

    // 1. Lógica de fechamento do 'X' (onclick)
    if (closeCustomSpan) {
        closeCustomSpan.onclick = () => modalProtocolo.style.display = "none";
    }

    // 2. Lógica de fechamento ao clicar fora da modal (window.onclick)
    window.onclick = e => { if (e.target === modalProtocolo) modalProtocolo.style.display = "none"; };


    // 3. Lógica do botão de cópia
    if (copyProtocoloBtn) {
        copyProtocoloBtn.addEventListener('click', () => {
            const protocoloNumeroSpan = document.getElementById('modal-protocolo-numero');
            const protocolo = protocoloNumeroSpan.textContent.trim();

            if (protocolo) {
                // Usa a API Clipboard moderna
                navigator.clipboard.writeText(protocolo).then(() => {
                    mostrarNotificacao('Protocolo copiado!', 'sucesso');
                    
                    // Feedback visual: Muda o ícone temporariamente
                    copyProtocoloBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyProtocoloBtn.innerHTML = '<i class="far fa-copy"></i>';
                    }, 1500);

                }).catch(err => {
                    console.error('Erro ao copiar: ', err);
                    mostrarNotificacao('Falha ao copiar. Tente selecionar e copiar manualmente.', 'erro');
                });
            }
        });
    }
}

}); 