const Agendamento = require("../models/Agendamento");
const Servico = require("../models/Servico");
const Profissional = require("../models/Profissional");
const Cliente = require("../models/Cliente");
const { possuiPermissao } = require("../middlewares/permissao");

const STATUS_AGENDAMENTO = [
  "Agendado",
  "Confirmado",
  "Em Atendimento",
  "Concluido",
  "Cancelado",
  "Faltou",
  "Reagendado",
];

const STATUS_QUE_LIBERAM_AGENDA = ["Cancelado", "Faltou", "Reagendado"];
const HORA_ABERTURA = 9;
const HORA_FECHAMENTO = 18;
const INTERVALO_MINUTOS = 30;

const STATUS_MAP = {
  Agendado: "warning",
  Confirmado: "primary",
  "Em Atendimento": "info",
  Concluido: "success",
  Cancelado: "danger",
  Faltou: "secondary",
  Reagendado: "dark",
};

function parseDataLocal(dataHora) {
  if (!dataHora) return null;

  // Inputs datetime-local chegam como "YYYY-MM-DDTHH:mm" e não têm timezone.
  // Criar a data por partes evita deslocamentos silenciosos entre Render/UTC e BRT.
  if (typeof dataHora === "string") {
    const match = dataHora.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      const [, ano, mes, dia, hora, minuto] = match.map(Number);
      return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
    }
  }

  const data = new Date(dataHora);
  return Number.isNaN(data.getTime()) ? null : data;
}

function obterInicioFimDia(dataBase = new Date()) {
  const inicio = new Date(dataBase);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(dataBase);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}


function obterInicioFimMes(dataBase = new Date()) {
  const inicio = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1, 0, 0, 0, 0);
  const fim = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

function obterInicioFimSemana(dataBase = new Date()) {
  const data = new Date(dataBase);
  const dia = data.getDay();
  const distanciaSegunda = dia === 0 ? -6 : 1 - dia;

  const inicio = new Date(data);
  inicio.setDate(data.getDate() + distanciaSegunda);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}

function validarHorarioSalao(inicio, fim) {
  if (!inicio || !fim) return "Data/hora inválida.";

  if (inicio <= new Date()) {
    return "O agendamento deve ser para uma data e hora futura.";
  }

  const diaSemana = inicio.getDay();
  if (diaSemana === 0 || diaSemana === 1) {
    return "O salão funciona apenas de terça a sábado.";
  }

  const abertura = new Date(inicio);
  abertura.setHours(HORA_ABERTURA, 0, 0, 0);

  const fechamento = new Date(inicio);
  fechamento.setHours(HORA_FECHAMENTO, 0, 0, 0);

  if (inicio < abertura || inicio >= fechamento) {
    return "Horário disponível: 09h às 18h.";
  }

  if (fim > fechamento) {
    return "A duração do serviço ultrapassa o horário de funcionamento do salão.";
  }

  return null;
}

async function calcularJanelaAtendimento(dataHoraInicio, itens = []) {
  const inicio = parseDataLocal(dataHoraInicio);
  if (!inicio) throw new Error("Data/hora de início inválida.");

  let duracaoTotalMin = 0;
  const itensNormalizados = [];

  for (const item of itens) {
    const servicoId = item.id_servico?._id || item.id_servico;
    const profissionalId = item.id_profissional?._id || item.id_profissional;

    if (!servicoId || !profissionalId) {
      throw new Error("Serviço e profissional são obrigatórios para cada item do agendamento.");
    }

    const servico = await Servico.findById(servicoId).lean();
    if (!servico || servico.flg_ativo === false) throw new Error("Serviço não encontrado ou inativo.");

    const duracao = Number(servico.duracao_estimada_min || 60);
    duracaoTotalMin += duracao;

    itensNormalizados.push({
      id_servico: servicoId,
      id_profissional: profissionalId,
      valor_cobrado: Number(item.valor_cobrado ?? servico.preco_servico ?? 0),
    });
  }

  if (!itensNormalizados.length) throw new Error("Agendamento deve ter pelo menos um serviço.");

  const fim = new Date(inicio.getTime() + duracaoTotalMin * 60000);
  const erroHorario = validarHorarioSalao(inicio, fim);
  if (erroHorario) throw new Error(erroHorario);

  return { inicio, fim, itensNormalizados, duracaoTotalMin };
}

async function buscarConflito({ inicio, fim, itens, ignorarAgendamentoId = null }) {
  const profissionais = itens.map((item) => item.id_profissional?._id || item.id_profissional).filter(Boolean);

  const filtro = {
    "itens.id_profissional": { $in: profissionais },
    status_agendamento: { $nin: STATUS_QUE_LIBERAM_AGENDA },
    data_hora_inicio: { $lt: fim },
    data_hora_fim: { $gt: inicio },
  };

  if (ignorarAgendamentoId) {
    filtro._id = { $ne: ignorarAgendamentoId };
  }

  return Agendamento.findOne(filtro).lean();
}

async function montarFiltroAgendaPorUsuario(usuario, filtrosExtras = {}) {
  if (!usuario) return { _id: null };

  if (possuiPermissao(usuario, ["SUPER_ADMIN", "RECEPCAO"])) {
    return { ...filtrosExtras };
  }

  if (possuiPermissao(usuario, ["PROFISSIONAL"])) {
    const profissional = await Profissional.findOne({ id_usuario: usuario._id, flg_ativo: true }).lean();
    if (!profissional) return { _id: null };
    return { "itens.id_profissional": profissional._id, ...filtrosExtras };
  }

  const cliente = await Cliente.findOne({ id_usuario: usuario._id }).lean();
  if (!cliente) return { _id: null };
  return { id_cliente: cliente._id, ...filtrosExtras };
}

async function usuarioPodeAcessarAgendamento(usuario, agendamento) {
  if (!usuario || !agendamento) return false;

  if (possuiPermissao(usuario, ["SUPER_ADMIN", "RECEPCAO"])) return true;

  if (possuiPermissao(usuario, ["PROFISSIONAL"])) {
    const profissional = await Profissional.findOne({ id_usuario: usuario._id, flg_ativo: true }).lean();
    if (!profissional) return false;
    return agendamento.itens?.some((item) => String(item.id_profissional?._id || item.id_profissional) === String(profissional._id));
  }

  const cliente = await Cliente.findOne({ id_usuario: usuario._id }).lean();
  return cliente && String(agendamento.id_cliente?._id || agendamento.id_cliente) === String(cliente._id);
}

async function gerarHorariosDisponiveis({ data, idServico, idProfissional, ignorarAgendamentoId = null }) {
  const dataBase = parseDataLocal(`${data}T${String(HORA_ABERTURA).padStart(2, "0")}:00`);
  if (!dataBase) throw new Error("Data inválida.");

  const servico = await Servico.findById(idServico).lean();
  if (!servico || servico.flg_ativo === false) throw new Error("Serviço não encontrado ou inativo.");

  const horarios = [];
  const abertura = new Date(dataBase);
  abertura.setHours(HORA_ABERTURA, 0, 0, 0);

  const fechamento = new Date(dataBase);
  fechamento.setHours(HORA_FECHAMENTO, 0, 0, 0);

  for (let atual = new Date(abertura); atual < fechamento; atual = new Date(atual.getTime() + INTERVALO_MINUTOS * 60000)) {
    const fim = new Date(atual.getTime() + Number(servico.duracao_estimada_min || 60) * 60000);
    const label = atual.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const erroHorario = validarHorarioSalao(atual, fim);

    let disponivel = !erroHorario;
    if (disponivel) {
      const conflito = await buscarConflito({
        inicio: atual,
        fim,
        itens: [{ id_servico: idServico, id_profissional: idProfissional }],
        ignorarAgendamentoId,
      });
      disponivel = !conflito;
    }

    horarios.push({ horario: label, disponivel });
  }

  return horarios;
}

module.exports = {
  STATUS_AGENDAMENTO,
  STATUS_QUE_LIBERAM_AGENDA,
  STATUS_MAP,
  HORA_ABERTURA,
  HORA_FECHAMENTO,
  INTERVALO_MINUTOS,
  calcularJanelaAtendimento,
  buscarConflito,
  parseDataLocal,
  validarHorarioSalao,
  obterInicioFimDia,
  obterInicioFimSemana,
  obterInicioFimMes,
  montarFiltroAgendaPorUsuario,
  usuarioPodeAcessarAgendamento,
  gerarHorariosDisponiveis,
};
