import express from 'express';
import prisma from '../db/prisma.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { DateTime } from 'luxon';

const router = express.Router();

// ==========================
// Rotas para Reguladores
// ==========================

// Listar todos os reguladores
router.get('/reguladores', isAuthenticated, async (req, res) => {
  try {
    const reguladores = await prisma.regulador.findMany({
      where: { ativo: true },
      include: { 
        Escala: {
          orderBy: [
            { diaSemana: 'asc' },
            { turno: 'asc' }
          ]
        } 
      },
      orderBy: { nome: 'asc' }
    });
    res.json(reguladores);
  } catch (err) {
    console.error('Erro ao buscar reguladores:', err);
    res.status(500).json({ message: 'Erro ao buscar reguladores', error: err.message });
  }
});

// Criar novo regulador
router.post('/reguladores', isAuthenticated, async (req, res) => {
  try {
    const { nome } = req.body;
    
    const reguladorExistente = await prisma.regulador.findFirst({
      where: { nome }
    });
    
    if (reguladorExistente) {
      return res.status(400).json({ message: 'Já existe um regulador com este nome' });
    }
    
    const regulador = await prisma.regulador.create({
      data: { nome }
    });
    
    res.json({ message: 'Regulador criado com sucesso', regulador });
  } catch (err) {
    console.error('Erro ao criar regulador:', err);
    res.status(500).json({ message: 'Erro ao criar regulador', error: err.message });
  }
});

// Atualizar regulador
router.patch('/reguladores/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo, nome } = req.body;
    
    const regulador = await prisma.regulador.update({
      where: { id: parseInt(id) },
      data: { 
        ...(ativo !== undefined && { ativo }),
        ...(nome && { nome })
      }
    });
    
    res.json({ message: 'Regulador atualizado com sucesso', regulador });
  } catch (err) {
    console.error('Erro ao atualizar regulador:', err);
    res.status(500).json({ message: 'Erro ao atualizar regulador', error: err.message });
  }
});

// Deletar regulador
router.delete('/reguladores/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o regulador tem escalas associadas
    const escalas = await prisma.escala.findMany({
      where: { reguladorId: parseInt(id) }
    });
    
    if (escalas.length > 0) {
      return res.status(400).json({ 
        message: 'Não é possível excluir regulador com escalas associadas' 
      });
    }
    
    await prisma.regulador.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Regulador excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir regulador:', err);
    res.status(500).json({ message: 'Erro ao excluir regulador', error: err.message });
  }
});

// ==========================
// Rotas para Escalas
// ==========================

// Listar todas as escalas
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const escalas = await prisma.escala.findMany({
      include: { 
        Regulador: true 
      },
      orderBy: [
        { diaSemana: 'asc' },
        { turno: 'asc' },
        { horaInicio: 'asc' }
      ]
    });
    
    res.json(escalas);
  } catch (err) {
    console.error('Erro ao buscar escalas:', err);
    res.status(500).json({ message: 'Erro ao buscar escalas', error: err.message });
  }
});

// Obter escala semanal
router.get('/semanal', isAuthenticated, async (req, res) => {
  try {
    const escalas = await prisma.escala.findMany({
      include: { 
        Regulador: true 
      },
      orderBy: [
        { diaSemana: 'asc' },
        { turno: 'asc' },
        { horaInicio: 'asc' }
      ]
    });
    
    res.json(escalas);
  } catch (err) {
    console.error('Erro ao buscar escala semanal:', err);
    res.status(500).json({ message: 'Erro ao buscar escala semanal', error: err.message });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { reguladorId, diaSemana, turno, horaInicio, horaFim, filas, observacao } = req.body;
    
    // Normalização após desestruturação (remove acentos, upper, trim).
    const normalizeFilas = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const filasNormalizadas = normalizeFilas(filas || ''); // Usa '' se filas for undefined.
    
    // Verificar se já existe escala para este regulador no mesmo dia e turno
    const escalaExistente = await prisma.escala.findFirst({
      where: {
        reguladorId: parseInt(reguladorId),
        diaSemana: parseInt(diaSemana),
        turno
      }
    });
    
    if (escalaExistente) {
      return res.status(400).json({ 
        message: 'Já existe uma escala para este regulador no mesmo dia e turno' 
      });
    }
    
    // Verificar se horário de início é antes do horário de fim
    const [inicioHora, inicioMinuto] = horaInicio.split(':').map(Number);
    const [fimHora, fimMinuto] = horaFim.split(':').map(Number);
    
    if (inicioHora > fimHora || (inicioHora === fimHora && inicioMinuto >= fimMinuto)) {
      return res.status(400).json({ 
        message: 'Horário de início deve ser antes do horário de fim' 
      });
    }
    
    const escala = await prisma.escala.create({
      data: { 
        reguladorId: parseInt(reguladorId),
        diaSemana: parseInt(diaSemana),
        turno,
        horaInicio,
        horaFim,
        filas: filasNormalizadas, 
        observacao
      },
      include: {
        Regulador: true
      }
    });
    
    res.json({ message: 'Escala criada com sucesso', escala });
  } catch (err) {
    console.error('Erro ao criar escala:', err);
    res.status(500).json({ message: 'Erro ao criar escala', error: err.message });
  }
});

// Atualizar escala
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { reguladorId, diaSemana, turno, horaInicio, horaFim, filas, observacao } = req.body;
    
    const escala = await prisma.escala.update({
      where: { id: parseInt(id) },
      data: { 
        ...(reguladorId && { reguladorId: parseInt(reguladorId) }),
        ...(diaSemana && { diaSemana: parseInt(diaSemana) }),
        ...(turno && { turno }),
        ...(horaInicio && { horaInicio }),
        ...(horaFim && { horaFim }),
        ...(filas && { filas }),
        ...(observacao && { observacao })
      },
      include: {
        Regulador: true
      }
    });
    
    res.json({ message: 'Escala atualizada com sucesso', escala });
  } catch (err) {
    console.error('Erro ao atualizar escala:', err);
    res.status(500).json({ message: 'Erro ao atualizar escala', error: err.message });
  }
});

// Deletar escala
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.escala.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Escala excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir escala:', err);
    res.status(500).json({ message: 'Erro ao excluir escala', error: err.message });
  }
});

// ==========================
// Rota para encontrar o regulador atual
// ==========================


router.get(['/regulador-atual', '/regulador-atual/:fila'], isAuthenticated, async (req, res) => {
    try {
        const { fila } = req.params;
        const agora = DateTime.now().setZone('America/Fortaleza');
        const diaSemana = agora.weekday;
        const horaAtual = agora.toFormat('HH:mm');
        
        // Encontrar todas as escalas ativas para o dia e horário atual
        const escalas = await prisma.escala.findMany({
            where: {
                Regulador: {
                    ativo: true
                },
                diaSemana,
                horaInicio: { lte: horaAtual },
                horaFim: { gte: horaAtual }
            },
            include: { 
                Regulador: true 
            },
        });
        
        // Se foi especificada uma fila, filtrar por ela
        let regulador = null;
        if (fila) {
            const filaBuscada = fila.toUpperCase().trim(); 

            const escalaFiltrada = escalas.find(e => {
            const filasArray = e.filas.split(',').map(f => f.trim().toUpperCase());

                return filasArray.includes(filaBuscada) ||
                      filasArray.includes('TODAS') ||
                      filasArray.includes('ECO');
            });

            regulador = escalaFiltrada ? escalaFiltrada.Regulador : null;
        }
        
        if (!regulador && escalas.length > 0) {
            regulador = escalas[0].Regulador;  
        }
        
        res.json(regulador);
    } catch (err) {
        console.error('Erro ao buscar regulador atual:', err);
        res.status(500).json({ message: 'Erro ao buscar regulador atual', error: err.message });
    }
});

// ==========================
// Rota para importar escala da planilha
// ==========================

router.post('/importar-planilha', isAuthenticated, async (req, res) => {
  try {
    const { dados } = req.body;
    
    if (!dados || !Array.isArray(dados)) {
      return res.status(400).json({ message: 'Dados de importação inválidos' });
    }
    
    const diasMap = {
      'SEGUNDA': 1,
      'TERÇA': 2,
      'QUARTA': 3,
      'QUINTA': 4,
      'SEXTA': 5,
      'SÁBADO': 6,
      'DOMINGO': 7
    };
    
    let importados = 0;
    let errors = [];
    
    for (const item of dados) {
      try {
        const { 'DIA DA SEMANA': dia, 'TURNO': turno, 'NOME': nome, 'FILA': filas, 'HORÁRIO': horario } = item;
        
        if (!dia || !turno || !nome || !filas || !horario) {
          errors.push(`Dados incompletos: ${JSON.stringify(item)}`);
          continue;
        }
        
        // Parse do horário
        const horarioMatch = horario.match(/(\d{1,2}):(\d{2})\s*ATÉ\s*(\d{1,2}):(\d{2})/i);
        if (!horarioMatch) {
          errors.push(`Formato de horário inválido: ${horario}`);
          continue;
        }
        
        const horaInicio = `${horarioMatch[1].padStart(2, '0')}:${horarioMatch[2]}`;
        const horaFim = `${horarioMatch[3].padStart(2, '0')}:${horarioMatch[4]}`;
        
        // Encontrar ou criar regulador
        let regulador = await prisma.regulador.findFirst({
          where: { nome: { equals: nome, mode: 'insensitive' } }
        });
        
        if (!regulador) {
          regulador = await prisma.regulador.create({
            data: { nome }
          });
        }
        
        // Criar escala
        await prisma.escala.create({
          data: {
            reguladorId: regulador.id,
            diaSemana: diasMap[dia.toUpperCase()],
            turno: turno.toUpperCase(),
            horaInicio,
            horaFim,
            filas: filas.toUpperCase()
          }
        });
        
        importados++;
      } catch (error) {
        errors.push(`Erro ao importar item: ${error.message}`);
      }
    }
    
    res.json({
      message: `Importação concluída: ${importados} escalas importadas`,
      importados,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (err) {
    console.error('Erro ao importar planilha:', err);
    res.status(500).json({ message: 'Erro ao importar planilha', error: err.message });
  }
});
//DELETAR ESCALA
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.escala.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Escala excluída com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir escala:', err);
        res.status(500).json({ message: 'Erro ao excluir escala', error: err.message });
    }
});

export default router;