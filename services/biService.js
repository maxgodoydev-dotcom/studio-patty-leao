// ============================================================
// services/biService.js
// BI operacional simples do Studio Patty Leão.
//
// Mantém o foco do projeto: agendamento, atendimento, estoque,
// reservas presenciais e financeiro manual. Não cria ERP, PDV
// avançado nem lógica de pagamento online.
// ============================================================

const Cliente = require("../models/Cliente");
const Agendamento = require("../models/Agendamento");
const Estoque = require("../models/Estoque");
const Servico = require("../models/Servico");
const Profissional = require("../models/Profissional");
const ReservaVitrine = require("../models/Reservavitrine");
const MovimentacaoFinanceira = require("../models/MovimentacaoFinanceira");

const STATUS_CANCELADOS = ["Cancelado", "Faltou"];
const STATUS_VALIDOS_BI = ["Agendado", "Confirmado", "Em Atendimento", "Concluido", "Reagendado"];

function inicioDia(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0, 0);
}

function fimDia(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 23, 59, 59, 999);
}

function inicioMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), 1, 0, 0, 0, 0);
}

function fimMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999);
}

function inicioSemana(data = new Date()) {
  const d = new Date(data);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia; // segunda-feira
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimSemana(data = new Date()) {
  const d = inicioSemana(data);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function moeda(valor) {
  return Number(valor || 0);
}

function calcularReceitaPorSemanaDoMes(movimentacoes, dataBase = new Date()) {
  const labels = ["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4", "Sem. 5"];
  const dados = [0, 0, 0, 0, 0];

  movimentacoes.forEach((mov) => {
    const data = new Date(mov.data_movimentacao || mov.createdAt);
    if (Number.isNaN(data.getTime()) || data.getMonth() !== dataBase.getMonth()) return;
    const indice = Math.min(Math.floor((data.getDate() - 1) / 7), 4);
    dados[indice] += moeda(mov.valor);
  });

  return { labels, dados: dados.map(v => Number(v.toFixed(2))) };
}

async function obterServicosMaisRealizados({ inicio, fim, limite = 5 }) {
  const resultado = await Agendamento.aggregate([
    {
      $match: {
        status_agendamento: "Concluido",
        data_hora_inicio: { $gte: inicio, $lte: fim },
      },
    },
    { $unwind: "$itens" },
    {
      $group: {
        _id: "$itens.id_servico",
        total: { $sum: 1 },
        receita: { $sum: "$itens.valor_cobrado" },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limite },
    {
      $lookup: {
        from: Servico.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "servico",
      },
    },
    { $unwind: { path: "$servico", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        id_servico: "$_id",
        nome: { $ifNull: ["$servico.nome_servico", "Serviço não identificado"] },
        total: 1,
        receita: 1,
      },
    },
  ]);

  return resultado;
}

async function obterProfissionaisMaisRequisitados({ inicio, fim, limite = 5 }) {
  const resultado = await Agendamento.aggregate([
    {
      $match: {
        status_agendamento: { $in: STATUS_VALIDOS_BI },
        data_hora_inicio: { $gte: inicio, $lte: fim },
      },
    },
    { $unwind: "$itens" },
    {
      $group: {
        _id: "$itens.id_profissional",
        total: { $sum: 1 },
        concluidos: {
          $sum: { $cond: [{ $eq: ["$status_agendamento", "Concluido"] }, 1, 0] },
        },
        receita: {
          $sum: { $cond: [{ $eq: ["$status_agendamento", "Concluido"] }, "$itens.valor_cobrado", 0] },
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limite },
    {
      $lookup: {
        from: Profissional.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "profissional",
      },
    },
    { $unwind: { path: "$profissional", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        id_profissional: "$_id",
        nome: { $ifNull: ["$profissional.nome", "Profissional não identificada"] },
        total: 1,
        concluidos: 1,
        receita: 1,
      },
    },
  ]);

  return resultado;
}

async function obterStatusAgendamentos({ inicio, fim }) {
  const dados = await Agendamento.aggregate([
    { $match: { data_hora_inicio: { $gte: inicio, $lte: fim } } },
    { $group: { _id: "$status_agendamento", total: { $sum: 1 } } },
  ]);

  const mapa = {
    Agendado: 0,
    Confirmado: 0,
    "Em Atendimento": 0,
    Concluido: 0,
    Cancelado: 0,
    Faltou: 0,
    Reagendado: 0,
  };

  dados.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(mapa, item._id)) mapa[item._id] = item.total;
  });

  return mapa;
}

async function obterResumoReservas({ inicio, fim }) {
  const dados = await ReservaVitrine.aggregate([
    { $match: { createdAt: { $gte: inicio, $lte: fim } } },
    { $group: { _id: "$status", total: { $sum: 1 } } },
  ]);

  const mapa = { Pendente: 0, Confirmada: 0, Retirada: 0, Cancelada: 0 };
  dados.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(mapa, item._id)) mapa[item._id] = item.total;
  });
  return mapa;
}

async function obterEstoqueCritico(limite = 8) {
  const itens = await Estoque.find({ $expr: { $lte: ["$quantidade_atual", "$quantidade_minima"] } })
    .populate("id_produto", "descricao sku unidade_medida flg_insumo flg_venda")
    .sort({ quantidade_atual: 1 })
    .limit(limite)
    .lean();

  return itens || [];
}

async function obterProximosAgendamentos(limite = 6) {
  return Agendamento.find({
    data_hora_inicio: { $gte: new Date() },
    status_agendamento: { $nin: STATUS_CANCELADOS },
  })
    .populate("id_cliente", "nome telefone")
    .populate("itens.id_servico", "nome_servico")
    .populate("itens.id_profissional", "nome")
    .sort({ data_hora_inicio: 1 })
    .limit(limite)
    .lean();
}

async function gerarDashboardSuperAdmin(dataBase = new Date()) {
  const hojeInicio = inicioDia(dataBase);
  const hojeFim = fimDia(dataBase);
  const mesInicio = inicioMes(dataBase);
  const mesFim = fimMes(dataBase);
  const semanaInicio = inicioSemana(dataBase);
  const semanaFim = fimSemana(dataBase);
  const ultimos180Dias = new Date(dataBase);
  ultimos180Dias.setDate(ultimos180Dias.getDate() - 180);

  const [
    totalClientes,
    clientesAtivosDistintos,
    agendamentosHoje,
    agendamentosSemana,
    agendamentosMes,
    statusSemana,
    statusMes,
    movimentacoesMes,
    estoqueCritico,
    reservasMes,
    servicosMaisRealizados,
    profissionaisMaisRequisitados,
    proximosAgendamentos,
  ] = await Promise.all([
    Cliente.countDocuments(),
    Agendamento.distinct("id_cliente", {
      data_hora_inicio: { $gte: ultimos180Dias, $lte: dataBase },
      status_agendamento: { $nin: STATUS_CANCELADOS },
    }),
    Agendamento.countDocuments({ data_hora_inicio: { $gte: hojeInicio, $lte: hojeFim } }),
    Agendamento.countDocuments({ data_hora_inicio: { $gte: semanaInicio, $lte: semanaFim } }),
    Agendamento.countDocuments({ data_hora_inicio: { $gte: mesInicio, $lte: mesFim } }),
    obterStatusAgendamentos({ inicio: semanaInicio, fim: semanaFim }),
    obterStatusAgendamentos({ inicio: mesInicio, fim: mesFim }),
    MovimentacaoFinanceira.find({
      flg_ativo: true,
      status_pagamento: "Pago",
      data_movimentacao: { $gte: mesInicio, $lte: mesFim },
    }).lean(),
    obterEstoqueCritico(8),
    obterResumoReservas({ inicio: mesInicio, fim: mesFim }),
    obterServicosMaisRealizados({ inicio: mesInicio, fim: mesFim, limite: 5 }),
    obterProfissionaisMaisRequisitados({ inicio: mesInicio, fim: mesFim, limite: 5 }),
    obterProximosAgendamentos(6),
  ]);

  const entradasMes = movimentacoesMes
    .filter(m => m.tipo === "ENTRADA")
    .reduce((s, m) => s + moeda(m.valor), 0);

  const saidasMes = movimentacoesMes
    .filter(m => m.tipo === "SAIDA")
    .reduce((s, m) => s + moeda(m.valor), 0);

  const saldoMes = entradasMes - saidasMes;
  const receitaPorSemana = calcularReceitaPorSemanaDoMes(
    movimentacoesMes.filter(m => m.tipo === "ENTRADA"),
    dataBase
  );

  return {
    periodo: {
      hojeInicio,
      hojeFim,
      semanaInicio,
      semanaFim,
      mesInicio,
      mesFim,
    },
    totalClientes,
    clientesAtivos: clientesAtivosDistintos.length,
    agendamentosHoje,
    agendamentosSemana,
    agendamentosMes,
    receitaMes: Number(entradasMes.toFixed(2)),
    saidasMes: Number(saidasMes.toFixed(2)),
    saldoMes: Number(saldoMes.toFixed(2)),
    itensCriticos: estoqueCritico.length,
    estoqueCritico,
    cancelamentosMes: statusMes.Cancelado,
    faltasMes: statusMes.Faltou,
    concluidosSemana: statusSemana.Concluido,
    confirmadosSemana: statusSemana.Confirmado,
    statusSemana,
    statusMes,
    reservasMes,
    totalReservasMes: Object.values(reservasMes).reduce((s, v) => s + v, 0),
    servicosMaisRealizados,
    profissionaisMaisRequisitados,
    proximosAgendamentos,
    labelsReceita: receitaPorSemana.labels,
    dadosReceita: receitaPorSemana.dados,
    labelsServicos: servicosMaisRealizados.map(s => s.nome),
    dadosServicos: servicosMaisRealizados.map(s => s.total),
    labelsProfissionais: profissionaisMaisRequisitados.map(p => p.nome),
    dadosProfissionais: profissionaisMaisRequisitados.map(p => p.total),
    labelsStatus: Object.keys(statusMes),
    dadosStatus: Object.values(statusMes),
  };
}

module.exports = {
  gerarDashboardSuperAdmin,
  obterStatusAgendamentos,
  obterServicosMaisRealizados,
  obterProfissionaisMaisRequisitados,
};
