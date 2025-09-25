const permissions = {
    
    cliente: [
        'view_tools_description',
        'request_module',
        'view_own_protocols',
        'filter_own_protocols'
    ],
     atendente: [
        'view_priorities',         
        'create_priority',          
        'update_priority_status'   
    ],
    regulacao: [
        'view_priorities',
        'create_priority',
        'update_priority_status',
        'highlight_priority',      
        'regulation_actions'     
    ],
    coordenador: [
        'view_priorities',
        'create_priority',
        'update_priority_status',
        'highlight_priority',      
        'regulation_actions' 
    ],
    gestor: [
        'view_tools_description',
        'request_module',
        'view_own_protocols',
        'filter_own_protocols',
        'access_panel_links'
    ],
    analista: [
        'view_tools_description',
        'request_module',
        'view_own_protocols',
        'filter_own_protocols',
        'access_panel_links',
        'view_all_protocols',
        'self_assign_protocol'
    ],
    gestor_ti: [
        'view_tools_description',
        'request_module',
        'view_own_protocols',
        'filter_own_protocols',
        'access_panel_links',
        'view_all_protocols',
        'self_assign_protocol',
        'view_analyst_indices'
    ],
    admin: [
        'view_tools_description',
        'request_module',
        'view_own_protocols',
        'filter_own_protocols',
        'access_panel_links',
        'view_all_protocols',
        'self_assign_protocol',
        'view_analyst_indices',
        'triage_protocol',
        'approve_protocol_closure',
        'view_priorities',
        'create_priority',
        'update_priority_status',
        'highlight_priority',      
        'regulation_actions' 
    ]
};
export default permissions;