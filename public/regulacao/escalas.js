document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se usuário tem permissão de coordenador
    try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!res.ok) throw new Error('Não autenticado');
        
        const { user } = await res.json();
        if (!user.cargos.includes('coordenador') && !user.cargos.includes('administrador')) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/regulador.html';
            return;
        }
    } catch (err) {
        console.error(err);
        window.location.href = '/login/auth.html';
        return;
    }

    // Carregar reguladores e escalas
    await carregarReguladores();
    await carregarEscalas();
    await carregarEscalaSemanal();

    // Formulário de regulador
    document.getElementById('form-regulador').addEventListener('submit', async (e) => {
        e.preventDefault();
        await adicionarRegulador();
    });

    // Formulário de escala
    document.getElementById('form-escala').addEventListener('submit', async (e) => {
        e.preventDefault();
        await adicionarEscala();
    });

    // Lógica para adicionar filas como tags
    const filaSelect = document.getElementById('fila-select');
    const adicionarFilaBtn = document.getElementById('adicionar-fila-btn');
    const filasSetadasContainer = document.getElementById('filas-setadas-container');
    const filasHiddenInput = document.getElementById('filas-escala');

    adicionarFilaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const filaSelecionada = filaSelect.value;
        const filaText = filaSelect.options[filaSelect.selectedIndex].text;

        if (filaSelecionada && !document.querySelector(`[data-fila="${filaSelecionada}"]`)) {
            const tag = document.createElement('span');
            tag.classList.add('tag-fila');
            tag.textContent = filaText;
            tag.dataset.fila = filaSelecionada;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'x';
            removeBtn.classList.add('tag-remove-btn');
            removeBtn.addEventListener('click', () => {
                tag.remove();
                atualizarFilasHiddenInput();
            });

            tag.appendChild(removeBtn);
            filasSetadasContainer.appendChild(tag);
            atualizarFilasHiddenInput();
        }
    });

    function atualizarFilasHiddenInput() {
        const filas = Array.from(filasSetadasContainer.querySelectorAll('.tag-fila')).map(tag => tag.dataset.fila);
        filasHiddenInput.value = filas.join(', ');
    }
});

async function carregarReguladores() {
    try {
        const res = await fetch('/api/escalas/reguladores', { credentials: 'include' });
        const reguladores = await res.json();
        
        const select = document.getElementById('regulador-escala');
        const lista = document.getElementById('lista-reguladores');
        
        // Limpar selects
        select.innerHTML = '<option value="">Selecione um regulador</option>';
        lista.innerHTML = '<h3>Reguladores Cadastrados</h3>';
        
        reguladores.forEach(regulador => {
            // Preencher select
            const option = document.createElement('option');
            option.value = regulador.id;
            option.textContent = regulador.nome;
            select.appendChild(option);
            
            // Preencher lista
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${regulador.nome}</h3>
                <p>Status: ${regulador.ativo ? 'Ativo' : 'Inativo'}</p>
                <button onclick="toggleRegulador(${regulador.id}, ${!regulador.ativo})">
                    ${regulador.ativo ? 'Desativar' : 'Ativar'}
                </button>
            `;
            lista.appendChild(card);
        });
    } catch (err) {
        console.error('Erro ao carregar reguladores:', err);
    }
}

async function carregarEscalas() {
    try {
        const res = await fetch('/api/escalas', { credentials: 'include' });
        const escalas = await res.json();
        
        // Aqui você pode processar as escalas
        console.log('Escalas carregadas:', escalas);
    } catch (err) {
        console.error('Erro ao carregar escalas:', err);
    }
}

async function carregarEscalaSemanal() {
    try {
        const res = await fetch('/api/escalas/semanal', { credentials: 'include' });
        const escalaSemanal = await res.json();
        
        const container = document.getElementById('escala-semanal');
        container.innerHTML = '';
        
        // Dias da semana
        const dias = [
            { id: 1, nome: 'Segunda' },
            { id: 2, nome: 'Terça' },
            { id: 3, nome: 'Quarta' },
            { id: 4, nome: 'Quinta' },
            { id: 5, nome: 'Sexta' },
            { id: 6, nome: 'Sábado' }
        ];
        
        dias.forEach(dia => {
            const diaDiv = document.createElement('div');
            diaDiv.className = 'dia-escala';
            diaDiv.innerHTML = `<h4>${dia.nome}</h4>`;
            
            // Filtrar escalas para este dia
            const escalasDia = escalaSemanal.filter(e => e.diaSemana === dia.id);
            const turnos = {};
            
            // Agrupar por turno
            escalasDia.forEach(escala => {
                if (!turnos[escala.turno]) turnos[escala.turno] = [];
                turnos[escala.turno].push(escala);
            });
            
            // Adicionar turnos e o botão de exclusão
            Object.entries(turnos).forEach(([turno, escalas]) => {
                const turnoDiv = document.createElement('div');
                turnoDiv.className = 'turno';
                turnoDiv.innerHTML = `<h5>${turno}</h5>`;
                
                escalas.forEach(escala => {
                    const escalaCard = document.createElement('div');
                    escalaCard.classList.add('escala-card');
                    escalaCard.innerHTML = `
                        <p><strong>${escala.regulador.nome}</strong></p>
                        <p>${escala.horaInicio} - ${escala.horaFim}</p>
                        <p>${escala.filas}</p>
                    `;

                    // Botão de exclusão
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '×';
                    deleteBtn.classList.add('delete-escala-btn');
                    deleteBtn.title = 'Remover escala';
                    deleteBtn.addEventListener('click', () => removerEscala(escala.id));
                    
                    escalaCard.appendChild(deleteBtn);
                    turnoDiv.appendChild(escalaCard);
                });
                
                diaDiv.appendChild(turnoDiv);
            });
            
            container.appendChild(diaDiv);
        });
    } catch (err) {
        console.error('Erro ao carregar escala semanal:', err);
    }
}

async function adicionarRegulador() {
    const nome = document.getElementById('nome-regulador').value;
    
    try {
        const res = await fetch('/api/escalas/reguladores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nome })
        });
        
        if (res.ok) {
            alert('Regulador adicionado com sucesso!');
            document.getElementById('form-regulador').reset();
            await carregarReguladores();
        } else {
            throw new Error('Erro ao adicionar regulador');
        }
    } catch (err) {
        console.error('Erro:', err);
        alert('Erro ao adicionar regulador');
    }
}

async function adicionarEscala() {
    const formData = {
        reguladorId: parseInt(document.getElementById('regulador-escala').value),
        diaSemana: parseInt(document.getElementById('dia-semana').value),
        turno: document.getElementById('turno').value,
        horaInicio: document.getElementById('hora-inicio').value,
        horaFim: document.getElementById('hora-fim').value,
        filas: document.getElementById('filas-escala').value,
        observacao: document.getElementById('observacao-escala').value
    };
    
    try {
        const res = await fetch('/api/escalas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            alert('Escala adicionada com sucesso!');
            document.getElementById('form-escala').reset();
            // Limpa as tags após o envio bem-sucedido
            document.getElementById('filas-setadas-container').innerHTML = '';
            await carregarEscalas();
            await carregarEscalaSemanal();
        } else {
            throw new Error('Erro ao adicionar escala');
        }
    } catch (err) {
        console.error('Erro:', err);
        alert('Erro ao adicionar escala');
    }
}
async function removerEscala(id) {
    if (!confirm('Tem certeza de que deseja remover esta escala?')) {
        return;
    }
    
    try {
        const res = await fetch(`/api/escalas/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.ok) {
            alert('Escala removida com sucesso!');
            carregarEscalaSemanal();
        } else {
            throw new Error('Erro ao remover escala.');
        }
    } catch (err) {
        console.error('Erro:', err);
        alert('Erro ao remover escala');
    }
}
async function toggleRegulador(id, ativo) {
    try {
        const res = await fetch(`/api/escalas/reguladores/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ativo })
        });
        
        if (res.ok) {
            alert('Regulador atualizado com sucesso!');
            await carregarReguladores();
        } else {
            throw new Error('Erro ao atualizar regulador');
        }
    } catch (err) {
        console.error('Erro:', err);
        alert('Erro ao atualizar regulador');
    }
}