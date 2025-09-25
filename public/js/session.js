// public/js/session.js
//Verifica se tem usuário logado e redireciona se não tiver

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔹 Verificando sessão do usuário...');
        
        const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include' 
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Usuário logado encontrado:', data.user);

            // guarda globalmente(ele guarda o login em um cache para que seja receptado pelos listeners do protocolos.js)
            window.userReady = data.user;

            // dispara evento
            const event = new CustomEvent('userReady', { detail: data.user });
            document.dispatchEvent(event);
        } else {
            console.log('❌ Nenhum usuário logado, redirecionando para login...');
            window.location.href = '/login/auth.html';
        }
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        window.location.href = '/login/auth.html';
    }
});