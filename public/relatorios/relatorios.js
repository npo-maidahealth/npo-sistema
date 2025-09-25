document.addEventListener('DOMContentLoaded', () => {
    const filterTypeSelect = document.getElementById('filter-type');
    const groupSelectContainer = document.getElementById('group-selector-container');
    const queueSelectContainer = document.getElementById('queue-selector-container');
    const groupSelect = document.getElementById('select-group');
    const queueSelect = document.getElementById('select-queue');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const generateBtn = document.getElementById('generate-report-btn');
    const errorMessageElement = document.getElementById('error-message');

    let volumeChartInstance = null;
    let slaChartInstance = null;
    let timeChartInstance = null;

    const metasCliente = {
        "52": {
            atendidasPercentMeta: 97.5,
            abandonoPercentMeta: 2.5,
            tmeMeta: 120, 
            tmaMeta: 480, 
            slaMeta: 80, 
            slaTimeThreshold: 30 
        }
    };

    loadFilterOptions();
    setupEventListeners();

    async function loadFilterOptions() {
        try {
            const response = await fetch('/api/filters-options'); 
            const data = await response.json();

            populateSelect(groupSelect, data.groups);
            populateSelect(queueSelect, data.queues);

        } catch (error) {
            console.error('Erro ao carregar filtros:', error);
            errorMessageElement.textContent = 'Erro ao carregar filtros.';
        }
    }

    function populateSelect(selectElement, items) {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            selectElement.appendChild(option);
        });
    }

    function setupEventListeners() {
        filterTypeSelect.addEventListener('change', () => {
            if (filterTypeSelect.value === 'group') {
                groupSelectContainer.style.display = 'block';
                queueSelectContainer.style.display = 'none';
            } else {
                groupSelectContainer.style.display = 'none';
                queueSelectContainer.style.display = 'block';
            }
        });

        generateBtn.addEventListener('click', handleGenerateReport);
    }

    async function handleGenerateReport() {
        errorMessageElement.textContent = '';

        if (!validateInputs()) return;

        const filterType = filterTypeSelect.value;
        const filterValue = (filterType === 'group') ? groupSelect.value : queueSelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        try {
            const queryParams = new URLSearchParams({ startDate, endDate, filterType, filterValue });
            const response = await fetch(`/api/reports/sla?${queryParams}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status}`);
            }

            const result = await response.json();
            processAndRenderData(result);

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            errorMessageElement.textContent = `Falha ao buscar dados: ${error.message}`;
        }
    }

    function validateInputs() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            errorMessageElement.textContent = 'Data inicial e data final são obrigatórias.';
            return false;
        }

        const date1 = new Date(startDate);
        const date2 = new Date(endDate);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 31) {
            errorMessageElement.textContent = 'Período máximo de 31 dias excedido.';
            return false;
        }
        return true;
    }

    function processAndRenderData(result) {
        const dailyData = result.data.filter(entry => entry.label !== 'Total');
        const summaryData = result.data.find(entry => entry.label === 'Total');
        const currentGoals = metasCliente[result.requestInfo.filterValue] || {};

   
        const labels = dailyData.map(entry => entry.label);
        const slaPercent = dailyData.map(entry => entry.in_sla_wait_percent);
        

         // Dados positivos: Chamadas Atendidas
        const answeredCalls = dailyData.map(entry => entry.answered);
        
        // Dados negativos
        const abandonedCallsNegative = dailyData.map(entry => -(entry.abandoned || 0));
        const lostCallsNegative = dailyData.map(entry => -(entry.lost || 0));
        const dropoutCallsNegative = dailyData.map(entry => -(entry.dropout || 0));
        // Extrair dados de TMA e TME diários
        const tmaDataPoints = dailyData.map(entry => entry.att);
        const tmeDataPoints = dailyData.map(entry => entry.asa);


        renderVolumeChart(labels, answeredCalls, abandonedCallsNegative, lostCallsNegative, dropoutCallsNegative);
        renderSlaChart(labels, slaPercent, currentGoals);
        renderTimeChart(labels, tmaDataPoints, tmeDataPoints, currentGoals);

        if (summaryData) {
            updateKpiCards(summaryData, currentGoals);
        }
    }
    
    function updateKpiCards(summary, goals) {
    
        const tmaCard = document.getElementById('kpi-tma').closest('.kpi-card');
        const tmeCard = document.getElementById('kpi-tme').closest('.kpi-card');
        const slaCard = document.getElementById('kpi-sla').closest('.kpi-card');
        const abandonmentCard = document.getElementById('kpi-abandonment').closest('.kpi-card');

  
        [tmaCard, tmeCard, slaCard, abandonmentCard].forEach(card => {
            card.classList.remove('kpi-good', 'kpi-bad');
        });

        const tmaValue = summary.att;
        const tmeValue = summary.asa;
        const slaValue = summary.in_sla_wait_percent;
        const abandonmentValue = summary.abandoned_percent;

        document.getElementById('kpi-tma').textContent = formatTime(tmaValue);
        if (goals.tmaMeta) {
            document.getElementById('kpi-meta-tma').textContent = `Meta: ${formatTime(goals.tmaMeta)}`;
            if (tmaValue <= goals.tmaMeta) {
                tmaCard.classList.add('kpi-good');
            } else {
                tmaCard.classList.add('kpi-bad');
            }
        }

        document.getElementById('kpi-tme').textContent = formatTime(tmeValue);
        if (goals.tmeMeta) {
            document.getElementById('kpi-meta-tme').textContent = `Meta: ${formatTime(goals.tmeMeta)}`;
            if (tmeValue <= goals.tmeMeta) {
                tmeCard.classList.add('kpi-good');
            } else {
                tmeCard.classList.add('kpi-bad');
            }
        }

        document.getElementById('kpi-sla').textContent = `${slaValue.toFixed(2)}%`;
        if (goals.slaMeta) {
            document.getElementById('kpi-meta-sla').textContent = `Meta: ${goals.slaMeta.toFixed(2)}%`;
            if (slaValue >= goals.slaMeta) {
                slaCard.classList.add('kpi-good');
            } else {
                slaCard.classList.add('kpi-bad');
            }
        }

        document.getElementById('kpi-abandonment').textContent = `${abandonmentValue.toFixed(2)}%`;
        if (goals.abandonoPercentMeta) {
            document.getElementById('kpi-meta-abandonment').textContent = `Meta: < ${goals.abandonoPercentMeta.toFixed(2)}%`;
            if (abandonmentValue <= goals.abandonoPercentMeta) {
                abandonmentCard.classList.add('kpi-good');
            } else {
                abandonmentCard.classList.add('kpi-bad');
            }
        }
    }

    function renderSlaChart(labels, slaPercent, goals) {
        const ctx = document.getElementById('slaChart').getContext('2d');
        if (slaChartInstance) slaChartInstance.destroy();

        const datasets = [{
            label: '% Nível de Serviço (SLA)',
            data: slaPercent,
            borderColor: '#224aa2',
            fill: false,
            tension: 0.1
        }];


        if (goals.slaMeta) {
            datasets.push({
                label: `Meta SLA (${goals.slaMeta}%)`,
                data: Array(labels.length).fill(goals.slaMeta),
                borderColor: '#e0526e',
                borderDash: [5, 5], 
                fill: false,
                pointRadius: 0
            });
        }

        slaChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                plugins: { title: { display: true, text: 'Performance do Nível de Serviço vs Meta' } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: value => value + '%' } } }
            }
        });
    }

    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function renderVolumeChart(labels, answeredData, abandonedData, lostData, dropoutData) {
        const ctx = document.getElementById('volumeChart').getContext('2d');
        if (volumeChartInstance) volumeChartInstance.destroy();

        volumeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Atendidas',
                        data: answeredData, 
                        backgroundColor: 'var(--maida-azul)', 
                        stack: 'stack0' 
                    },
                    {
                        label: 'Abandonadas',
                        data: abandonedData, 
                        backgroundColor: 'var(--maida-rosa)', 
                        stack: 'stack1'
                    },
                    {
                        label: 'Perdidas (Lost)',
                        data: lostData, 
                        backgroundColor: '#ffc107', 
                        stack: 'stack1' 
                    },
                    {
                        label: 'Desistências (Dropout)',
                        data: dropoutData, 
                        backgroundColor: '#adb5bd', 
                        stack: 'stack1' 
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Volume de Chamadas (Atendidas vs Perdas Detalhadas)' 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${Math.abs(context.raw)}`;
                            }
                        }
                    }
                },
                scales: { 
                    x: { 
                        stacked: true 
                    }, 
                    y: { 
                        stacked: true,
                        ticks: {
                            callback: function(value) {
                                return Math.abs(value);
                            }
                        }
                    } 
                }
            }
        });
    }
    function renderTimeChart(labels, tmaData, tmeData, goals) {
        const ctx = document.getElementById('timeChart').getContext('2d');
        if (timeChartInstance) timeChartInstance.destroy();

        const datasets = [
            {
                label: 'TMA Diário',
                data: tmaData,
                borderColor: '#007bff', 
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: false,
                tension: 0.1
            },
            {
                label: 'TME Diário',
                data: tmeData,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                fill: false,
                tension: 0.1
            }
        ];

        if (goals.tmaMeta) {
            datasets.push({
                label: `Meta TMA (${formatTime(goals.tmaMeta)})`,
                data: Array(labels.length).fill(goals.tmaMeta),
                borderColor: '#007bff',
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            });
        }
        if (goals.tmeMeta) {
            datasets.push({
                label: `Meta TME (${formatTime(goals.tmeMeta)})`,
                data: Array(labels.length).fill(goals.tmeMeta),
                borderColor: '#ffc107',
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            });
        }

        timeChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Evolução Diária - TMA e TME' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatTime(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatTime(value);
                            }
                        }
                    }
                }
            }
    });
}
});