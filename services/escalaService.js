// Arquivo: /services/escalaService.js

import { DateTime } from 'luxon';
import prisma from '../db/prisma.js'; // Importa a conexão centralizada

export async function getReguladorAtual(fila = null, fonte = null) {
  try {
    const agora = DateTime.now().setZone('America/Fortaleza');
    const diaSemana = agora.weekday;
    const horaAtual = agora.toFormat('HH:mm');

    const escalas = await prisma.escala.findMany({
      where: {
        regulador: { ativo: true },
        diaSemana,
        horaInicio: { lte: horaAtual },
        horaFim: { gte: horaAtual }
      },
      include: { regulador: true },
      orderBy: { id: 'asc' }
    });

    if (escalas.length === 0) return null;

    let regulador = null;
    if (fila || fonte) {
      const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const filaBuscada = normalize(fila);
      const fonteBuscada = normalize(fonte);

      const escalaFiltrada = escalas.find(e => {
        const filasArray = e.filas.split(',').map(f => normalize(f));
        return filasArray.includes(filaBuscada) ||
               (fonteBuscada === 'SISWEB' && filasArray.includes('SISWEB')) ||
               filasArray.includes('TODAS') ||
               filasArray.includes('ECO');
      });

      if (escalaFiltrada) {
        regulador = escalaFiltrada.regulador;
      }
    }

    return regulador;
  } catch (err) {
    console.error('Erro na função getReguladorAtual:', err);
    return null;
  }
}