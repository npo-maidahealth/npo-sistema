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
    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });

    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });

    // Lógica para o formulário de Registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerErrorMessage.textContent = ''; 

            const data = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email-register').value,
                senha: document.getElementById('senha-register').value,
                whatsapp: document.getElementById('whatsapp').value,
                regional: document.getElementById('regional').value,
                cargo: document.getElementById('cargo').value,
                produto: document.getElementById('produto').value
            };

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (response.ok) {
                    alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
                    container.classList.remove("right-panel-active"); // Volta para o painel de login
                } else {
                    registerErrorMessage.textContent = result.message;
                }
            } catch (error) {
                registerErrorMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
            }
        });
    }

    // Lógica para o formulário de Login
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
                    window.location.href = '/'; 
                } else {
                    loginErrorMessage.textContent = result.message;
                }
            } catch (error) {
                loginErrorMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
            }
        });
    }
});