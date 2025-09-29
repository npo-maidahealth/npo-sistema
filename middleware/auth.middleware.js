// auth.middleware.js

// 1. Importar 'permissions' usando a sintaxe ES Module
import permissions from './permissions.js';

// 2. Exportar cada função diretamente usando 'export const'
export const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }

    // Mantém a lógica inteligente para API vs Navegador
    if (req.accepts('json')) {
        return res.status(401).json({ message: 'Acesso negado. Sessão inválida ou expirada.' });
    } else {
        res.redirect('/login/auth.html');
    }
};

export const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        const userRoles = req.session.user.cargos;

        if (userRoles.includes('Administrador')) return next();

        const allowed = userRoles.some(role => permissions[role]?.includes(requiredPermission));
        if (allowed) return next();

        return res.status(403).json({ message: "Acesso negado. Permissões insuficientes." });
    };
};