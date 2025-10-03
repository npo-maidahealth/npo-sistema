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
        // 1. BUSCA DA GUIA NO ECO (Maida Health) via Service Layer
        // Usa a função que resolve o token, a URL correta e trata erros.
        guiaDetalhes = await fetchGuiaDetalhes(numeroGuia); 

        if (!guiaDetalhes) {
            return res.status(404).json({ message: 'Guia não encontrada no ECO.' });
        }

    } catch (ecoError) {
        // Trata qualquer erro lançado pelo ecoService (falha de token, falha de API, etc.)
        console.error('Erro ao buscar guia no ECO (no Prioridades.routes):', ecoError);
        return res.status(500).json({ 
            message: 'Erro ao consultar detalhes da guia na API externa.', 
            error: ecoError.message 
        });
    }

    // 2. BUSCA NO PRISMA E COMBINAÇÃO DE DADOS
    try {
        // O frontend espera o 'numeroGuia' real (autorizacaoGuia) para buscar no Prisma
        const numeroGuiaParaBusca = guiaDetalhes.autorizacaoGuia || numeroGuia; 

        const prioridadeExistente = await prisma.prioridade.findFirst({
            where: { numeroGuia: numeroGuiaParaBusca },
            orderBy: { dataCriacao: 'desc' },
            select: { 
                status: true, 
                vezesSolicitado: true, 
                observacao: true 
            }
        });
        
        const resultado = {
            ...guiaDetalhes,
            statusRegulacao: prioridadeExistente?.status || guiaDetalhes.statusRegulacao || 'PENDENTE',
            observacao: prioridadeExistente?.observacao || guiaDetalhes.observacao || '',
            quantidadeSolicitacoes: prioridadeExistente?.vezesSolicitado || 0,
            prioridadeExistente: !!prioridadeExistente // Flag para o frontend
        };
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
          select: {
              dataCriacao: true,
              dataAtualizacao: true, 
              status: true,
              fila: true,
              fonte: true,
              observacao: true,
              numeroGuia: true,  
              vezesSolicitado: true,
              tipoGuia: true,                     
              dataVencimentoSla: true,            
              beneficiario: true,                 
              cartaoBeneficiario: true,           
              cpfBeneficiario: true,              
          },
          orderBy: { dataCriacao: 'desc' }
        });

        // 2. VERIFICA SE ENCONTROU
        if (prioridades.length === 0) {
            return res.status(404).json({ message: 'Nenhuma prioridade encontrada para esta guia.' });
        }
        
        // 3. SELECIONA O REGISTRO MAIS RECENTE E FORMATA O RESULTADO
        const maisRecente = prioridades[0];  
        const resultado = {
            // Usa o campo do banco, ou o count como fallback
            quantidade: maisRecente.vezesSolicitado || prioridades.length, 
            
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
      fila, atrasada, atrasoRegulacao, area, capturada, fonte, idGuiaECO, protocoloSPG  // protocoloSPG is now required for each request
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


    let produtoIdFinal = produtoId || 1;

    let prioridade = await prisma.prioridade.findFirst({
        where: {
            numeroGuia: numeroGuia,
            regulada: false,
        },
    });
    
    const isAutorizada = status.toUpperCase() === 'AUTORIZADA';
    
    if (!prioridade) {
        // Criar nova prioridade se não existir
        console.log('Nenhuma prioridade pendente encontrada, criando uma nova...');
        prioridade = await prisma.prioridade.create({
            data: {
                // ... (keep all existing fields, but REMOVE protocoloSPG from here)
                numeroGuia, 
                tipoGuia, 
                status, 
                idGuiaECO: idGuiaECO,
                fonte: fonte || 'ECO', 
                produtoId: produtoIdFinal || 1,
                usuarioId: usuarioId,
                reguladorId: null,
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
                vezesSolicitado: 1, 
                autorizada: isAutorizada,
            }
        });
    } else {
        // Atualizar prioridade existente
        console.log('Prioridade existente encontrada, atualizando contador...');
        const novaAutorizada = status.toUpperCase() === 'AUTORIZADA' ? true : prioridade.autorizada;
        prioridade = await prisma.prioridade.update({
            where: { id: prioridade.id },
            data: {
                vezesSolicitado: { increment: 1 },
                reguladorId: null,
                observacao,
                dataAtualizacao: new Date(),
                autorizada: novaAutorizada,
                fonte: fonte || prioridade.fonte
            },
        });
    }

    const solicitacao = await prisma.solicitacaoPrioridade.create({
        data: {
            prioridadeId: prioridade.id,
            protocoloSPG: protocoloSPG,
            dataHoraSolicitacao: new Date(),
            observacaoSolicitacao: observacao || '',
            reguladorPlantaoId: null  
        }
    });

    console.log('Prioridade processada com sucesso:', prioridade);
    console.log('Nova solicitação de prioridade criada:', solicitacao);
    res.json({ message: 'Prioridade processada com sucesso', prioridade });

  } catch (err) {
    if (err.code === 'P2002' && err.meta?.constraint === 'SolicitacaoPrioridade_protocoloSPG_key') {
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