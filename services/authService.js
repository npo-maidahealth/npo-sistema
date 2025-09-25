// services/authService.js
import fetch from 'node-fetch';

// Função para autenticar e obter novo token
export async function obterNovoTokenECO() {
    try {
        const LOGIN_URL = "https://accounts-api.issec.maida.health/login";
        const LOGIN_PAYLOAD = {
            login: "gabriel.queiroz@maida.health",
            password: "M@cesso.15072024"
        };

        console.log('🔐 Autenticando na API ECO...');

        const response = await fetch(LOGIN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(LOGIN_PAYLOAD)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro no login: ${response.status} - ${errorText}`);
        }

        const dados = await response.json();
        const token = dados.maidaToken || dados.token;
        
        if (!token) {
            throw new Error("Token não encontrado na resposta da API");
        }

        console.log('✅ Novo token ECO obtido com sucesso');
        return token;

    } catch (err) {
        console.error('❌ Erro ao obter novo token ECO:', err.message);
        throw err;
    }
}

// Função para verificar se token é válido
export async function verificarTokenValido(token) {
    try {
        const response = await fetch('https://regulacao-api.issec.maida.health/v3/historico-cliente?page=0&size=1', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        return response.status !== 403 && response.status !== 401;
    } catch {
        return false;
    }
}