// constants.js
export const PERMISSIONS = {
            cliente: [
                'view_tools_description',
                'request_module',
                'view_own_protocols',
                'filter_own_protocols'
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
                'self_assign_protocol',
                'encaminhar_resolucao',
                'encerrar_protocolo'
            ],
            gestor_ti: [
                'view_tools_description',
                'request_module',
                'view_own_protocols',
                'filter_own_protocols',
                'access_panel_links',
                'view_all_protocols',
                'self_assign_protocol',
                'view_analyst_indices',
                'analisar_resolucao',
                'aprovar_resolucao',
                'ponto_melhoria'
            ],
            Administrador: [
                'view_tools_description',
                'request_module',
                'view_own_protocols',
                'filter_own_protocols',
                'access_panel_links',
                'view_all_protocols',
                'self_assign_protocol',
                'view_analyst_indices',
                'analisar_resolucao',
                'aprovar_resolucao',
                'ponto_melhoria',
                'encerrar_protocolo',
                'encaminhar_resolucao'
            ]
        };

export const TAGS = [
        // Linguagens de Programação
        { name: "JavaScript", class: "tag-javascript" },
        { name: "Python", class: "tag-python" },
        { name: "Java", class: "tag-java" },
        { name: "C", class: "tag-c" },
        { name: "C++", class: "tag-cpp" },
        { name: "C#", class: "tag-csharp" },
        { name: "PHP", class: "tag-php" },
        { name: "Ruby", class: "tag-ruby" },
        { name: "Go", class: "tag-go" },
        { name: "Rust", class: "tag-rust" },
        { name: "Kotlin", class: "tag-kotlin" },
        { name: "Swift", class: "tag-swift" },
        { name: "TypeScript", class: "tag-typescript" },

        // Bancos de Dados
        { name: "MySQL", class: "tag-mysql" },
        { name: "PostgreSQL", class: "tag-postgresql" },
        { name: "MongoDB", class: "tag-mongodb" },
        { name: "Oracle", class: "tag-oracle" },
        { name: "SQLite", class: "tag-sqlite" },
        { name: "Redis", class: "tag-redis" },
        { name: "Cassandra", class: "tag-cassandra" },
        { name: "Firebird", class: "tag-firebird" },

        // SGBDs
        { name: "SQL Server", class: "tag-sql-server" },
        { name: "DB2", class: "tag-db2" },
        { name: "Sybase", class: "tag-sybase" },
        { name: "Informix", class: "tag-informix" },
        { name: "DynamoDB", class: "tag-dynamodb" }
    ];