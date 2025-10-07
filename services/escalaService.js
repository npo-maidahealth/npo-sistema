import { DateTime } from 'luxon';
import prisma from '../db/prisma.js'; 

export async function getReguladorAtual(fila = null, fonte = null) {
  try {
    const agora = DateTime.now().setZone('America/Fortaleza');
    const diaSemana = agora.weekday;
    const horaAtual = agora.toFormat('HH:mm');

    console.log(`🔍 Buscando regulador - Dia: ${diaSemana}, Hora: ${horaAtual}, Fila: ${fila}, Fonte: ${fonte}`);

    const escalas = await prisma.escala.findMany({
      where: {
        Regulador: { ativo: true },
        diaSemana,
        horaInicio: { lte: horaAtual },
        horaFim: { gte: horaAtual }
      },
      include: { 
        Regulador: true 
      },
      orderBy: { id: 'asc' }
    });

    console.log(`📊 Escalas encontradas: ${escalas.length}`);

    if (escalas.length === 0) {
      console.log('❌ Nenhuma escala encontrada para o horário atual');
      return null;
    }

    let regulador = null;
    if (fila || fonte) {
      const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const filaBuscada = normalize(fila);
      const fonteBuscada = normalize(fonte);

      console.log(`🎯 Buscando por fila: "${filaBuscada}", fonte: "${fonteBuscada}"`);

      const escalaFiltrada = escalas.find(e => {
        const filasArray = e.filas.split(',').map(f => normalize(f.trim()));
        console.log(`📋 Filas disponíveis: ${filasArray.join(', ')}`);
        
        const encontrou = filasArray.includes(filaBuscada) ||
               (fonteBuscada === 'SISWEB' && filasArray.includes('SISWEB')) ||
               filasArray.includes('TODAS') ||
               filasArray.includes('ECO');
        
        console.log(`✅ Filtro aplicado: ${encontrou ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
        return encontrou;
      });

      if (escalaFiltrada) {
        regulador = escalaFiltrada.Regulador;
        console.log(`✅ Regulador encontrado: ${regulador.nome}`);
      } else {
        console.log('❌ Nenhum regulador encontrado para os critérios específicos');
        regulador = escalas[0].Regulador;
        console.log(`🔄 Usando regulador padrão: ${regulador.nome}`);
      }
    } else {
      regulador = escalas[0].Regulador;
      console.log(`🔹 Usando primeiro regulador disponível: ${regulador.nome}`);
    }

    return regulador;
  } catch (err) {
    console.error('❌ Erro na função getReguladorAtual:', err);
    return null;
  }
}