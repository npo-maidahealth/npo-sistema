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
        let styles;
        
        if (statusUpper.includes('AUTORIZADA') || statusUpper.includes('EXECUTADA')) {
            styles = { background: '#DFF3E2', color: '#34A648' }; // Verde Sucesso
        } else if (statusUpper.includes('NEGADA') || statusUpper.includes('CANCELADA')) {
            styles = { background: '#FDE1DF', color: '#DB3C31' }; // Vermelho Erro
        } else if (statusUpper.includes('DOCUMENTAÇÃO PENDENTE')) {
            styles = { background: '#FFF2D6', color: '#E59500' }; // Amarelo Aviso
        } else {
            styles = { background: '#D6ECF8', color: '#0079C6' }; // Azul (Reanálise/Análise)
        }
        
        return styles;
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
    function renderizarCardDetalhes(guia, statusDisplay, permitirEnvio, statusInfo) {
        const styles = getStatusStyles(statusDisplay);
        
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
        
        const cardHtml = `
            <h3>Detalhes da Guia</h3>
            <div class="card-guia-container">
                
                <div class="detalhes-header novo-header">
                    <span class="detalhes-tipo-guia">Guia de ${tipoGuiaDisplay} - Nº Guia: ${guia.autorizacaoGuia || guia.numeroGuia || '-'}</span>
                    <span class="detalhes-contador">${qtdPrioridades > 0 ? `Solicitado Prioridade ${qtdPrioridades}x` : ''}</span>
                </div>
                
                <div class="detalhes-body novo-body">
                    <p class="status-sla-row">
                        <p class="status-sla-row">
                        <span class="status-visual" style="background-color: ${styles.background}; color: ${styles.color};">${statusDisplay}</span>
                        
                        <span 
                            class="status-visual status-sla-visual sla-info" 
                            style="background-color: ${styles.background}; color: ${styles.color};" 
                            title="SLA: ${slaTooltip}"
                        >
                            <i class="far fa-clock"></i> ${slaContador}
                        </span> 
                    </p>
                    
                    <p class="beneficiario-info">
                        <strong>Beneficiário:</strong> ${guia.beneficiario || '-'} 
                        | <strong>CPF:</strong> ${guia.cpfBeneficiario || '-'} 
                        | <strong>Cartão:</strong> ${guia.cartaoBeneficiario || '-'}
                    </p>

                    ${guia.pacienteInternado ? `
                        <p class="internacao-info-row">
                            <span class="status-visual internacao-visual status-internado">
                                <i class="fas fa-bed"></i> PACIENTE INTERNADO
                            </span>
                        </p>
                    ` : ''}
                    <p class="fila-info">
                        <strong>Fila:</strong> ${guia.fila || 'Não Informada'}
                    </p>
                    
                    <p class="data-emissao-info">
                        <strong>Data de emissão da guia:</strong> ${dataEmissao}
                    </p>

                    <div class="procedimentos-section" id="procedimentos-toggle-header">
                                <h4 style="cursor: pointer;">
                                    <i class="fas fa-chevron-right toggle-icon" id="procedimentos-main-toggle"></i>
                                    Procedimentos Solicitados:
                                </h4>
                                <ul id="procedimentos-list" style="display: none;"> ${guia.itensSolicitados ? guia.itensSolicitados.map((item, index) => {
                            
                                    const statusItem = item.ultimaSituacao || item.status;
                                    const statusDisplayItem = formatarStatusItem(statusItem);
                                    const statusClass = statusDisplayItem.toLowerCase().replace(' ', '-');
                                    
                                    return `
                                        <li class="procedimento-item-simples">
                                            <span>${item.descricao || 'Item sem descrição'} (${item.codigo || '-'})</span>
                                            <span class="procedimento-status status-${statusClass}">${statusDisplayItem}</span>
                                        </li>
                                    `;
                                }).join('') : '<p>Nenhum procedimento encontrado.</p>'}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <textarea id="eco-observacao" placeholder="Observações (opcional)"></textarea>
            
            <button 
                id="eco-enviar-prioridade" 
                type="button" 
                title="${permitirEnvio ? 'Enviar para prioridade' : statusInfo.motivo}"
                ${!permitirEnvio ? 'disabled' : ''}
            >
                Enviar para Prioridade
            </button>
        `;

        return cardHtml;
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

        const data = {
            numeroGuia: guiaSelecionado.autorizacaoGuia,
            tipoGuia: guiaSelecionado.tipoDeGuia || 'DESCONHECIDO',
            status: guiaSelecionado.statusRegulacao || 'PENDENTE',
            caracterAtendimento: guiaSelecionado.fila || 'SP',
            observacao: document.getElementById('eco-observacao').value || '',
            produtoId: 1,
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
            fonte: 'ECO'
        };

        try {
            const res = await fetch('/api/prioridades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Erro ao enviar prioridade');
            }

            mostrarNotificacao('Prioridade ECO enviada com sucesso!');
            ecoForm.reset();
            ecoPrioridadeContainer.style.display = 'none';
            limparErro(); 
            guiaSelecionado = null;
        } catch (err) {
            console.error(err);
            mostrarNotificacao(`Erro ao enviar prioridade ECO: ${err.message}`, 'erro');    
        } finally {
            currentEnviarBtn.disabled = false;    
        }
    }

    ecoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const numeroGuia = document.getElementById('eco-guia').value;
        limparErro();
        ecoPrioridadeContainer.style.display = 'none';

        try {
            const res = await fetch(`/api/eco/${numeroGuia}`);
            if (!res.ok) throw new Error('Erro ao buscar guia');
            const data = await res.json();

            if (data.content && data.content.length > 0) {
                guiaSelecionado = data.content[0];
                const statusGuia = guiaSelecionado.statusRegulacao || 'EM ANÁLISE';
                const statusInfo = verificarStatusGuia(statusGuia);
                const cardHtml = renderizarCardDetalhes(guiaSelecionado, statusInfo.statusDisplay, !statusInfo.invalido, statusInfo);
                
                ecoPrioridadeContainer.innerHTML = cardHtml;
                ecoPrioridadeContainer.style.display = 'block';

                const novoEnviarPrioridadeBtn = document.getElementById('eco-enviar-prioridade');
                // Re-anexa o listener de envio
                novoEnviarPrioridadeBtn.addEventListener('click', enviarPrioridadeHandler);

               
                const mainToggleHeader = document.querySelector('#procedimentos-toggle-header h4');
                const procedimentosList = document.getElementById('procedimentos-list');
                const mainIcon = document.getElementById('procedimentos-main-toggle');

                if (mainToggleHeader) { 
                    mainToggleHeader.addEventListener('click', () => {
                        const isVisible = procedimentosList.style.display === 'block';

                        if (isVisible) {
                            procedimentosList.style.display = 'none';
                            mainIcon.classList.replace('fa-chevron-down', 'fa-chevron-right'); // Seta para direita
                        } else {
                            procedimentosList.style.display = 'block';
                            mainIcon.classList.replace('fa-chevron-right', 'fa-chevron-down'); // Seta para baixo
                        } 
                    });
                }

                
                if (statusInfo.invalido) {
                    exibirErro(statusInfo.motivo);
                }

            } else {
                exibirErro('Guia não encontrada.');
            }
        } catch (err) {
            console.error(err);
            exibirErro('Erro ao consultar guia ECO.');
        }
    });

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
            const res = await fetch('/api/prioridades', {
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
    }, 4000); // Esconde a notificação após 4 segundos
}
    
    
});