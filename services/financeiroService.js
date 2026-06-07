const mongoose = require("mongoose");
const Caixa = require("../models/Caixa");
const MovimentacaoFinanceira = require("../models/MovimentacaoFinanceira");
const Agendamento = require("../models/Agendamento");

function numeroPositivo(valor, campo = "Valor") {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(`${campo} deve ser maior que zero.`);
  }
  return numero;
}

function dataReferencia(date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioFimDia(date = new Date()) {
  const inicio = new Date(date);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(date);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

function normalizarFormaPagamento(forma) {
  const permitidas = ["Dinheiro", "PIX presencial", "Débito", "Crédito", "Não informado"];
  return permitidas.includes(forma) ? forma : "Não informado";
}

async function buscarCaixaAberto() {
  return Caixa.findOne({ status_caixa: "Aberto" }).sort({ data_abertura: -1 });
}

async function abrirCaixa({ saldoInicial = 0, usuarioId, observacoes = null }) {
  const caixaAberto = await buscarCaixaAberto();
  if (caixaAberto) {
    throw new Error("Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.");
  }

  return Caixa.create({
    data_referencia: dataReferencia(new Date()),
    data_abertura: new Date(),
    saldo_inicial: Number(saldoInicial || 0),
    status_caixa: "Aberto",
    aberto_por: usuarioId,
    observacoes,
  });
}

async function registrarMovimentacao({
  tipo,
  origem = "MANUAL",
  descricao,
  valor,
  formaPagamento = "Não informado",
  statusPagamento = "Pago",
  usuarioId = null,
  clienteId = null,
  agendamentoId = null,
  reservaVitrineId = null,
  vendaId = null,
  observacao = null,
  dataMovimentacao = new Date(),
}) {
  const tipoNormalizado = tipo === "SAIDA" ? "SAIDA" : "ENTRADA";
  const valorNormalizado = numeroPositivo(valor, "Valor");

  return MovimentacaoFinanceira.create({
    tipo: tipoNormalizado,
    origem,
    descricao: String(descricao || "Movimentação financeira").trim(),
    valor: valorNormalizado,
    forma_pagamento: normalizarFormaPagamento(formaPagamento),
    status_pagamento: ["Pendente", "Pago", "Cancelado"].includes(statusPagamento) ? statusPagamento : "Pago",
    id_usuario_responsavel: usuarioId || null,
    id_cliente: clienteId || null,
    id_agendamento: agendamentoId || null,
    id_reserva_vitrine: reservaVitrineId || null,
    id_venda: vendaId || null,
    observacao,
    data_movimentacao: dataMovimentacao,
  });
}

async function registrarPagamentoDeAtendimento(agendamentoId, usuarioId = null, formaPagamento = "Não informado") {
  if (!mongoose.Types.ObjectId.isValid(String(agendamentoId))) {
    throw new Error("Agendamento inválido para registro financeiro.");
  }

  const jaExiste = await MovimentacaoFinanceira.findOne({
    id_agendamento: agendamentoId,
    origem: "ATENDIMENTO",
    flg_ativo: true,
    status_pagamento: { $ne: "Cancelado" },
  });

  if (jaExiste) return jaExiste;

  const agendamento = await Agendamento.findById(agendamentoId)
    .populate("id_cliente", "nome")
    .populate("itens.id_servico", "nome_servico")
    .lean();

  if (!agendamento) throw new Error("Agendamento não encontrado para financeiro.");

  const valorTotal = (agendamento.itens || []).reduce((soma, item) => soma + Number(item.valor_cobrado || 0), 0);
  if (valorTotal <= 0) {
    throw new Error("Atendimento sem valor cobrado para registrar no financeiro.");
  }

  const servicos = (agendamento.itens || [])
    .map((item) => item.id_servico?.nome_servico)
    .filter(Boolean)
    .join(", ");

  return registrarMovimentacao({
    tipo: "ENTRADA",
    origem: "ATENDIMENTO",
    descricao: `Atendimento concluído${servicos ? ` — ${servicos}` : ""}`,
    valor: valorTotal,
    formaPagamento,
    statusPagamento: "Pago",
    usuarioId,
    clienteId: agendamento.id_cliente?._id || agendamento.id_cliente || null,
    agendamentoId,
    observacao: "Registro financeiro criado ao concluir atendimento presencial.",
    dataMovimentacao: new Date(),
  });
}

async function fecharCaixa({ usuarioId, saldoFinalInformado = null, observacoes = null }) {
  const caixa = await buscarCaixaAberto();
  if (!caixa) throw new Error("Não existe caixa aberto para fechamento.");

  const ref = caixa.data_referencia || dataReferencia(caixa.data_abertura);
  const { inicio, fim } = inicioFimDia(caixa.data_abertura || new Date());

  const movimentos = await MovimentacaoFinanceira.find({
    flg_ativo: true,
    status_pagamento: "Pago",
    data_movimentacao: { $gte: inicio, $lte: fim },
  }).lean();

  const totalEntradas = movimentos
    .filter((m) => m.tipo === "ENTRADA")
    .reduce((soma, m) => soma + Number(m.valor || 0), 0);

  const totalSaidas = movimentos
    .filter((m) => m.tipo === "SAIDA")
    .reduce((soma, m) => soma + Number(m.valor || 0), 0);

  const saldoSistema = Number(caixa.saldo_inicial || 0) + totalEntradas - totalSaidas;

  caixa.data_referencia = ref;
  caixa.data_fechamento = new Date();
  caixa.status_caixa = "Fechado";
  caixa.total_entradas = totalEntradas;
  caixa.total_saidas = totalSaidas;
  caixa.total_vendas = totalEntradas;
  caixa.total_servicos = movimentos
    .filter((m) => m.tipo === "ENTRADA" && m.origem === "ATENDIMENTO")
    .reduce((soma, m) => soma + Number(m.valor || 0), 0);
  caixa.saldo_final = saldoFinalInformado !== null && saldoFinalInformado !== ""
    ? Number(saldoFinalInformado)
    : saldoSistema;
  caixa.saldo_sistema = saldoSistema;
  caixa.fechado_por = usuarioId;
  caixa.observacoes = observacoes || caixa.observacoes;

  await caixa.save();
  return caixa;
}

async function resumoFinanceiro({ limite = 50 } = {}) {
  const movimentos = await MovimentacaoFinanceira.find({ flg_ativo: true })
    .populate("id_cliente", "nome")
    .populate("id_usuario_responsavel", "email")
    .sort({ data_movimentacao: -1 })
    .limit(limite)
    .lean();

  const pagos = movimentos.filter((m) => m.status_pagamento === "Pago");
  const entradas = pagos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + Number(m.valor || 0), 0);
  const saidas = pagos.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + Number(m.valor || 0), 0);

  const porForma = {};
  for (const mov of pagos.filter((m) => m.tipo === "ENTRADA")) {
    const chave = mov.forma_pagamento || "Não informado";
    porForma[chave] = (porForma[chave] || 0) + Number(mov.valor || 0);
  }

  const meses = [];
  const valoresMes = [];
  const agora = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const total = pagos
      .filter((m) => m.tipo === "ENTRADA" && new Date(m.data_movimentacao) >= inicio && new Date(m.data_movimentacao) <= fim)
      .reduce((s, m) => s + Number(m.valor || 0), 0);
    meses.push(label);
    valoresMes.push(total);
  }

  const caixaAbertoDoc = await buscarCaixaAberto();
  const caixaAberto = caixaAbertoDoc ? caixaAbertoDoc.toObject() : null;
  const caixasRecentes = await Caixa.find()
    .populate("aberto_por", "email")
    .populate("fechado_por", "email")
    .sort({ data_abertura: -1 })
    .limit(10)
    .lean();

  return {
    movimentos,
    entradas,
    saidas,
    saldo: entradas - saidas,
    labelsReceita: meses,
    dadosReceita: valoresMes,
    labelsPagto: Object.keys(porForma),
    dadosPagto: Object.values(porForma),
    caixaAberto,
    caixasRecentes,
  };
}

module.exports = {
  abrirCaixa,
  fecharCaixa,
  buscarCaixaAberto,
  registrarMovimentacao,
  registrarPagamentoDeAtendimento,
  resumoFinanceiro,
  dataReferencia,
};
