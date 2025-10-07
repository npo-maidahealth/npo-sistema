import express from 'express';
import prisma from '../db/prisma.js'; 
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { getReguladorAtual } from '../services/escalaService.js';
import { gerarProtocoloSPG } from '../services/protocoloGerador.js'; 
import { fetchGuiaDetalhes } from '../services/ecoService.js'; // A função que resolve o token e a URL

const router = express.Router();

// ===================================
// Rota de Consulta Detalhada da Guia (ECO)
// ===================================
router.get('/consulta-detalhada/:numeroGuia', isAuthenticated, async (req, res) => {
    const { numeroGuia } = req.params;
    let guiaDetalhes;

    try {
        // 1. BUSCA DA GUIA NO ECO via Service Layer
        guiaDetalhes = await fetchGuiaDetalhes(numeroGuia); 

        if (!guiaDetalhes) {
            return res.status(404).json({ message: 'Guia não encontrada no ECO.' });
        }

    } catch (ecoError) {
        console.error('Erro ao buscar guia no ECO (no Prioridades.routes):', ecoError);
        return res.status(500).json({ 
            message: 'Erro ao consultar detalhes da guia na API externa.', 
            error: ecoError.message 
        });
    }

    // 2. BUSCA NO PRISMA E COMBINAÇÃO DE DADOS (APENAS PARA LER)
    try {
        const numeroGuiaParaBusca = guiaDetalhes.autorizacaoGuia || numeroGuia; 

        const prioridadeExistente = await prisma.prioridade.findFirst({
          where: { numeroGuia: numeroGuiaParaBusca },
          orderBy: { dataCriacao: 'desc' },
          include: {
            solicitacoes: { 
              select: { id: true }
            }
          }
        });
        
        // Lógica para determinar o status final da guia 
        const itensSolicitados = guiaDetalhes.itensSolicitados || []; 
        const todosAutorizados = itensSolicitados.length > 0 && itensSolicitados.every(item => item.status?.toUpperCase() === 'AUTORIZADO');
        let statusCorrigido = guiaDetalhes.statusRegulacao || 'PENDENTE';
        if (todosAutorizados) {
            statusCorrigido = 'AUTORIZADA';
            console.log(`Status agregado forçado para AUTORIZADA na guia ${numeroGuia}`);
        }
        
        const resultado = {
            ...guiaDetalhes,
            statusRegulacao: prioridadeExistente?.status || statusCorrigido,  // Usa status existente, se houver, ou o corrigido
            observacao: prioridadeExistente?.observacao || guiaDetalhes.observacao || '',
            quantidadeSolicitacoes: prioridadeExistente?.vezesSolicitado || 0,
            prioridadeExistente: !!prioridadeExistente // Flag para o frontend
        };
        
        // Busca do Produto (mantida para obter o ID)
        let produtoId = 1; // Default
        const produto = await prisma.produto.findFirst({
            where: { nome: guiaDetalhes.nomeCliente || 'DEFAULT' } 
        });
        if (produto) {
            produtoId = produto.id;
        }

        // 5. Resposta final (Objeto Guia + ID do Produto)
        res.json({
            ...resultado,
            produtoId: produtoId // ID do produto para o frontend usar no envio de prioridade (POST)
        });

    } catch (prismaError) {
        console.error('Erro ao consultar prioridade no Prisma ou combinar dados:', prismaError);
        res.status(500).json({ 
            message: 'Erro interno ao consultar status de prioridade ou combinar dados.', 
            error: prismaError.message 
        });
    }
});

router.get('/consulta/:numeroGuia', isAuthenticated, async (req, res) => {
  try {
    const { numeroGuia } = req.params;
    
    // 1. BUSCA COMPLETA NO PRISMA
    const prioridades = await prisma.prioridade.findMany({
      where: { numeroGuia },
      include: {
        solicitacoes: { 
          select: {
            protocoloSPG: true,
            dataHoraSolicitacao: true,
            usuarioSolicitante: {
              select: { nome: true }
            }
          },
          orderBy: { dataHoraSolicitacao: 'desc' }
        }
      },
      orderBy: { dataCriacao: 'desc' }
    });

    // 2. VERIFICA SE ENCONTROU
    if (prioridades.length === 0) {
      return res.status(404).json({ message: 'Nenhuma prioridade encontrada para esta guia.' });
    }
    
    // 3. SELECIONA O REGISTRO MAIS RECENTE
    const maisRecente = prioridades[0];
    
    // 4. CALCULAR vezesSolicitado DINAMICAMENTE (soma de todas as solicitações)
    const vezesSolicitado = maisRecente.solicitacoes.length;

    const resultado = {
      // Agora calculado dinamicamente
      quantidade: vezesSolicitado,
      
      // Lista de todas as solicitações (protocolos)
      solicitacoes: maisRecente.solicitacoes.map(s => ({
        protocolo: s.protocoloSPG,
        dataHora: s.dataHoraSolicitacao,
        solicitante: s.usuarioSolicitante.nome
      })),
      
      beneficiario: maisRecente.beneficiario || 'Não informado',
      cartaoBeneficiario: maisRecente.cartaoBeneficiario || 'Não informado',
      cpfBeneficiario: maisRecente.cpfBeneficiario || 'Não informado',
      
      numeroGuia: numeroGuia,
      tipoGuia: maisRecente.tipoGuia,
      dataVencimentoSla: maisRecente.dataVencimentoSla,
      
      status: maisRecente.status || 'Pendente', 
      fila: maisRecente.fila || 'Não Informada',
      fonte: maisRecente.fonte,
      observacao: maisRecente.observacao,
      dataCriacao: maisRecente.dataCriacao,
      dataAtualizacao: maisRecente.dataAtualizacao,
    };

    res.json(resultado);
  } catch (err) {
    console.error('Erro ao consultar prioridades por guia:', err);
    res.status(500).json({ message: 'Erro interno ao consultar prioridades.', error: err.message });
  }
});
// ==========================
// PROTOCOLO
// ==========================
router.post('/protocolo', isAuthenticated, async (req, res) => {
    try {
        const novoProtocolo = await gerarProtocoloSPG();
        res.json({ protocolo: novoProtocolo });
    } catch (err) {
        console.error('Erro ao gerar protocolo:', err);
        res.status(500).json({ message: 'Erro interno ao gerar protocolo', error: err.message });
    }
});
// ==========================
// Criar prioridade 
// ==========================
router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log('=== DADOS RECEBIDOS DO FRONTEND ===');
    console.log('Body completo:', JSON.stringify(req.body, null, 2));

    const {
      numeroGuia, tipoGuia, status, caracterAtendimento, observacao, nomeProduto, produtoId,
      beneficiario, beneficiarioNomeSocial, cartaoBeneficiario, cpfBeneficiario,
      dataHoraSolicitacao, dataPausaSla, dataRegulacao, dataSolicitacao, dataVencimentoSla,
      fila, atrasada, atrasoRegulacao, area, capturada, fonte, idGuiaECO, protocoloSPG
    } = req.body;

    if (!protocoloSPG) {
      return res.status(400).json({ message: 'O número de protocolo é obrigatório.' });
    }

    const usuarioId = req.session.user?.id;
    if (!usuarioId) return res.status(401).json({ message: 'Usuário não autenticado' });

    if (capturada) {
      console.log('Guia capturada, removendo...');
      await prisma.prioridade.deleteMany({ where: { numeroGuia } });
      return res.json({ message: `Prioridade ${numeroGuia} capturada e removida do banco` });
    }

    const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const filaNormalizada = normalize(fila || caracterAtendimento || '');
    console.log('Fila normalizada para busca de regulador:', filaNormalizada);

    let reguladorDePlantaoId = null;
    const reguladorData = await getReguladorAtual(filaNormalizada, fonte);
    console.log('Regulador encontrado:', reguladorData ? reguladorData.nome : 'Nenhum');

    if (reguladorData) {
      reguladorDePlantaoId = reguladorData.id;
      console.log(`Regulador de plantão encontrado: ${reguladorData.nome} (ID: ${reguladorDePlantaoId}) para fila '${filaNormalizada}'`);
    } else {
      console.log(`Nenhum regulador de plantão encontrado para a fila: ${filaNormalizada}`);
    }

    let produtoIdFinal = produtoId || 1;
    let produtoNome = nomeProduto || 'Produto Default';
    let produto = await prisma.produto.findUnique({ where: { id: produtoIdFinal } });
    if (!produto) {
      console.log(`Produto ID ${produtoIdFinal} não encontrado. Criando novo com nome: ${produtoNome}`);
      produto = await prisma.produto.create({
        data: { id: produtoIdFinal, nome: produtoNome }
      });
      produtoIdFinal = produto.id;
    } else {
      console.log('Produto encontrado:', produto.nome);
    }

    console.log('Produto ID final:', produtoIdFinal);
    if (!produtoIdFinal) {
      console.log('ERRO: Produto ID é obrigatório');
      return res.status(400).json({ message: 'Produto ID é obrigatório. Envie produtoId ou nomeProduto.' });
    }

    const prioridadeExistente = await prisma.prioridade.findFirst({
      where: {
        numeroGuia: numeroGuia,
        regulada: false,
      },
    });

    let prioridade;
    
    if (prioridadeExistente) {
      console.log('Prioridade existente encontrada, atualizando dados...');
      const novaAutorizada = status.toUpperCase() === 'AUTORIZADA' ? true : prioridadeExistente.autorizada;
      
      prioridade = await prisma.prioridade.update({
        where: { id: prioridadeExistente.id },
        data: {
          reguladorId: reguladorDePlantaoId,
          observacao,
          dataAtualizacao: new Date(),
          autorizada: novaAutorizada,
          fonte: fonte || prioridadeExistente.fonte,
          status: status || prioridadeExistente.status // Atualiza status também
        },
      });
    } else {
      // Criar nova prioridade
      console.log('Nenhuma prioridade pendente encontrada, criando uma nova...');
      const isAutorizada = status.toUpperCase() === 'AUTORIZADA';

      prioridade = await prisma.prioridade.create({
        data: {
          numeroGuia,
          tipoGuia,
          status,
          idGuiaECO: idGuiaECO,
          fonte: fonte || 'ECO',
          produtoId: produtoIdFinal,
          usuarioId: usuarioId,
          reguladorId: reguladorDePlantaoId,
          caracterAtendimento: caracterAtendimento || fila || '',
          fila: fila || '',
          area: area || '',
          observacao: observacao || '',
          beneficiario: beneficiario || '',
          beneficiarioNomeSocial: beneficiarioNomeSocial || '',
          cartaoBeneficiario: cartaoBeneficiario || '',
          cpfBeneficiario: cpfBeneficiario || '',
          dataHoraSolicitacao: dataHoraSolicitacao ? new Date(dataHoraSolicitacao) : null,
          dataSolicitacao: dataSolicitacao ? new Date(dataSolicitacao) : null,
          dataVencimentoSla: dataVencimentoSla ? new Date(dataVencimentoSla) : null,
          dataPausaSla: dataPausaSla ? new Date(dataPausaSla) : null,
          dataRegulacao: dataRegulacao ? new Date(dataRegulacao) : null,
          atrasada: atrasada || false,
          atrasoRegulacao: atrasoRegulacao || '',
          capturada: false,
          autorizada: isAutorizada,
        }
      });
    }

    // SEMPRE criar nova solicitação (mesmo para prioridade existente)
    const solicitacao = await prisma.solicitacaoPrioridade.create({
      data: {
        prioridadeId: prioridade.id,
        protocoloSPG: protocoloSPG,
        dataHoraSolicitacao: new Date(),
        observacaoSolicitacao: observacao || '',
        reguladorPlantaoId: reguladorDePlantaoId,
        usuarioSolicitanteId: usuarioId // quem solicitou
      },
      include: {
        usuarioSolicitante: {
          select: { nome: true }
        },
        reguladorPlantao: {
          select: { nome: true }
        }
      }
    });

    console.log('Nova solicitação de prioridade criada:', solicitacao);
    console.log('Protocolo:', solicitacao.protocoloSPG);
    console.log('Solicitante:', solicitacao.usuarioSolicitante.nome);
    console.log('ReguladorDePlantao:', solicitacao.reguladorPlantao?.nome || 'Nenhum');

    console.log('Prioridade processada com sucesso:', prioridade);
    res.json({ 
      message: 'Prioridade processada com sucesso', 
      prioridade,
      solicitacao: {
        protocolo: solicitacao.protocoloSPG,
        solicitante: solicitacao.usuarioSolicitante.nome,
        dataHora: solicitacao.dataHoraSolicitacao
      }
    });

  } catch (err) {
    // Captura se o protocolo gerado já foi salvo por outro usuário.
    if (err.code === 'P2002' && err.meta?.target.includes('protocoloSPG')) {
      console.error('Tentativa de duplicidade de protocolo (concorrência):', err);
      return res.status(409).json({ message: 'Erro de concorrência: O protocolo gerado já existe. Tente novamente.', error: 'PROTOCOLO_DUPLICADO' });
    }
    console.error('ERRO COMPLETO ao processar prioridade:', err);
    res.status(500).json({ message: 'Erro interno ao processar prioridade', error: err.message });
  }
});

// ==========================
// Voltar prioridade para a fila
// ==========================
router.patch('/:id/voltar', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.prioridade.update({
      where: { id: parseInt(id) },
      data: { 
        reguladorId: null, 
        regulada: false,
        dataRegulacao: null
      }
    });
    res.json({ message: 'Prioridade retornou à fila' });
  } catch (err) {
    console.error('Erro ao voltar prioridade:', err);
    res.status(500).json({ message: 'Erro interno ao voltar prioridade', error: err.message });
  }
});

// ==========================
// Listar todas as prioridades (para relatórios/administrador)
// ==========================
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, produtoId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { capturada: false };
    if (status) where.status = status;
    if (produtoId) where.produtoId = parseInt(produtoId);

    const [prioridades, total] = await Promise.all([
      prisma.prioridade.findMany({
        where,
        include: {
          produto: true,
          usuario: {
            select: { nome: true, email: true }
          },
          regulador: {
            select: { nome: true, email: true }
          }
        },
        orderBy: { dataCriacao: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.prioridade.count({ where })
    ]);

    res.json({
      prioridades,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('Erro ao listar prioridades:', err);
    res.status(500).json({ message: 'Erro interno ao listar prioridades', error: err.message });
  }
});

// ==========================
// Buscar prioridade por ID
// ==========================
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const prioridade = await prisma.prioridade.findUnique({
      where: { id: parseInt(id) },
      include: {
        produto: true,
        usuario: {
          select: { nome: true, email: true }
        },
        regulador: {
          select: { nome: true, email: true }
        }
      }
    });

    if (!prioridade) {
      return res.status(404).json({ message: 'Prioridade não encontrada' });
    }

    res.json(prioridade);
  } catch (err) {
    console.error('Erro ao buscar prioridade:', err);
    res.status(500).json({ message: 'Erro interno ao buscar prioridade', error: err.message });
  }
});

export default router;