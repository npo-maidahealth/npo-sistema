import express from 'express';
import prisma from '../db/prisma.js'; 
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { getReguladorAtual } from '../services/escalaService.js';

const router = express.Router();

router.get('/consulta/:numeroGuia', isAuthenticated, async (req, res) => {
    try {
        const { numeroGuia } = req.params;
        const prioridades = await prisma.prioridade.findMany({
            where: { numeroGuia },
            select: {
                dataCriacao: true,
                dataAtualizacao: true, 
                status: true,
                fila: true,
                fonte: true,
                observacao: true,
                beneficiario: true,  
                numeroGuia: true,  
                //adicione outros campos se necessário, quantidade de vezes que foi pedido prioridade etc.
            },
            orderBy: { dataCriacao: 'desc' }
        });

        if (prioridades.length === 0) {
            return res.status(404).json({ message: 'Nenhuma prioridade encontrada para esta guia.' });
        }

        // Retorne um formato simples: o mais recente + quantidade
        const maisRecente = prioridades[0];  // Como ordenado desc, o [0] é o mais novo
        const resultado = {
            quantidade: prioridades.length,
            numeroGuia: numeroGuia,
            beneficiario: maisRecente.beneficiario || 'Não informado',
            status: maisRecente.status || 'Pendente',  // Use 'status' (alinhe com frontend)
            fonte: maisRecente.fonte,
            dataCriacao: maisRecente.dataCriacao,
            dataAtualizacao: maisRecente.dataAtualizacao,
            observacao: maisRecente.observacao,
            // Se quiser todas as solicitações: solicitacoes: prioridades.map(...) como antes
        };

        res.json(resultado);
    } catch (err) {
        console.error('Erro ao consultar prioridades por guia:', err);
        res.status(500).json({ message: 'Erro interno ao consultar prioridades.', error: err.message });
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
      fila, atrasada, atrasoRegulacao, area, capturada, fonte  // ← ADICIONADO: fonte aqui
    } = req.body;

    // Logs após desestruturação.
    console.log('Fila recebida para busca de regulador:', fila);

    const usuarioId = req.session.user?.id;
    console.log('Usuario ID da sessão:', usuarioId);

    if (!usuarioId) return res.status(401).json({ message: 'Usuário não autenticado' });

    if (capturada) {
      console.log('Guia capturada, removendo...');
      await prisma.prioridade.deleteMany({ where: { numeroGuia } });
      return res.json({ message: `Prioridade ${numeroGuia} capturada e removida do banco` });
    }

    // Normaliza a fila antes de buscar regulador (remove acentos).
    const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const filaNormalizada = normalize(fila || caracterAtendimento || ''); // Usa fila ou caracterAtendimento como fallback.
    console.log('Fila normalizada para busca de regulador:', filaNormalizada);

    let reguladorDePlantaoId = null;
    const reguladorData = await getReguladorAtual(filaNormalizada, fonte); // Passa normalizada.
    console.log('Regulador encontrado:', reguladorData ? reguladorData.nome : 'Nenhum'); 

    if (reguladorData) {
      reguladorDePlantaoId = reguladorData.id;
      console.log(`Regulador de plantão encontrado: ${reguladorData.nome} (ID: ${reguladorDePlantaoId}) para fila '${filaNormalizada}'`);
    } else {
      console.log(`Nenhum regulador de plantão encontrado para a fila: ${filaNormalizada}`);
    }
        let produtoIdFinal = produtoId;
        if (!produtoIdFinal && nomeProduto) {
            console.log('Buscando produto por nome:', nomeProduto);
            let produto = await prisma.produto.findFirst({ where: { nome: { contains: nomeProduto, mode: 'insensitive' } } });
            if (!produto) {
                console.log('Produto não encontrado, criando novo:', nomeProduto);
                produto = await prisma.produto.create({ data: { nome: nomeProduto } });
            } else {
                console.log('Produto encontrado:', produto);
            }
            produtoIdFinal = produto.id;
        }

        console.log('Produto ID final:', produtoIdFinal);
        if (!produtoIdFinal) {
            console.log('ERRO: Produto ID é obrigatório');
            return res.status(400).json({ message: 'Produto ID é obrigatório. Envie produtoId ou nomeProduto.' });
        }

        //Encontrar prioridade pendente existente
        const prioridadeExistente = await prisma.prioridade.findFirst({
            where: {
                numeroGuia: numeroGuia,
                regulada: false, // Busca apenas por prioridades que ainda não foram reguladas
            },
        });
        
        let prioridade;
        
        // Condição para atualizar ou criar a prioridade
        if (prioridadeExistente) {
            // Atualizar prioridade existente
            console.log('Prioridade existente encontrada, atualizando contador...');
            const novaAutorizada = status.toUpperCase() === 'AUTORIZADA' ? true : prioridadeExistente.autorizada;
            prioridade = await prisma.prioridade.update({
                where: { id: prioridadeExistente.id },
                data: {
                    vezesSolicitado: {
                        increment: 1, // Incrementa o contador
                    },
                    reguladorId: reguladorDePlantaoId, // Atribui o regulador de plantão mais atual
                    observacao, // Atualiza a observação
                    dataAtualizacao: new Date(),
                    autorizada: novaAutorizada,
                    fonte: fonte || prioridadeExistente.fonte  // atualiza fonte se enviado
                },
            });
        } else {
            // Criar nova prioridade
            console.log('Nenhuma prioridade pendente encontrada, criando uma nova...');
            const isAutorizada = status.toUpperCase() === 'AUTORIZADA';
            prioridade = await prisma.prioridade.create({
                data: {
                    ...req.body,  // inclui TODOS os campos do body (como fonte)
                    caracterAtendimento: caracterAtendimento || fila || '',  // Overrides necessários
                    observacao: observacao || '',
                    produtoId: produtoIdFinal || 1,  // Default do snippet
                    usuarioId: usuarioId,  // Do auth/session
                    reguladorId: reguladorDePlantaoId,
                    beneficiario: beneficiario || '',
                    beneficiarioNomeSocial: beneficiarioNomeSocial || '',
                    cartaoBeneficiario: cartaoBeneficiario || '',
                    cpfBeneficiario: cpfBeneficiario || '',
                    dataHoraSolicitacao: dataHoraSolicitacao ? new Date(dataHoraSolicitacao) : null,
                    dataPausaSla: dataPausaSla ? new Date(dataPausaSla) : null,
                    dataRegulacao: dataRegulacao ? new Date(dataRegulacao) : null,
                    dataSolicitacao: dataSolicitacao ? new Date(dataSolicitacao) : null,
                    dataVencimentoSla: dataVencimentoSla ? new Date(dataVencimentoSla) : null,
                    fila: fila || '',
                    atrasada: atrasada || false,
                    atrasoRegulacao: atrasoRegulacao || '',
                    area: area || '',
                    capturada: false,
                    vezesSolicitado: 1, 
                    autorizada: isAutorizada,
                }
            });
        }

      console.log('ReguladorDePlantaoId final:', reguladorDePlantaoId);
      console.log('Prioridade processada com sucesso:', prioridade);
      res.json({ message: 'Prioridade processada com sucesso', prioridade });

    } catch (err) {
        console.error('ERRO COMPLETO ao processar prioridade:', err);
        console.error('Stack trace:', err.stack);
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
// Listar todas as prioridades (para relatórios/admin)
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