// modalManager.js
export class ModalManager {
    constructor() {
        this.modals = {};
    }
    
    registerModal(id, element, closeButton) {
        if (!element) {
            console.error(`Erro: Elemento com ID "${id}" não encontrado para registro.`);
            return;
        }
        this.modals[id] = { element, closeButton };
        
        // Garante que o modal está escondido no registro
        element.classList.add('is-hidden'); 
        
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hideModal(id));
        }
        
        element.addEventListener('click', (e) => {
            if (e.target === element) {
                this.hideModal(id);
            }
        });
    }
    

    showModal(id) {
        if (this.modals[id]) {
            const modal = this.modals[id].element;
            modal.classList.remove('is-hidden');
            modal.style.display = 'flex'; // ← FORÇA a remoção do display: none
        }
    }

    hideModal(id) {
        if (this.modals[id]) {
            const modal = this.modals[id].element;
            modal.classList.add('is-hidden');
            modal.style.display = 'none'; // ← Garante que fica escondido
            const form = this.modals[id].element.querySelector('form');
            if (form) form.reset();
        }
    }
}