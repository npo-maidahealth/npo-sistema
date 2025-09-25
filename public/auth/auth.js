document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do HTML
    const container = document.getElementById('container');
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginErrorMessage = document.getElementById('login-error-message');
    const registerErrorMessage = document.getElementById('register-error-message');

    // Lógica para a animação de transição 
    if (signUpButton) {
        signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
    }
    if (signInButton) {
        signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));
    }

    // ===================================================================
    // LÓGICA PARA O FORMULÁRIO DE PRÉ-CADASTRO 
    // ===================================================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerErrorMessage.textContent = ''; 

            // Coleta apenas os dados necessários do novo formulário
            const data = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email-register').value,
                whatsapp: document.getElementById('whatsapp').value
            };
            // Removemos a coleta de senha, regional, cargo e produto

            try {
                // Envia para a nova rota de pré-cadastro
                const response = await fetch('/api/auth/pre-cadastro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Exibe a mensagem de sucesso do backend e volta para a tela de login
                    alert(result.message);
                    registerForm.reset(); // Limpa o formulário
                    signInButton.click(); // Anima a volta para o painel de login
                } else {
                    registerErrorMessage.textContent = result.message;
                }
            } catch (error) {
                registerErrorMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
            }
        });
    }

    // ===================================================================
    // LÓGICA PARA O FORMULÁRIO DE LOGIN 
    // ===================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginErrorMessage.textContent = ''; 

            const data = {
                email: document.getElementById('email-login').value,
                senha: document.getElementById('senha-login').value
            };

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                if (response.ok) {
                    window.location.href = '/'; // Redireciona para a página principal após o login
                } else {
                    loginErrorMessage.textContent = result.message;
                }
            } catch (error) {
                loginErrorMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
            }
        });
    }
});