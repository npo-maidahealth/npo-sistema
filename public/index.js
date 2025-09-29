document.addEventListener('DOMContentLoaded', function() {
     // A lógica de sessão e permissão continua a mesma
    fetch('/api/auth/session', { credentials: 'include' })
        .then(response => {
            if (!response.ok) throw new Error('Não autenticado');
            return response.json();
        })
        .then(data => {
            const user = data.user;
            if (user) {
                document.dispatchEvent(new CustomEvent('userReady', {
                    detail: { cargos: user.cargos, produtos: user.produtos }
                }));
            }
        })
        .catch(err => {
            console.log('Usuário não autenticado, redirecionando para login.');
            window.location.href = '/login/auth.html';
        });
});

// Substitua o código existente por este em index.js
document.addEventListener('userReady', (event) => {
    const userCargos = event.detail.cargos;
    const userProdutos = event.detail.produtos;

    // Use o console para verificar se os cargos estão corretos (opcional)
    console.log("Cargos do usuário para verificação:", userCargos);

    document.querySelectorAll('.feature-card').forEach(card => {
        const allowedRolesAttr = card.dataset.allowedRoles;
        const feature = card.dataset.feature;

        // Esconda todos os cards por padrão para garantir um estado inicial limpo
        card.style.display = 'none'; 

        if (!allowedRolesAttr) {
            return; // Pula para o próximo card se não tiver roles definidas
        }

        const allowedRoles = allowedRolesAttr.split(',');
        let hasPermission = userCargos.some(cargo => allowedRoles.includes(cargo));

        // --- LÓGICA DE EXIBIÇÃO ---
        if (hasPermission) {
            // Regra especial para o card "pedido-prioridade"
            if (feature === 'pedido-prioridade') {
                const canAccess = userCargos.some(role => ['regulacao', 'coordenador', 'administrador'].includes(role)) || 
                                  (userCargos.includes('atendente') && userProdutos.includes('ISSEC'));
                if (!canAccess) {
                    hasPermission = false; // Invalida a permissão se a condição especial não for atendida
                }
            }

            // Se, após todas as verificações, a permissão for válida, MOSTRE o card
            if (hasPermission) {
                card.style.display = 'block'; 
                card.addEventListener('click', () => {
                    const url = card.dataset.url;
                    if (url) window.location.href = url;
                });
            }
        }
    });
});