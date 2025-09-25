document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (sidebarToggle) {
        // Recupera o estado salvo do localStorage (padrão: fechado)
        const savedState = localStorage.getItem('sidebarState');
        sidebarToggle.checked = savedState === 'open';
        
        // Adiciona listener para salvar o estado ao mudar
        sidebarToggle.addEventListener('change', () => {
            localStorage.setItem('sidebarState', sidebarToggle.checked ? 'open' : 'closed');
        });
    }
});