// utils.js
import { PERMISSIONS } from '/js/constants.js'; // <-- importa o arquivo correto

export function hasPermission(user, requiredPermission) {
    if (!user) return false;

    // Verificar se tem permissão direta
    if (user.permissoes && user.permissoes.includes(requiredPermission)) {
        return true;
    }

    // Verificar se tem cargo que concede a permissão
    if (user.cargos) {
        return user.cargos.some(cargo => 
            PERMISSIONS[cargo] && PERMISSIONS[cargo].includes(requiredPermission)
        );
    }

    return false;
}


export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

export function formatStatus(status) {
    return status.replace(/_/g, ' ');
}

export async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Função auxiliar para debugar (pode remover depois)
export function debugUserPermissions(user) {
    if (!user) {
        console.log('❌ Usuário não definido');
        return;
    }
    
    console.log('=== DEBUG DE PERMISSÕES ===');
    console.log('Usuário:', user.nome);
    console.log('Cargos:', user.cargos);
    console.log('Permissões:', user.permissoes);
    console.log('Tem triage_protocol:', hasPermission(user, 'triage_protocol'));
    console.log('Tem Administrador:', hasPermission(user, 'Administrador'));
    console.log('===========================');
}