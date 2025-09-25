// protocolActions.js
import { PERMISSIONS, TAGS } from '/js/constants.js';
import { hasPermission, formatDate, formatStatus } from '/js/utils.js';
import { ModalManager } from '/js/modalManager.js';
import { ProtocolService } from '/js/protocolService.js';
import { protocolUI } from '/js/protocolUI.js';

// As variáveis open...Modal não são mais necessárias aqui
// Elas serão passadas como um objeto

/**
 * Configura os botões de ação de acordo com status do protocolo e permissões do usuário
 * @param {object} modalFunctions - Objeto contendo as funções de abertura de modais
 */
export function protocolActionButtons(protocolo, actionsContainer, currentUser, modalManager, modalFunctions) {
   actionsContainer.innerHTML = '';

   const isResponsavel = protocolo.id_responsavel === currentUser?.id;
   const temPermissaoGerenciamento = hasPermission(currentUser, 'analisar_resolucao') || hasPermission(currentUser, 'ponto_melhoria');
   const temAprovacao = protocolo.tratativas?.some(t => t.tipo_mensagem === 'aprovacao');

   const safeClick = (fn) => e => { e.stopPropagation(); fn?.(); };

   // Assumir protocolo
   if (protocolo.status === 'aberto' && hasPermission(currentUser, 'self_assign_protocol')) {
      const btn = document.createElement('button');
      btn.className = 'action-button self-assign';
      btn.innerHTML = `<i class="fas fa-user-check"></i> Assumir Protocolo`;
      btn.addEventListener('click', safeClick(() => modalFunctions.openAssignModal?.(protocolo.id)));
      actionsContainer.appendChild(btn);
   }

   // Encaminhar resolução
   if (protocolo.status === 'em_andamento' && isResponsavel && hasPermission(currentUser, 'encaminhar_resolucao') && !temAprovacao) {
      const btn = document.createElement('button');
      btn.className = 'action-button';
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> Encaminhar Resolução`;
      btn.addEventListener('click', safeClick(() => modalFunctions.openResolucaoModal?.(protocolo.id)));
      actionsContainer.appendChild(btn);
   }

   // Analisar protocolo
   if (protocolo.status === 'pendente' && temPermissaoGerenciamento) {
      const btn = document.createElement('button');
      btn.className = 'action-button';
      btn.innerHTML = `<i class="fas fa-search"></i> Analisar`;
      btn.addEventListener('click', safeClick(() => modalFunctions.openAnaliseModal?.(protocolo)));
      actionsContainer.appendChild(btn);
   }

   // Encerrar protocolo
   if (protocolo.status === 'em_andamento' && isResponsavel && hasPermission(currentUser, 'encerrar_protocolo') && temAprovacao) {
      const btn = document.createElement('button');
      btn.className = 'action-button success';
      btn.innerHTML = `<i class="fas fa-check"></i> Encerrar Protocolo`;
      btn.addEventListener('click', safeClick(() => modalFunctions.openEncerrarModal?.(protocolo.id)));
      actionsContainer.appendChild(btn);
   }

   // Ver resolução final
   if (protocolo.status === 'fechado') {
      const btn = document.createElement('button');
      btn.className = 'action-button';
      btn.innerHTML = `<i class="fas fa-eye"></i> Ver Resolução`;
      btn.addEventListener('click', safeClick(() => modalFunctions.openResolucaoFinalModal?.(protocolo)));
      actionsContainer.appendChild(btn);
   }
}