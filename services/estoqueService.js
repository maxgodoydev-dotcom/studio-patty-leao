const mongoose = require("mongoose");
const Agendamento = require("../models/Agendamento");
const Estoque = require("../models/Estoque");
const Produto = require("../models/Produto");
const ServicoInsumo = require("../models/ServicoInsumo");
const MovimentacaoEstoque = require("../models/MovimentacaoEstoque");

function normalizarObjectId(id) {
  const valor = id?._id || id;
  if (!valor) return null;
  return new mongoose.Types.ObjectId(String(valor));
}

function numeroPositivo(valor, campo = "Quantidade") {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(`${campo} deve ser maior que zero.`);
  }
  return numero;
}

async function registrarMovimentacao({
  estoque,
  tipo,
  origem = "MANUAL",
  quantidade,
  saldoAnterior,
  saldoPosterior,
  usuarioId = null,
  agendamentoId = null,
  reservaVitrineId = null,
  observacao = null,
}) {
  return MovimentacaoEstoque.create({
    id_estoque: estoque._id,
    id_produto: estoque.id_produto,
    tipo,
    origem,
    quantidade,
    saldo_anterior: saldoAnterior,
    saldo_posterior: saldoPosterior,
    id_usuario_responsavel: usuarioId || null,
    id_agendamento: agendamentoId || null,
    id_reserva_vitrine: reservaVitrineId || null,
    observacao,
  });
}

async function movimentarProduto({
  idProduto,
  tipo,
  quantidade,
  origem = "MANUAL",
  usuarioId = null,
  agendamentoId = null,
  reservaVitrineId = null,
  observacao = null,
}) {
  const quantidadeNormalizada = numeroPositivo(quantidade);
  const idProdutoNormalizado = normalizarObjectId(idProduto);

  if (!idProdutoNormalizado) {
    throw new Error("Produto é obrigatório para movimentar estoque.");
  }

  const estoque = await Estoque.findOne({ id_produto: idProdutoNormalizado });
  if (!estoque) {
    throw new Error("Registro de estoque não encontrado para este produto.");
  }

  const saldoAnterior = Number(estoque.quantidade_atual || 0);
  let saldoPosterior;

  if (tipo === "ENTRADA") {
    saldoPosterior = saldoAnterior + quantidadeNormalizada;
    estoque.quantidade_atual = saldoPosterior;
    await estoque.save();
  } else if (tipo === "SAIDA") {
    if (saldoAnterior < quantidadeNormalizada) {
      const produto = await Produto.findById(idProdutoNormalizado).lean();
      throw new Error(`Estoque insuficiente para ${produto?.descricao || "produto"}. Disponível: ${saldoAnterior}. Necessário: ${quantidadeNormalizada}.`);
    }

    saldoPosterior = saldoAnterior - quantidadeNormalizada;
    estoque.quantidade_atual = saldoPosterior;
    await estoque.save();
  } else {
    throw new Error("Tipo de movimentação inválido.");
  }

  const movimentacao = await registrarMovimentacao({
    estoque,
    tipo,
    origem,
    quantidade: quantidadeNormalizada,
    saldoAnterior,
    saldoPosterior,
    usuarioId,
    agendamentoId,
    reservaVitrineId,
    observacao,
  });

  return { estoque, movimentacao };
}

async function calcularConsumoPorAgendamento(agendamento) {
  const mapaConsumo = new Map();

  for (const item of agendamento.itens || []) {
    const idServico = normalizarObjectId(item.id_servico);
    if (!idServico) continue;

    const insumos = await ServicoInsumo.find({ id_servico: idServico })
      .populate("id_produto", "descricao unidade_medida")
      .lean();

    for (const insumo of insumos) {
      const idProduto = String(insumo.id_produto?._id || insumo.id_produto);
      const anterior = mapaConsumo.get(idProduto) || {
        id_produto: insumo.id_produto?._id || insumo.id_produto,
        produto: insumo.id_produto,
        quantidade: 0,
      };

      anterior.quantidade += Number(insumo.qtde_utilizada || 0);
      mapaConsumo.set(idProduto, anterior);
    }
  }

  return Array.from(mapaConsumo.values()).filter((item) => item.quantidade > 0);
}

async function validarSaldoParaConsumo(consumos) {
  const problemas = [];

  for (const consumo of consumos) {
    const estoque = await Estoque.findOne({ id_produto: consumo.id_produto })
      .populate("id_produto", "descricao unidade_medida")
      .lean();

    if (!estoque) {
      problemas.push(`Sem registro de estoque para ${consumo.produto?.descricao || "produto/insumo"}.`);
      continue;
    }

    if (Number(estoque.quantidade_atual || 0) < Number(consumo.quantidade || 0)) {
      problemas.push(
        `${estoque.id_produto?.descricao || "Produto"}: disponível ${estoque.quantidade_atual}, necessário ${consumo.quantidade}.`
      );
    }
  }

  if (problemas.length) {
    throw new Error(`Estoque insuficiente para concluir atendimento: ${problemas.join(" | ")}`);
  }
}

async function baixarInsumosDoAgendamento(agendamentoId, usuarioId = null) {
  const agendamento = await Agendamento.findById(agendamentoId);

  if (!agendamento) {
    throw new Error("Agendamento não encontrado para baixa de estoque.");
  }

  if (agendamento.status_agendamento !== "Concluido") {
    throw new Error("A baixa automática de insumos só ocorre em agendamentos concluídos.");
  }

  if (agendamento.estoque_baixado) {
    return {
      jaProcessado: true,
      mensagem: "Estoque já havia sido baixado para este atendimento.",
      movimentacoes: [],
    };
  }

  const consumos = await calcularConsumoPorAgendamento(agendamento);

  if (!consumos.length) {
    agendamento.estoque_baixado = true;
    agendamento.data_baixa_estoque = new Date();
    agendamento.movimentacoes_estoque = [];
    await agendamento.save();

    return {
      jaProcessado: false,
      mensagem: "Atendimento concluído sem insumos vinculados aos serviços.",
      movimentacoes: [],
    };
  }

  await validarSaldoParaConsumo(consumos);

  const movimentacoes = [];
  for (const consumo of consumos) {
    const { movimentacao } = await movimentarProduto({
      idProduto: consumo.id_produto,
      tipo: "SAIDA",
      quantidade: consumo.quantidade,
      origem: "ATENDIMENTO",
      usuarioId,
      agendamentoId: agendamento._id,
      observacao: "Baixa automática ao concluir atendimento",
    });

    movimentacoes.push(movimentacao._id);
  }

  agendamento.estoque_baixado = true;
  agendamento.data_baixa_estoque = new Date();
  agendamento.movimentacoes_estoque = movimentacoes;
  await agendamento.save();

  return {
    jaProcessado: false,
    mensagem: "Insumos baixados automaticamente com sucesso.",
    movimentacoes,
  };
}

async function listarMovimentacoesRecentes(limite = 20) {
  return MovimentacaoEstoque.find()
    .populate("id_produto", "sku descricao unidade_medida")
    .populate("id_usuario_responsavel", "email nome")
    .sort({ createdAt: -1 })
    .limit(limite)
    .lean();
}

module.exports = {
  movimentarProduto,
  baixarInsumosDoAgendamento,
  calcularConsumoPorAgendamento,
  validarSaldoParaConsumo,
  listarMovimentacoesRecentes,
};
