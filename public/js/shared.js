document.addEventListener('DOMContentLoaded', () => {
    injectSolicitacaoModal();
    renderSidebarAndSession(); 
});

function injectSolicitacaoModal() {
    if (document.getElementById('form-modal-container')) {
        return;
    }
    const modalHTML = `
        <div id="form-modal-container" class="form-modal-container" style="display: none;">
            <div class="form-modal-content">
                <button id="fechar-form-btn" class="fechar-form-btn">&times;</button>
                <h2>Solicitar Nova Automação</h2>
                <p>Preencha os campos abaixo para protocolar uma nova solicitação.</p>
                <form id="solicitacao-form">
                    <div class="form-group">
                        <label for="tipo_automacao">Tipo de Automação</label>
                        <select id="tipo_automacao" name="tipo_automacao" required>
                            <option value="" disabled selected>Selecione o tipo</option>
                            <option value="Extracao de Relatorio">Extração de Relatório</option>
                            <option value="Automacao de Planilha">Automação de Planilha</option>
                            <option value="Integracao de Sistemas">Integração de Sistemas</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="regional">Regional</label>
                        <select id="regional" name="regional" required>
                            <option value="" disabled selected>Selecione uma opção</option>
                            <option value="Nordeste">Nordeste</option>
                            <option value="Centro-Oeste">Centro-Oeste</option>
                            <option value="Bahia">Bahia</option>
                            <option value="Santa Catarina">Santa Catarina</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="descricao">Descreva sua necessidade</label>
                        <textarea id="descricao" name="descricao" rows="4" required></textarea>
                    </div>
                    <p id="form-error-message" class="error-message"></p>
                    <div id="form-success-message" style="display: none; color: green; margin-top: 15px;"></div>
                    <button type="submit" class="submit-btn">Enviar Solicitação</button>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}


async function renderSidebarAndSession() {
    const navLinksContainer = document.getElementById('sidebar-nav-links');
    if (!navLinksContainer) return;

    try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
            window.location.href = '/login/auth.html';
            return;
        }
        const { user } = await response.json();

        const userNameEl = document.getElementById('sidebar-user-name');
        const userRoleEl = document.getElementById('sidebar-user-role');
        if (userNameEl) userNameEl.textContent = `Olá, ${user.nome.split(' ')[0]}!`;
        if (userRoleEl && user.cargos.length > 0) userRoleEl.textContent = user.cargos[0];

        navLinksContainer.innerHTML = ''; 

        navLinksContainer.appendChild(
            createSidebarLink({
                href: '/', tooltip: 'Início', text: 'Início',
                iconSvg: `<path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />`
            })
        );
        
        const submenuItems = [];
        const managementRoles = ['administrador', 'analista', 'gestor_ti'];
        const isManagement = user.cargos.some(cargo => managementRoles.includes(cargo));
        const isRegularUser = user.cargos.includes('cliente') || user.cargos.includes('gestor');
        const userIsadministrador = user.cargos.includes('administrador');

        submenuItems.push(createSubmenuLink({ id: 'open-solicitacao-btn-sidebar', href: '#', text: 'Nova Solicitação' }));
        if (userIsadministrador) await addPendingProtocolsLink(submenuItems);
        if (isManagement) submenuItems.push(createSubmenuLink({ href: '/protocolos/protocolos.html', text: 'Gerenciar Protocolos' }));
        if (isManagement || isRegularUser) submenuItems.push(createSubmenuLink({ href: '/protocolos/meus-protocolos.html', text: 'Meus Protocolos' }));
        
        if (submenuItems.length > 0) {
            navLinksContainer.appendChild(
                createDropdownMenu({
                    text: 'Protocolos', tooltip: 'Gerenciar Protocolos',
                    iconSvg: `<path d="M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,12V14H11V12H13M13,8V10H11V8H13M8,16H16V18H8V16Z" />`,
                    submenuItems: submenuItems
                })
            );
        }

        navLinksContainer.appendChild(createSidebarLink({ href: '#', tooltip: 'Perfil (em breve)', text: 'Perfil', disabled: true, iconSvg: `<path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />`}));
        navLinksContainer.appendChild(createSidebarLink({ href: '#', tooltip: 'Configurações (em breve)', text: 'Configurações', disabled: true, iconSvg: `<path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.5,21.9 9.3,21.7L4.3,16.7C4.1,16.5 4,16.25 4,16V8C4,6.9 4.9,6 6,6H18C19.1,6 20,6.9 20,8V16C20,16.25 19.9,16.5 19.7,16.7L14.7,21.7C14.5,21.9 14.25,22 14,22H10Z" />`}));
        navLinksContainer.appendChild(createSidebarLink({ id: 'logout-btn-sidebar', href: '#', tooltip: 'Sair', text: 'Sair', iconSvg: `<path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />`}));
      
        
        setupGlobalEventListeners();
        setupSidebarInteractivity();
        
        document.dispatchEvent(new CustomEvent('userReady', { detail: user }));

    } catch (error) {
        console.error('Erro fatal ao renderizar sidebar e sessão:', error);
        window.location.href = '/login/auth.html';
    }
}

function createSidebarLink({ id = '', href, tooltip, text, iconSvg, disabled = false }) {
    const li = document.createElement('li');
    li.className = 'sidebar__item';

    const a = document.createElement('a');
    a.className = 'sidebar__link';
    if (disabled) a.classList.add('sidebar__link--disabled');
    if (id) a.id = id;
    a.href = href;
    a.dataset.tooltip = tooltip;
    
    a.innerHTML = `<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24">${iconSvg}</svg></span><span class="text">${text}</span>`;
    
    li.appendChild(a);
    return li;
}

function createSubmenuLink({ id = '', href, text }) {
    const li = document.createElement('li');
    li.className = 'submenu__item';
    const a = document.createElement('a');
    if (id) a.id = id;
    a.href = href;
    a.textContent = text;
    li.appendChild(a);
    return li;
}

function createDropdownMenu({ text, tooltip, iconSvg, submenuItems }) {
    const li = createSidebarLink({ href: '#', tooltip, text, iconSvg });
    li.classList.add('has-submenu');
    
    const ul = document.createElement('ul');
    ul.className = 'sidebar__submenu';
    submenuItems.forEach(item => ul.appendChild(item));
    
    li.appendChild(ul);
    return li;
}

async function addPendingProtocolsLink(submenuItems) {
    try {
      const response = await fetch('/api/triagem');
      if (!response.ok) return;
      const protocols = await response.json();
      const pendingCount = protocols.length;

        if (pendingCount > 0) {
            const li = createSubmenuLink({ href: '/triagem/triagem.html', text: 'Triagem Pendente'});
            li.querySelector('a').innerHTML += ` <span class="notification-badge">${pendingCount}</span>`;
            submenuItems.splice(1, 0, li);
        }
    } catch (error) {
        console.error("Erro ao carregar notificação:", error);
    }
}

function setupGlobalEventListeners() {
    const modalContainer = document.getElementById('form-modal-container');
    const openBtn = document.getElementById('open-solicitacao-btn-sidebar');
    const closeBtn = document.getElementById('fechar-form-btn');
    const logoutBtn = document.getElementById('logout-btn-sidebar');
    const form = document.getElementById('solicitacao-form');

    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modalContainer.style.display = 'flex';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modalContainer.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login/auth.html';
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const successMessage = document.getElementById('form-success-message');
            const errorMessage = document.getElementById('form-error-message');
            successMessage.style.display = 'none';
            errorMessage.textContent = '';
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            try {
                const response = await fetch('/api/protocolos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    form.reset();
                    successMessage.textContent = `Protocolo ${result.protocolo.protocolo_uid} criado com sucesso!`;
                    successMessage.style.display = 'block';
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                        modalContainer.style.display = 'none';
                        if (window.location.pathname.includes('/protocolos/')) {
                            window.location.reload();
                        }
                    }, 4000);
                } else {
                    errorMessage.textContent = result.message;
                }
            } catch (error) {
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            }
        });
    }
}

function setupSidebarInteractivity() {
    // 1.  Alvo agora é 'sidebar-toggle'
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const savedState = sessionStorage.getItem('sidebarState');
    if (savedState === 'closed') {
        sidebarToggle.checked = false;
    } else {
        sidebarToggle.checked = true;
    }
    const body = document.body;

    if (sidebarToggle) {
        // 2. Salva o estado 'open' ou 'closed' no sessionStorage a cada mudança
        sidebarToggle.addEventListener('change', () => {
            if (sidebarToggle.checked) {
                sessionStorage.setItem('sidebarState', 'open');
            } else {
                sessionStorage.setItem('sidebarState', 'closed');
            }
        });
    }
    
    // Expande o submenu ao clicar
    document.querySelectorAll('.has-submenu > .sidebar__link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const parentLi = link.closest('.sidebar__item');
            if (parentLi) {
                parentLi.classList.toggle('is-open');
            }
        });
    });

    // 3. Lógica do Tema agora salva a preferência
    const themeToggles = document.querySelectorAll('.day-night input');

    // Função para aplicar o tema salvo
    const applySavedTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'light'; // Padrão 'light'
        body.classList.toggle('light', savedTheme === 'light');
        themeToggles.forEach(toggle => {
            toggle.checked = savedTheme !== 'light';
        });
    };

    // Aplica o tema assim que a página carrega
    applySavedTheme();

    // Adiciona o evento de mudança a todos os botões de tema
    themeToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const isDark = toggle.checked;
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            body.classList.toggle('light', !isDark);
            // Sincroniza os outros botões de tema, caso existam
            themeToggles.forEach(otherToggle => {
                if (otherToggle !== toggle) {
                    otherToggle.checked = isDark;
                }
            });
        });
    });
}