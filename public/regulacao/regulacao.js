document.addEventListener('DOMContentLoaded', async () => { 
    
    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Lógica unificada para gerenciamento de abas
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove 'active' de todas as abas
            tabs.forEach(t => t.classList.remove('active'));
            // Adiciona 'active' na aba clicada
            tab.classList.add('active');

            // Remove 'active' de todo o conteúdo e o esconde
            tabContents.forEach(c => c.classList.remove('active'));

            // Adiciona 'active' no conteúdo correspondente para a transição
            const target = tab.dataset.tab;
            document.getElementById(`${target}-content`).classList.add('active');
        });
    });

    const ecoForm = document.getElementById('eco-form');
    const ecoPrioridadeForm = document.getElementById('eco-prioridade-form');
    const enviarPrioridadeBtn = document.getElementById('eco-enviar-prioridade');
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
        ecoPrioridadeForm.style.display = 'none'; 
    }
    
    function limparErro() {
        const erroDiv = document.getElementById('eco-erro');
        if (erroDiv) {
            erroDiv.remove();
        }
    }
    //função para habilitar/desabilitar botão de enviar prioridade
    function toggleEnviarPrioridadeBtn(habilitar, motivo = '') {
        if (habilitar) {
            enviarPrioridadeBtn.disabled = false;
            enviarPrioridadeBtn.style.backgroundColor = 'var(--maida-azul)';
            enviarPrioridadeBtn.style.cursor = 'pointer';
            enviarPrioridadeBtn.title = '';
        } else {
            enviarPrioridadeBtn.disabled = true;
            enviarPrioridadeBtn.style.backgroundColor = 'var(--maida-azul)';
            enviarPrioridadeBtn.style.cursor = 'not-allowed';
            enviarPrioridadeBtn.title = motivo || 'Guia não pode ser enviada para prioridade';
        }
    }
    //Função para verificar status que não permitem prioridade. 
    function verificarStatusGuia(status) {
        const statusUpperCase = status?.toUpperCase() || '';
        const statusInvalidos = ['AUTORIZADA', 'CAPTURADA', 'NEGADA', 'CANCELADA', 'EXECUTADA'];
        
        return {
            invalido: statusInvalidos.includes(statusUpperCase),
            motivo: statusInvalidos.includes(statusUpperCase) ? 
                    `Status "${status}" não permite envio para prioridade` : ''
        };
    }

    ecoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const numeroGuia = document.getElementById('eco-guia').value;
        limparErro();
        ecoPrioridadeForm.style.display = 'none';
        toggleEnviarPrioridadeBtn(false); 

        try {
            const res = await fetch(`/api/eco/${numeroGuia}`);
            if (!res.ok) throw new Error('Erro ao buscar guia');
            const data = await res.json();

            if (data.content && data.content.length > 0) {
                guiaSelecionado = data.content[0];
                const statusGuia = guiaSelecionado.statusRegulacao || '';

                const statusInfo = verificarStatusGuia(statusGuia);
                
                if (statusInfo.invalido) {
                    exibirErro(statusInfo.motivo);
                    return; 
                }

                ecoPrioridadeForm.style.display = 'block';
                toggleEnviarPrioridadeBtn(true);
                
                document.getElementById('eco-numero-guia').textContent = guiaSelecionado.autorizacaoGuia;
                document.getElementById('eco-nome-paciente').textContent = guiaSelecionado.beneficiario || '-';
                document.getElementById('eco-tipo-guia').textContent = guiaSelecionado.tipoDeGuia || '-';
                document.getElementById('eco-carater').textContent = guiaSelecionado.fila || '-';
                document.getElementById('eco-status').textContent = statusGuia || '-';

            } else {
                exibirErro('Guia não encontrada.');
            }
        } catch (err) {
            console.error(err);
            exibirErro('Erro ao consultar guia ECO.');
        }
    });

    // Enviar prioridade ECO
    enviarPrioridadeBtn.addEventListener('click', async () => {
        // Adiciona o bloqueio de duplo clique
        if (enviarPrioridadeBtn.disabled) {
            return;
        }

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

        enviarPrioridadeBtn.disabled = true;    

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
            ecoPrioridadeForm.style.display = 'none';
            limparErro(); 
            guiaSelecionado = null;
        } catch (err) {
            console.error(err);
            mostrarNotificacao(`Erro ao enviar prioridade ECO: ${err.message}`, 'erro');    
        } finally {
            enviarPrioridadeBtn.disabled = false;    
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

            const data = await res.json();  // {quantidade, numeroGuia, beneficiario, status, ...}
            
            // Função para formatar data (como em regulador.js)
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