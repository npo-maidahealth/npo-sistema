import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

const EVOLUX_API_TOKEN = process.env.EVOLUX_API_TOKEN || '53503b37-039a-4b18-9fbc-e925f7c71521';
const EVOLUX_REALTIME_URL = 'https://maida.evolux.io/api/realtime/v1/queue';
const EVOLUX_REPORTS_URL = 'https://maida.evolux.io/api/v1/report/answered_abandoned_sla';
const EVOLUX_CALLS_REPORT_URL = 'https://maida.evolux.io/api/v1/report/calls_history';

const realtimeCache = new NodeCache({ stdTTL: 5, checkperiod: 7 });
const lastCallsCache = new NodeCache({ stdTTL: 300, checkperiod: 310 });
const tmaTmeCache = new NodeCache({ stdTTL: 60, checkperiod: 70 });
const abandonoDiaCache = new NodeCache({ stdTTL: 60, checkperiod: 70 });
const variationCache = new NodeCache({ stdTTL: 300, checkperiod: 310 });

const gruposDeFila = [
    { name: "ISSEC", groupId: 52, queueIds: [514, 515] },
    { name: "Plano de ação PLANSERV", groupId: 40, queueIds: [371, 250, 248, 249, 155, 157, 158, 325, 251, 276, 417] },
    { name: "Planserv - Beneficiários", groupId: 34, queueIds: [248, 249, 276, 155, 251, 325, 157, 158, 274, 417] },
    { name: "Planserv - Central de atendimento", groupId: 18, queueIds: [18, 157, 713, 325, 158, 274, 709, 714, 248, 249, 250, 251, 253, 256, 257, 258, 371, 417] },
    { name: "Planserv geral", groupId: 25, queueIds: [25, 362, 367, 371, 275, 325, 155, 250, 257, 258, 157, 248, 249, 253, 254, 256, 274, 158, 276, 710, 713, 712, 714] },
    { name: "PLANSERV IR", groupId: 36, queueIds: [36, 155] },
    { name: "Planserv - Ouvidoria", groupId: 23, queueIds: [23, 252, 158] },
    { name: "Planserv - Prestador", groupId: 35, queueIds: [35, 371, 250, 253, 254, 256, 257, 258, 712, 714, 709, 713, 710] },
    { name: "Planserv - Remoções", groupId: 22, queueIds: [22, 274, 256] },
    { name: "Sassepe - Central de Atendimento", groupId: 54, queueIds: [54, 357, 521, 522] },
    { name: "Senado", groupId: 55, queueIds: [55, 528] },
    { name: "INAS GDF SAÚDE", groupId: 41, queueIds: [41, 24, 25, 29, 31, 34, 35] },
    { name: "SC SAÚDE - Central de atendimento", groupId: 48, queueIds: [48, 470, 471] }
];

router.use(isAuthenticated);

router.get('/filas', async (req, res) => {
    const cacheKey = 'dados_em_tempo_real';
    if (realtimeCache.has(cacheKey)) {
        return res.json({ dados: realtimeCache.get(cacheKey) });
    }
    try {
        const headers = { 'token': EVOLUX_API_TOKEN, 'User-Agent': 'Mozilla/5.0' };
        const response = await axios.get(EVOLUX_REALTIME_URL, { headers });
        const data = response.data.data || {};
        data.server_time = new Date().toISOString();
        realtimeCache.set(cacheKey, data);
        res.json({ dados: data });
    } catch (error) {
        console.error(`Erro na API Realtime:`, error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao buscar dados em tempo real' });
    }
});
router.get('/ultimas-chamadas', async (req, res) => {
    const nomeDoGrupo = req.query.grupo;
    const grupo = gruposDeFila.find(g => g.name === nomeDoGrupo);
    if (!grupo) return res.status(400).json({ error: 'Grupo não encontrado' });
    const cacheKey = `ultimas_chamadas_${grupo.groupId}`;
    if (lastCallsCache.has(cacheKey)) {
        return res.json(lastCallsCache.get(cacheKey));
    }
    try {
        const headers = { 'token': EVOLUX_API_TOKEN, 'User-Agent': 'Mozilla/5.0' };
        const agora = new Date();
        const start_date = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0).toISOString();
        const end_date = agora.toISOString();
        const reportParams = { start_date, end_date, entity: 'queue_groups', queue_group_ids: grupo.groupId, limit: 500 };
        const reportResponse = await axios.get(EVOLUX_CALLS_REPORT_URL, { headers, params: reportParams });
        const calls = reportResponse.data.data.calls || [];
        const lastCalls = {};
        for (const call of calls) {
            if (call.agent_id && call.time_leave) {
                const callEndTime = new Date(call.time_leave).getTime();
                if (!lastCalls[call.agent_id] || callEndTime > lastCalls[call.agent_id]) {
                    lastCalls[call.agent_id] = callEndTime;
                }
            }
        }
        lastCallsCache.set(cacheKey, lastCalls);
        res.json(lastCalls);
    } catch (error) {
        console.error(`Erro na API de Relatório de Chamadas:`, error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao buscar relatório de chamadas' });
    }
});

router.get('/indicadores/tma-tme', async (req, res) => {
    const nomeDoGrupo = req.query.grupo;
    const grupo = gruposDeFila.find(g => g.name === nomeDoGrupo);
    if (!grupo) return res.status(400).json({ error: 'Grupo não encontrado' });

    const cacheKey = `tma_tme_${grupo.groupId}`;
    if (tmaTmeCache.has(cacheKey)) {
        return res.json(tmaTmeCache.get(cacheKey));
    }
    try {
        const headers = { 'token': EVOLUX_API_TOKEN, 'User-Agent': 'Mozilla/5.0' };
        const agoraUTC = new Date();
        const agoraFortaleza = new Date(agoraUTC.getTime() - (3 * 60 * 60 * 1000));
        const year = agoraFortaleza.getUTCFullYear();
        const month = agoraFortaleza.getUTCMonth();
        const day = agoraFortaleza.getUTCDate();
        const inicioDoDiaUTC = new Date(Date.UTC(year, month, day, 3, 0, 0));
        
        const params = {
            start_date: inicioDoDiaUTC.toISOString(),
            end_date: agoraUTC.toISOString(),
            entity: 'queue_groups',
            queue_group_ids: grupo.groupId,
            group_by: 'day'
        };

        const response = await axios.get(EVOLUX_REPORTS_URL, { headers, params });
        const totais = response.data.data.find(item => item.label === 'Total');
        const resultado = {
            tma: totais ? totais.att || 0 : 0,
            tme: totais ? totais.asa || 0 : 0,
        };
        tmaTmeCache.set(cacheKey, resultado);
        res.json(resultado);
    } catch (error) {
        console.error(`Erro na API de TMA/TME:`, error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao buscar TMA/TME' });
    }
});

router.get('/indicadores/abandono-dia', async (req, res) => {
    const nomeDoGrupo = req.query.grupo;
    const grupo = gruposDeFila.find(g => g.name === nomeDoGrupo);
    if (!grupo) return res.status(400).json({ error: 'Grupo não encontrado' });

    const cacheKey = `abandono_dia_${grupo.groupId}`;
    if (abandonoDiaCache.has(cacheKey)) {
        return res.json(abandonoDiaCache.get(cacheKey));
    }
    try {
        const headers = { 'token': EVOLUX_API_TOKEN, 'User-Agent': 'Mozilla/5.0' };
        const agoraUTC = new Date();
        const agoraFortaleza = new Date(agoraUTC.getTime() - (3 * 60 * 60 * 1000));
        const year = agoraFortaleza.getUTCFullYear();
        const month = agoraFortaleza.getUTCMonth();
        const day = agoraFortaleza.getUTCDate();
        const inicioDoDiaUTC = new Date(Date.UTC(year, month, day, 3, 0, 0));
        
        const params = {
            start_date: inicioDoDiaUTC.toISOString(),
            end_date: agoraUTC.toISOString(),
            entity: 'queue_groups',
            queue_group_ids: grupo.groupId,
            group_by: 'day',
            start_hour: '07', 
            end_hour: '19'
        };
        
        const response = await axios.get(EVOLUX_REPORTS_URL, { headers, params });
        const totais = response.data.data.find(item => item.label === 'Total');
        const resultado = {
            abandono_dia_acumulado: totais ? (totais.abandoned_percent || 0) : 0,
        };
        abandonoDiaCache.set(cacheKey, resultado);
        res.json(resultado);
    } catch (error) {
        console.error(`Erro na API de Abandono Dia:`, error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao buscar abandono do dia' });
    }
});

router.get('/indicadores/variacao', async (req, res) => {
    const nomeDoGrupo = req.query.grupo;
    const grupo = gruposDeFila.find(g => g.name === nomeDoGrupo);
    if (!grupo) return res.status(400).json({ error: 'Grupo não encontrado' });

    const cacheKey = `indicadores_variacao_${grupo.groupId}`;
    if (variationCache.has(cacheKey)) {
        return res.json(variationCache.get(cacheKey));
    }
    try {
        const headers = { 'token': EVOLUX_API_TOKEN, 'User-Agent': 'Mozilla/5.0' };
        const getRate = async (start, end) => {
            const params = {
                start_date: start,
                end_date: end,
                entity: 'queue_groups',
                queue_group_ids: grupo.groupId,
                group_by: 'day',
                start_hour: '07',
                end_hour: '19'
            };
            const response = await axios.get(EVOLUX_REPORTS_URL, { headers, params });
            const totais = response.data.data.find(item => item.label === 'Total');
            return totais ? (totais.abandoned_percent || 0) : 0;
        };
        
        const agoraUTC = new Date();
        const agoraFortaleza = new Date(agoraUTC.getTime() - (3 * 60 * 60 * 1000));
        const year = agoraFortaleza.getUTCFullYear();
        const month = agoraFortaleza.getUTCMonth();
        const day = agoraFortaleza.getUTCDate();
        const inicioDoDiaUTC = new Date(Date.UTC(year, month, day, 3, 0, 0));
        const umaHoraAtrasUTC = new Date(agoraUTC.getTime() - (1 * 60 * 60 * 1000));

        const taxaDiaAcumulado = await getRate(inicioDoDiaUTC.toISOString(), agoraUTC.toISOString());
        const taxaUmaHoraAtras = await getRate(inicioDoDiaUTC.toISOString(), umaHoraAtrasUTC.toISOString());
        
        const resultado = {
            abandono_dia_acumulado: taxaDiaAcumulado,
            abandono_inicio_hora: taxaUmaHoraAtras 
        };

        variationCache.set(cacheKey, resultado);
        res.json(resultado);
    } catch (error) {
        console.error(`Erro na API de Variação de Indicadores:`, error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao buscar variação de indicadores' });
    }
});


export default router;