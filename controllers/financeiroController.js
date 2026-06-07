// ============================================================
// controllers/financeiroController.js
//
// Fase 4: financeiro simples/manual.
// Não há pagamento online, gateway, checkout ou PDV avançado.
// O objetivo é registrar entradas/saídas presenciais, abrir/fechar
// caixa simples e alimentar os indicadores básicos de BI.
// ============================================================

const Venda = require("../models/Venda");
const Caixa = require("../models/Caixa");
const MovimentacaoFinanceira = require("../models/MovimentacaoFinanceira");
const { movimentarProduto } = require("../services/estoqueService");
const {
  abrirCaixa,
  fecharCaixa,
  registrarMovimentacao,
  resumoFinanceiro,
} = require("../services/financeiroService");

function responder(req, res, { sucesso = null, erro = null } = {}) {
  if (req.accepts("html")) {
    const params = new URLSearchParams();
    if (sucesso) params.set("sucesso", sucesso);
    if (erro) params.set("erro", erro);
    return res.redirect(`/financeiro${params.toString() ? `?${params.toString()}` : ""}`);
  }
  return res.status(erro ? 400 : 200).json({ sucesso, erro });
}

module.exports = {
  async paginaFinanceiro(req, res) {
    try {
      const resumo = await resumoFinanceiro({ limite: 60 });
      return res.render("financeiro", {
        usuario: req.usuario,
        erro: req.query.erro || null,
        sucesso: req.query.sucesso || null,
        movimentos: resumo.movimentos,
        vendas: [],
        entradas: resumo.entradas,
        saidas: resumo.saidas,
        saldo: resumo.saldo,
        labelsReceita: resumo.labelsReceita,
        dadosReceita: resumo.dadosReceita,
        labelsPagto: resumo.labelsPagto,
        dadosPagto: resumo.dadosPagto,
        caixaAberto: resumo.caixaAberto,
        caixasRecentes: resumo.caixasRecentes,
      });
    } catch (error) {
      console.error("Erro página financeiro:", error);
      return res.render("financeiro", {
        usuario: req.usuario,
        erro: "Erro ao carregar o financeiro.",
        sucesso: null,
        movimentos: [],
        vendas: [],
        entradas: 0,
        saidas: 0,
        saldo: 0,
        labelsReceita: [],
        dadosReceita: [],
        labelsPagto: [],
        dadosPagto: [],
        caixaAberto: null,
        caixasRecentes: [],
      });
    }
  },

  async listarMovimentacoes(req, res) {
    try {
      const movimentos = await MovimentacaoFinanceira.find({ flg_ativo: true })
        .populate("id_cliente", "nome")
        .populate("id_usuario_responsavel", "email")
        .sort({ data_movimentacao: -1 })
        .limit(100);

      return res.status(200).json(movimentos);
    } catch (error) {
      console.error("Erro listar movimentações financeiras:", error);
      return res.status(500).json({ erro: "Erro ao listar movimentações financeiras." });
    }
  },

  async criarMovimentacao(req, res) {
    try {
      const {
        tipo,
        origem,
        descricao,
        valor,
        forma_pagamento,
        status_pagamento,
        observacao,
      } = req.body;

      await registrarMovimentacao({
        tipo,
        origem: origem || "MANUAL",
        descricao,
        valor,
        formaPagamento: forma_pagamento,
        statusPagamento: status_pagamento || "Pago",
        usuarioId: req.usuario?._id,
        observacao,
      });

      return responder(req, res, { sucesso: "Movimentação financeira registrada com sucesso." });
    } catch (error) {
      console.error("Erro criar movimentação financeira:", error);
      return responder(req, res, { erro: error.message || "Erro ao registrar movimentação financeira." });
    }
  },

  async abrirCaixa(req, res) {
    try {
      await abrirCaixa({
        saldoInicial: req.body.saldo_inicial || 0,
        usuarioId: req.usuario?._id,
        observacoes: req.body.observacoes || null,
      });

      return responder(req, res, { sucesso: "Caixa aberto com sucesso." });
    } catch (error) {
      console.error("Erro abrir caixa:", error);
      return responder(req, res, { erro: error.message || "Erro ao abrir caixa." });
    }
  },

  async fecharCaixa(req, res) {
    try {
      await fecharCaixa({
        usuarioId: req.usuario?._id,
        saldoFinalInformado: req.body.saldo_final,
        observacoes: req.body.observacoes || null,
      });

      return responder(req, res, { sucesso: "Caixa fechado com sucesso." });
    } catch (error) {
      console.error("Erro fechar caixa:", error);
      return responder(req, res, { erro: error.message || "Erro ao fechar caixa." });
    }
  },

  // Mantido por compatibilidade com rotas/API antigas.
  // Representa venda PRESENCIAL de produto no balcão, sem checkout online.
  async listarVendas(req, res) {
    try {
      const vendas = await Venda
        .find()
        .populate("id_tipo_pagto", "nome_metodo taxa_operadora")
        .populate("id_cliente", "nome")
        .populate("itens.id_produto", "descricao unidade_medida")
        .sort({ data_hora_venda: -1 });

      return res.status(200).json(vendas);
    } catch (error) {
      console.error("Erro listar vendas:", error);
      return res.status(500).json({ erro: "Erro ao listar vendas." });
    }
  },

  // Mantido como venda presencial simples de balcão.
  // Usa whitelist de campos, calcula total e baixa estoque.
  async criarVenda(req, res) {
    try {
      const { id_cliente = null, id_tipo_pagto, itens = [] } = req.body;

      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ erro: "Informe ao menos um produto." });
      }

      const itensNormalizados = itens.map((item) => ({
        id_produto: item.id_produto,
        quantidade: Number(item.quantidade),
        preco_unitario_venda: Number(item.preco_unitario_venda),
      }));

      const valorTotal = itensNormalizados.reduce(
        (soma, item) => soma + (Number(item.quantidade || 0) * Number(item.preco_unitario_venda || 0)),
        0
      );

      const venda = await Venda.create({
        id_cliente: id_cliente || null,
        id_tipo_pagto,
        valor_total_venda: valorTotal,
        itens: itensNormalizados,
      });

      for (const item of itensNormalizados) {
        await movimentarProduto({
          idProduto: item.id_produto,
          tipo: "SAIDA",
          quantidade: item.quantidade,
          origem: "VENDA_PRESENCIAL",
          usuarioId: req.usuario?._id,
          observacao: `Venda presencial ${venda._id}`,
        });
      }

      await registrarMovimentacao({
        tipo: "ENTRADA",
        origem: "PRODUTO_BALCAO",
        descricao: "Venda presencial de produto no balcão",
        valor: valorTotal,
        formaPagamento: "Não informado",
        statusPagamento: "Pago",
        usuarioId: req.usuario?._id,
        clienteId: id_cliente || null,
        vendaId: venda._id,
      });

      return res.status(201).json({ mensagem: "Venda presencial registrada com sucesso.", venda });
    } catch (error) {
      console.error("Erro criar venda presencial:", error);
      return res.status(500).json({ erro: error.message || "Erro ao criar venda presencial." });
    }
  },

  async caixa(req, res) {
    try {
      const caixas = await Caixa
        .find()
        .populate("aberto_por", "email permissoes tipo_perfil")
        .populate("fechado_por", "email permissoes tipo_perfil")
        .sort({ data_abertura: -1 });

      return res.status(200).json(caixas);
    } catch (error) {
      console.error("Erro caixa:", error);
      return res.status(500).json({ erro: "Erro ao consultar caixa." });
    }
  },
};
