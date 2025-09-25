import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

const EVOLUX_API_TOKEN = process.env.EVOLUX_API_TOKEN;
const EVOLUX_REPORTS_URL = 'https://maida.evolux.io/api/v1/report/answered_abandoned_sla';
const reportsCache = new NodeCache({ stdTTL: 600, checkperiod: 610 });
const gruposDeFila = [];

router.get('/filters-options', isAuthenticated, (req, res) => {
    try {
        const groups = gruposDeFila.map(g => ({ id: g.groupId, name: g.name }));
        const allQueuesMap = new Map();
        gruposDeFila.forEach(grupo => {
            grupo.queueIds.forEach(id => {
                if (!allQueuesMap.has(id)) {
                    allQueuesMap.set(id, { id: id, name: `Fila ID ${id}` });
                }
            });
        });
        const queues = Array.from(allQueuesMap.values());
        res.json({ groups, queues });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar opções de filtro' });
    }
});

router.get('/sla', isAuthenticated, async (req, res) => {
    const { startDate, endDate, filterType, filterValue } = req.query;

    if (!startDate || !endDate || !filterType || !filterValue) {
        return res.status(400).json({ error: 'Todos os filtros são obrigatórios.' });
    }
    
    const cacheKey = `report_sla_${filterType}_${filterValue}_${startDate}_${endDate}`;
    if (reportsCache.has(cacheKey)) {
        return res.json(reportsCache.get(cacheKey));
    }

    const isoStartDate = `${startDate}T03:00:00.000Z`;
    const tempEndDate = new Date(endDate);
    tempEndDate.setDate(tempEndDate.getDate() + 1);
    const isoEndDate = `${tempEndDate.toISOString().split('T')[0]}T02:59:59.999Z`;

    const reportParams = { start_date: isoStartDate, end_date: isoEndDate, group_by: 'day', start_hour: '07', end_hour: '19' };
    if (filterType === 'group') {
        reportParams.entity = 'queue_groups';
        reportParams.queue_group_ids = filterValue;
    } else {
        reportParams.entity = 'queues';
        reportParams.queues_ids = filterValue;
        reportParams.queue_or_group = 'queues';
    }

    try {
        const headers = { 'token': EVOLUX_API_TOKEN, 'User-Agent': 'Mozilla/5.0' };
        const response = await axios.get(EVOLUX_REPORTS_URL, { headers, params: reportParams });
        const responseData = response.data;
        responseData.requestInfo = { filterType, filterValue };
        reportsCache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (error) {
        if (error.response) {
            console.error('Erro detalhado da API de Relatório SLA:', JSON.stringify(error.response.data, null, 2));
            res.status(error.response.status).json(error.response.data);
        } else {
            console.error('Erro ao conectar com a API de Relatório SLA:', error.message);
            res.status(500).json({ error: 'Falha ao conectar com o servidor' });
        }
    }
});

export default router;