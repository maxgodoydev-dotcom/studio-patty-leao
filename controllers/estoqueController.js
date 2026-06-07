// ============================================================
// controllers/estoqueController.js
// Responsabilidade MVC: CRUD de produtos + movimentações de estoque.
//
// Fase 3:
// - Estoque deixa de ser apenas saldo estático.
// - Entradas e saídas passam a gerar histórico em MovimentacaoEstoque.
// - Saídas impedem estoque negativo.
// - A baixa automática por atendimento fica centralizada em estoqueService.
// ============================================================

const Produto = require("../models/Produto");
const Estoque = require("../models/Estoque");
const { movimentarProduto, listarMovimentacoesRecentes } = require("../services/estoqueService");

function wantsHtml(req) {
  return req.accepts(["html", "json"]) === "html";
}

function redirecionarOuJson(req, res, status, payload, destino = "/estoque") {
  if (wantsHtml(req)) {
    return res.redirect(destino);
  }
  return res.status(status).json(payload);
}

function filtrarDadosProduto(body = {}) {
  const campos = [
    "sku",
    "descricao",
    "custo_unitario",
    "preco_venda",
    "unidade_medida",
    "flg_insumo",
    "flg_venda",
    "imagem_url",
    "descricao_vitrine",
  ];

  const dados = {};
  for (const campo of campos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }

  dados.flg_insumo = body.flg_insumo === "on" || body.flg_insumo === true || body.flg_insumo === "true";
  dados.flg_venda = body.flg_venda === "on" || body.flg_venda === true || body.flg_venda === "true";

  if (!dados.unidade_medida) dados.unidade_medida = "un";
  return dados;
}

module.exports = {
  async listar(req, res) {
    try {
      const estoques = await Estoque
        .find()
        .populate("id_produto", "sku descricao unidade_medida preco_venda flg_insumo flg_venda")
        .lean({ virtuals: true });

      return res.status(200).json(estoques);
    } catch (error) {
      console.error("Erro listar estoque:", error);
      return res.status(500).json({ erro: "Erro ao listar estoque." });
    }
  },

  async listarMovimentacoes(req, res) {
    try {
      const movimentacoes = await listarMovimentacoesRecentes(50);
      return res.status(200).json(movimentacoes);
    } catch (error) {
      console.error("Erro listar movimentações de estoque:", error);
      return res.status(500).json({ erro: "Erro ao listar movimentações de estoque." });
    }
  },

  async buscarPorId(req, res) {
    try {
      const produto = await Produto.findById(req.params.id);
      if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });

      const estoque = await Estoque
        .findOne({ id_produto: req.params.id })
        .populate("id_produto");

      return res.status(200).json(estoque || { produto, quantidade_atual: 0 });
    } catch (error) {
      console.error("Erro buscar produto:", error);
      return res.status(500).json({ erro: "Erro ao buscar produto." });
    }
  },

  async criar(req, res) {
    try {
      const quantidadeInicial = Number(req.body.quantidade_inicial || 0);
      const quantidadeMinima = Number(req.body.quantidade_minima || 0);
      const dadosProduto = filtrarDadosProduto(req.body);

      const produto = await Produto.create(dadosProduto);
      const estoque = await Estoque.create({
        id_produto: produto._id,
        quantidade_atual: 0,
        quantidade_minima: quantidadeMinima,
      });

      let movimentacao = null;
      if (quantidadeInicial > 0) {
        const resultado = await movimentarProduto({
          idProduto: produto._id,
          tipo: "ENTRADA",
          quantidade: quantidadeInicial,
          origem: "MANUAL",
          usuarioId: req.usuario?._id,
          observacao: "Estoque inicial do produto",
        });
        movimentacao = resultado.movimentacao;
      }

      return redirecionarOuJson(req, res, 201, {
        mensagem: "Produto criado com sucesso.",
        produto,
        estoque,
        movimentacao,
      });
    } catch (error) {
      console.error("Erro criar produto:", error);
      if (wantsHtml(req)) return res.redirect("/estoque");
      return res.status(500).json({ erro: error.message || "Erro ao criar produto." });
    }
  },

  async atualizar(req, res) {
    try {
      const dadosProduto = filtrarDadosProduto(req.body);
      delete dadosProduto.quantidade_atual;
      delete dadosProduto.quantidade_minima;

      const produto = await Produto.findByIdAndUpdate(req.params.id, dadosProduto, {
        new: true,
        runValidators: true,
      });

      if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });

      if (Object.prototype.hasOwnProperty.call(req.body, "quantidade_minima")) {
        await Estoque.findOneAndUpdate(
          { id_produto: req.params.id },
          { quantidade_minima: Number(req.body.quantidade_minima || 0) },
          { runValidators: true }
        );
      }

      return redirecionarOuJson(req, res, 200, { mensagem: "Produto atualizado com sucesso.", produto });
    } catch (error) {
      console.error("Erro atualizar produto:", error);
      if (wantsHtml(req)) return res.redirect("/estoque");
      return res.status(500).json({ erro: error.message || "Erro ao atualizar produto." });
    }
  },

  async deletar(req, res) {
    try {
      const produto = await Produto.findByIdAndDelete(req.params.id);
      if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });

      await Estoque.deleteOne({ id_produto: req.params.id });
      return redirecionarOuJson(req, res, 200, { mensagem: "Produto removido com sucesso." });
    } catch (error) {
      console.error("Erro deletar produto:", error);
      if (wantsHtml(req)) return res.redirect("/estoque");
      return res.status(500).json({ erro: "Erro ao deletar produto." });
    }
  },

  async entradaEstoque(req, res) {
    try {
      const resultado = await movimentarProduto({
        idProduto: req.params.id,
        tipo: "ENTRADA",
        quantidade: req.body.quantidade,
        origem: "MANUAL",
        usuarioId: req.usuario?._id,
        observacao: req.body.observacao || "Entrada manual de estoque",
      });

      return redirecionarOuJson(req, res, 200, {
        mensagem: "Entrada realizada com sucesso.",
        estoque: resultado.estoque,
        movimentacao: resultado.movimentacao,
        estoque_baixo: resultado.estoque.estoque_baixo,
      });
    } catch (error) {
      console.error("Erro entrada estoque:", error);
      if (wantsHtml(req)) return res.redirect("/estoque");
      return res.status(400).json({ erro: error.message || "Erro na entrada de estoque." });
    }
  },

  async saidaEstoque(req, res) {
    try {
      const resultado = await movimentarProduto({
        idProduto: req.params.id,
        tipo: "SAIDA",
        quantidade: req.body.quantidade,
        origem: "MANUAL",
        usuarioId: req.usuario?._id,
        observacao: req.body.observacao || "Saída manual de estoque",
      });

      return redirecionarOuJson(req, res, 200, {
        mensagem: "Saída realizada com sucesso.",
        estoque: resultado.estoque,
        movimentacao: resultado.movimentacao,
        estoque_baixo: resultado.estoque.estoque_baixo,
      });
    } catch (error) {
      console.error("Erro saída estoque:", error);
      if (wantsHtml(req)) return res.redirect("/estoque");
      return res.status(400).json({ erro: error.message || "Erro na saída de estoque." });
    }
  },
};
