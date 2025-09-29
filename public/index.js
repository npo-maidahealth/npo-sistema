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

document.addEventListener('userReady', (event) => {
    const userCargos = event.detail.cargos;
    const userProdutos = event.detail.produtos;

    document.querySelectorAll('.feature-card').forEach(card => {
        const allowedRolesAttr = card.dataset.allowedRoles;
        const feature = card.dataset.feature;

        if (!allowedRolesAttr) {
            card.style.display = 'none';
            return;
        }

        const allowedRoles = allowedRolesAttr.split(',');
        const hasPermission = userCargos.some(cargo => allowedRoles.includes(cargo));

        if (hasPermission) {
            // Regra especial: pedido de prioridade
            if (feature === 'pedido-prioridade') {
                const canAccess = userCargos.some(role => ['regulacao', 'coordenador', 'Administrador'].includes(role)) || 
                                  (userCargos.includes('atendente') && userProdutos.includes('ISSEC'));
                if (!canAccess) {
                    card.style.display = 'none';
                }
            }

            card.addEventListener('click', () => {
                const url = card.dataset.url;
                if (url) window.location.href = url;
            });
        } else {
            card.style.display = 'none';
        }
    });

    // A função de hover antiga foi removida pois o CSS agora cuida de tudo.
});