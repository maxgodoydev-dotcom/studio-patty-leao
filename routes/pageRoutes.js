const express      = require("express");
const router       = express.Router();
const auth         = require("../middlewares/auth");
const admin        = require("../middlewares/admin");
const adminStrict  = require("../middlewares/adminStrict");
const recepcaoAccess = require("../middlewares/recepcao");
const profissionalAccess = require("../middlewares/profissional");
const financeiroAccess = require("../middlewares/financeiro");
const estoqueAccess = require("../middlewares/estoque");
const Usuario      = require("../models/Usuario");
const Agendamento  = require("../models/Agendamento");
const Estoque      = require("../models/Estoque");
const Venda        = require("../models/Venda");
const Cliente      = require("../models/Cliente");
const Servico      = require("../models/Servico");
const Profissional = require("../models/Profissional");
const ReservaVitrine = require("../models/Reservavitrine");
const Fornecedor = require("../models/Fornecedor");
const {
  calcularJanelaAtendimento,
  buscarConflito,
  STATUS_AGENDAMENTO,
  STATUS_MAP,
  obterInicioFimDia,
  obterInicioFimSemana,
  obterInicioFimMes,
  gerarHorariosDisponiveis,
} = require("../services/agendamentoService");
const { baixarInsumosDoAgendamento, listarMovimentacoesRecentes } = require("../services/estoqueService");
const financeiroController = require("../controllers/financeiroController");
const { registrarPagamentoDeAtendimento } = require("../services/financeiroService");
const { gerarDashboardSuperAdmin } = require("../services/biService");
const { possuiPermissao } = require("../middlewares/permissao");


function formatarDataInput(data) {
  const d = new Date(data);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function obterInicioFimMesLocal(dataBase = new Date()) {
  const inicio = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1, 0, 0, 0, 0);
  const fim = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

function gerarDiasUteisAgenda(qtdDias = 21) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = 0; dias.length < qtdDias && i < 45; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    const diaSemana = d.getDay();
    if (diaSemana !== 0 && diaSemana !== 1) {
      dias.push({
        iso: formatarDataInput(d),
        dia: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
        semana: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      });
    }
  }
  return dias;
}

function totalAgendamento(agendamento) {
  return (agendamento.itens || []).reduce((s, item) => s + Number(item.valor_cobrado || 0), 0);
}

// ==============================
// PÁGINAS PÚBLICAS
// ==============================

router.get("/", (req, res) => {
  res.render("home", { usuario: res.locals.usuario || null });
});

router.get("/login", (req, res) => {
  if (res.locals.usuario) return res.redirect("/");
  res.render("login", { usuario: null, erro: null });
});

router.get("/cadastro", (req, res) => {
  if (res.locals.usuario) return res.redirect("/");
  res.render("cadastro", { usuario: null, erro: null });
});

router.get("/servicos", (req, res) => {
  res.render("preco", { usuario: res.locals.usuario || null });
});

// Rota legada mantida para links antigos.
router.get("/preco", (req, res) => res.redirect("/servicos"));

router.get("/sobre", (req, res) => {
  res.render("sobre", { usuario: res.locals.usuario || null });
});

// ==============================
// GALERIA
// ==============================

router.get("/progressiva", (req, res) => {
  res.render("galeria/progressiva", { usuario: res.locals.usuario || null });
});

router.get("/escova", (req, res) => {
  res.render("galeria/escova", { usuario: res.locals.usuario || null });
});

router.get("/tratamentos", (req, res) => {
  res.render("galeria/tratamento", { usuario: res.locals.usuario || null });
});

router.get("/cronograma", (req, res) => {
  res.render("galeria/cronograma", { usuario: res.locals.usuario || null });
});

// ==============================
// AGENDAMENTO
// ==============================

router.get("/agendamento", async (req, res) => {
  try {
    const [servicos, profissionais] = await Promise.all([
      Servico.find({ flg_ativo: true }).sort({ nome_servico: 1 }).lean(),
      Profissional.find({ flg_ativo: true }).lean(),
    ]);
    res.render("agendamento", {
      usuario:       res.locals.usuario || null,
      erro:          null,
      sucesso:       null,
      servicos:      servicos      || [],
      profissionais: profissionais || [],
    });
  } catch (e) {
    console.error("Erro GET /agendamento:", e);
    res.render("agendamento", {
      usuario: res.locals.usuario || null,
      erro: null, sucesso: null, servicos: [], profissionais: [],
    });
  }
});

router.post("/agendamento", auth, async (req, res) => {
  const usuario = req.usuario;

  const renderErro = async (msg) => {
    const [servicos, profissionais] = await Promise.all([
      Servico.find({ flg_ativo: true }).sort({ nome_servico: 1 }).lean().catch(() => []),
      Profissional.find({ flg_ativo: true }).lean().catch(() => []),
    ]);
    return res.render("agendamento", {
      usuario, erro: msg, sucesso: null, servicos, profissionais,
    });
  };

  try {
    const { id_servico, id_profissional, data_hora_inicio } = req.body;

    if (!id_servico || !id_profissional || !data_hora_inicio) {
      return renderErro("Preencha todos os campos: serviço, profissional e data/horário.");
    }

    const { inicio, fim, itensNormalizados } = await calcularJanelaAtendimento(data_hora_inicio, [{
      id_servico,
      id_profissional,
    }]);

    const conflito = await buscarConflito({
      inicio,
      fim,
      itens: itensNormalizados,
    });

    if (conflito) {
      return renderErro("Esta profissional já tem agendamento neste intervalo. Escolha outro horário.");
    }

    // Busca ou cria cliente vinculado ao usuário
    let cliente = await Cliente.findOne({ id_usuario: usuario._id });
    if (!cliente) {
      cliente = await Cliente.create({
        id_usuario: usuario._id,
        nome:       usuario.email,
      });
    }

    await Agendamento.create({
      id_cliente: cliente._id,
      data_hora_inicio: inicio,
      data_hora_fim: fim,
      itens: itensNormalizados,
    });

    const [servicos, profissionais] = await Promise.all([
      Servico.find({ flg_ativo: true }).sort({ nome_servico: 1 }).lean().catch(() => []),
      Profissional.find({ flg_ativo: true }).lean().catch(() => []),
    ]);
    res.render("agendamento", {
      usuario, sucesso: "Agendamento realizado com sucesso! Até breve 💛", erro: null, servicos, profissionais,
    });
  } catch (err) {
    console.error("Erro POST /agendamento:", err);
    renderErro(err.message || "Erro ao criar agendamento. Verifique os dados e tente novamente.");
  }
});

// ==============================
// ÁREA ADMIN — DASHBOARD
// ==============================

router.get("/admin", auth, admin, async (req, res) => {
  try {
    const bi = await gerarDashboardSuperAdmin(new Date());

    res.render("super_admin", {
      usuario: req.usuario,
      ...bi,
    });
  } catch (e) {
    console.error("Erro /admin:", e);
    res.render("super_admin", {
      usuario: req.usuario,
      totalClientes: 0,
      clientesAtivos: 0,
      agendamentosHoje: 0,
      agendamentosSemana: 0,
      agendamentosMes: 0,
      receitaMes: 0,
      saidasMes: 0,
      saldoMes: 0,
      itensCriticos: 0,
      cancelamentosMes: 0,
      faltasMes: 0,
      concluidosSemana: 0,
      confirmadosSemana: 0,
      estoqueCritico: [],
      reservasMes: { Pendente: 0, Confirmada: 0, Retirada: 0, Cancelada: 0 },
      totalReservasMes: 0,
      servicosMaisRealizados: [],
      profissionaisMaisRequisitados: [],
      proximosAgendamentos: [],
      labelsReceita: ["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4", "Sem. 5"],
      dadosReceita: [0, 0, 0, 0, 0],
      labelsServicos: [],
      dadosServicos: [],
      labelsProfissionais: [],
      dadosProfissionais: [],
      labelsStatus: [],
      dadosStatus: [],
    });
  }
});

// ==============================
// RECEPÇÃO
// ==============================

router.get("/recepcao", auth, recepcaoAccess, async (req, res) => {
  try {
    const agora = new Date();
    const { inicio: inicioMes, fim: fimMes } = obterInicioFimMesLocal(agora);
    const { inicio: inicioDia, fim: fimDia } = obterInicioFimDia(agora);

    const agendamentosMes = await Agendamento
      .find({ data_hora_inicio: { $gte: inicioMes, $lte: fimMes } })
      .populate("id_cliente", "nome telefone flg_alergico detalhes_alergia")
      .populate("itens.id_servico", "nome_servico preco_servico duracao_estimada_min")
      .populate("itens.id_profissional", "nome")
      .sort({ data_hora_inicio: 1 })
      .lean();

    const agendamentosHoje = agendamentosMes.filter(a => {
      const d = new Date(a.data_hora_inicio);
      return d >= inicioDia && d <= fimDia;
    });

    const emAtendimento = agendamentosHoje.filter(a => a.status_agendamento === "Em Atendimento").length;
    const concluidos    = agendamentosHoje.filter(a => a.status_agendamento === "Concluido").length;
    const cancelados    = agendamentosHoje.filter(a => a.status_agendamento === "Cancelado").length;
    const faltas        = agendamentosHoje.filter(a => a.status_agendamento === "Faltou").length;

    const [servicos, profissionais] = await Promise.all([
      Servico.find({ flg_ativo: true }).sort({ nome_servico: 1 }).lean(),
      Profissional.find({ flg_ativo: true }).sort({ nome: 1 }).lean(),
    ]);

    res.render("recepcao", {
      usuario: req.usuario,
      agendamentos: agendamentosMes,
      servicos,
      profissionais,
      diasAgenda: gerarDiasUteisAgenda(21),
      mesReferencia: agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      agendadosHoje: agendamentosHoje.length,
      agendamentosMesTotal: agendamentosMes.length,
      emAtendimento,
      concluidos,
      cancelados,
      faltas,
      statusMap: STATUS_MAP,
      erro: req.query.erro || null,
      sucesso: req.query.sucesso || null,
    });
  } catch (e) {
    console.error("Erro /recepcao:", e);
    res.render("recepcao", {
      usuario: req.usuario,
      agendamentos: [],
      servicos: [],
      profissionais: [],
      diasAgenda: gerarDiasUteisAgenda(21),
      mesReferencia: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      agendadosHoje: 0,
      agendamentosMesTotal: 0,
      emAtendimento: 0,
      concluidos: 0,
      cancelados: 0,
      faltas: 0,
      statusMap: STATUS_MAP,
      erro: "Erro ao carregar recepção.",
      sucesso: null,
    });
  }
});

// ==============================
// AGENDAMENTO RÁPIDO — RECEPÇÃO / SUPER ADMIN
// Cliente de balcão sem cadastro completo de login.
// ==============================

router.post("/recepcao/agendamento-rapido", auth, recepcaoAccess, async (req, res) => {
  try {
    const { nome_cliente, telefone_cliente, id_servico, id_profissional, data_hora_inicio, flg_alergico, detalhes_alergia } = req.body;

    if (!nome_cliente || !telefone_cliente || !id_servico || !id_profissional || !data_hora_inicio) {
      return res.redirect("/recepcao?erro=" + encodeURIComponent("Preencha nome, telefone, serviço, profissional e horário."));
    }

    const telefone = telefone_cliente.trim();
    const nome = nome_cliente.trim();

    let cliente = await Cliente.findOne({ telefone });
    if (!cliente) {
      cliente = await Cliente.create({
        id_usuario: null,
        nome,
        telefone,
        flg_alergico: flg_alergico === "on",
        detalhes_alergia: flg_alergico === "on" ? (detalhes_alergia?.trim() || "Alergia informada no balcão") : null,
      });
    } else {
      if (!cliente.nome || cliente.nome === cliente.telefone) cliente.nome = nome;
      if (flg_alergico === "on") {
        cliente.flg_alergico = true;
        cliente.detalhes_alergia = detalhes_alergia?.trim() || cliente.detalhes_alergia || "Alergia informada no balcão";
      }
      await cliente.save();
    }

    const { inicio, fim, itensNormalizados } = await calcularJanelaAtendimento(data_hora_inicio, [{
      id_servico,
      id_profissional,
    }]);

    const conflito = await buscarConflito({
      inicio,
      fim,
      itens: itensNormalizados,
    });

    if (conflito) {
      return res.redirect("/recepcao?erro=" + encodeURIComponent("Conflito de agenda: essa profissional já possui atendimento nesse intervalo."));
    }

    await Agendamento.create({
      id_cliente: cliente._id,
      data_hora_inicio: inicio,
      data_hora_fim: fim,
      status_agendamento: "Agendado",
      itens: itensNormalizados,
    });

    return res.redirect("/recepcao?sucesso=" + encodeURIComponent("Agendamento rápido criado com sucesso."));
  } catch (e) {
    console.error("Erro POST /recepcao/agendamento-rapido:", e);
    return res.redirect("/recepcao?erro=" + encodeURIComponent(e.message || "Erro ao criar agendamento rápido."));
  }
});

// ==============================
// ESTOQUE
// ==============================

router.get("/estoque", auth, estoqueAccess, async (req, res) => {
  try {
    const [estoque, movimentacoes] = await Promise.all([
      Estoque
        .find()
        .populate("id_produto", "sku descricao unidade_medida preco_venda flg_insumo flg_venda")
        .lean(),
      listarMovimentacoesRecentes(8),
    ]);

    const criticos   = estoque.filter(e => e.quantidade_atual <= e.quantidade_minima).length;
    const valorTotal = estoque.reduce((s, e) => {
      const preco = e.id_produto?.preco_venda || 0;
      return s + (preco * (e.quantidade_atual || 0));
    }, 0);

    res.render("estoque", {
      usuario:       req.usuario,
      estoque,
      movimentacoes,
      totalItens:    estoque.length,
      itensCriticos: criticos,
      valorEstoque:  valorTotal,
    });
  } catch (e) {
    console.error("Erro /estoque:", e);
    res.render("estoque", {
      usuario:       req.usuario,
      estoque:       [],
      movimentacoes: [],
      totalItens:    0,
      itensCriticos: 0,
      valorEstoque:  0,
    });
  }
});

// ==============================
// FINANCEIRO
// ==============================

router.get("/financeiro", auth, financeiroAccess, financeiroController.paginaFinanceiro);

// ==============================
// ATUALIZAR STATUS DE AGENDAMENTO
// ==============================

router.post("/agendamento/:id/status", auth, recepcaoAccess, async (req, res) => {
  try {
    const statusValidos = STATUS_AGENDAMENTO;
    const status = req.body.status;

    if (!statusValidos.includes(status)) {
      return res.redirect("/recepcao");
    }

    const agendamento = await Agendamento.findById(req.params.id);
    if (!agendamento) return res.redirect("/recepcao");

    const statusAnterior = agendamento.status_agendamento;
    agendamento.status_agendamento = status;
    await agendamento.save();

    // Fase 3: ao concluir atendimento, baixa automaticamente os insumos
    // vinculados ao(s) serviço(s). Se não houver saldo, o status é revertido
    // para evitar atendimento concluído com estoque inconsistente.
    if (status === "Concluido" && !agendamento.estoque_baixado) {
      try {
        await baixarInsumosDoAgendamento(agendamento._id, req.usuario?._id);
        await registrarPagamentoDeAtendimento(
          agendamento._id,
          req.usuario?._id,
          req.body.forma_pagamento || "Não informado"
        );
        return res.redirect("/recepcao?sucesso=Atendimento%20concluido%2C%20estoque%20baixado%20e%20financeiro%20registrado.");
      } catch (erroEstoque) {
        console.error("Erro na baixa automática de estoque:", erroEstoque);
        agendamento.status_agendamento = statusAnterior;
        await agendamento.save();
        return res.redirect(`/recepcao?erro=${encodeURIComponent(erroEstoque.message || "Estoque insuficiente para concluir atendimento.")}`);
      }
    }
  } catch (e) {
    console.error("Erro ao atualizar status do agendamento:", e);
    return res.redirect("/recepcao?erro=Erro%20ao%20atualizar%20status.");
  }
  res.redirect("/recepcao");
});

// ==============================
// PERFIL — despacho por tipo_perfil
// ==============================

// GET /perfil — redireciona para a view correta conforme o perfil do usuário logado
router.get("/perfil", auth, (req, res) => {
  if (possuiPermissao(req.usuario, ["SUPER_ADMIN"]))   return res.redirect("/perfil/admin");
  if (possuiPermissao(req.usuario, ["PROFISSIONAL"])) return res.redirect("/perfil/profissional");
  return res.redirect("/perfil/cliente"); // CLIENTE é o default
});

// ==============================
// PERFIL CLIENTE
// ==============================

// GET /perfil/cliente
router.get("/perfil/cliente", auth, async (req, res) => {
  try {
    const cliente = await Cliente
      .findOne({ id_usuario: req.usuario._id })
      .lean();

    const agendamentos = cliente
      ? await Agendamento
          .find({ id_cliente: cliente._id })
          .populate("itens.id_servico",      "nome_servico")
          .populate("itens.id_profissional", "nome")
          .sort({ data_hora_inicio: -1 })
          .lean()
      : [];

    const reservas = cliente
      ? await ReservaVitrine
          .find({ id_cliente: cliente._id })
          .populate("id_produto", "descricao preco_venda imagem_url")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    res.render("perfil/cliente", {
      usuario:      req.usuario,
      cliente,
      agendamentos,
      reservas,
      erro:    req.query.erro || null,
      sucesso: req.query.sucesso || null,
    });
  } catch (e) {
    console.error("Erro GET /perfil/cliente:", e);
    res.render("perfil/cliente", {
      usuario:      req.usuario,
      cliente:      null,
      agendamentos: [],
      reservas: [],
      erro:    "Erro ao carregar seus dados.",
      sucesso: null,
    });
  }
});

// POST /perfil/cliente — salva alterações de nome, telefone e alergia
router.post("/perfil/cliente", auth, async (req, res) => {
  const renderErro = (msg, cliente, agendamentos, reservas = []) =>
    res.render("perfil/cliente", {
      usuario: req.usuario, cliente, agendamentos, reservas, erro: msg, sucesso: null,
    });

  try {
    const { nome, telefone, flgAlergico, detalhesAlergia } = req.body;

    if (!nome || !nome.trim()) {
      const cliente = await Cliente.findOne({ id_usuario: req.usuario._id }).lean();
      return renderErro("Nome é obrigatório.", cliente, []);
    }

    const flg_alergico = flgAlergico === "on";

    const cliente = await Cliente.findOneAndUpdate(
      { id_usuario: req.usuario._id },
      {
        nome:             nome.trim(),
        telefone:         telefone?.trim() || null,
        flg_alergico,
        detalhes_alergia: flg_alergico ? (detalhesAlergia?.trim() || null) : null,
      },
      { new: true, runValidators: true }
    ).lean();

    const agendamentos = cliente
      ? await Agendamento
          .find({ id_cliente: cliente._id })
          .populate("itens.id_servico",      "nome_servico")
          .populate("itens.id_profissional", "nome")
          .sort({ data_hora_inicio: -1 })
          .lean()
      : [];

    const reservas = cliente
      ? await ReservaVitrine
          .find({ id_cliente: cliente._id })
          .populate("id_produto", "descricao preco_venda imagem_url")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    res.render("perfil/cliente", {
      usuario: req.usuario,
      cliente,
      agendamentos,
      reservas,
      erro:    null,
      sucesso: "Dados atualizados com sucesso!",
    });
  } catch (e) {
    console.error("Erro POST /perfil/cliente:", e);
    const cliente = await Cliente.findOne({ id_usuario: req.usuario._id }).lean().catch(() => null);
    renderErro("Erro ao salvar. Tente novamente.", cliente, []);
  }
});

// ==============================
// PERFIL PROFISSIONAL
// ==============================

router.get("/profissional", auth, profissionalAccess, (req, res) => res.redirect("/perfil/profissional"));

router.get("/perfil/profissional", auth, profissionalAccess, async (req, res) => {
  try {
    const profissional = await Profissional.findOne({ id_usuario: req.usuario._id }).lean();
    const hoje = new Date();
    const { inicio: inicioDia, fim: fimDia } = obterInicioFimDia(hoje);
    const { inicio: inicioMes, fim: fimMes } = obterInicioFimMesLocal(hoje);

    const agendamentos = profissional
      ? await Agendamento
          .find({
            "itens.id_profissional": profissional._id,
            data_hora_inicio: { $gte: inicioMes, $lte: fimMes },
          })
          .populate("id_cliente", "nome telefone flg_alergico detalhes_alergia")
          .populate("itens.id_servico", "nome_servico preco_servico")
          .sort({ data_hora_inicio: 1 })
          .lean()
      : [];

    const agendamentosHoje = agendamentos.filter(a => {
      const d = new Date(a.data_hora_inicio);
      return d >= inicioDia && d <= fimDia;
    });

    const concluidos = agendamentos.filter(a => a.status_agendamento === "Concluido");
    const canceladosOuFaltas = agendamentos.filter(a => ["Cancelado", "Faltou"].includes(a.status_agendamento));
    const faturadoServicos = concluidos.reduce((s, a) => s + totalAgendamento(a), 0);
    const valorPerdido = canceladosOuFaltas.reduce((s, a) => s + totalAgendamento(a), 0);

    const rankingMap = new Map();
    agendamentos
      .filter(a => a.id_cliente && a.status_agendamento === "Concluido")
      .forEach(a => {
        const id = String(a.id_cliente._id || a.id_cliente);
        const atual = rankingMap.get(id) || { nome: a.id_cliente.nome || "Cliente", total: 0 };
        atual.total += 1;
        rankingMap.set(id, atual);
      });
    const clientesRanking = [...rankingMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    res.render("perfil/profissional", {
      usuario: req.usuario,
      profissional,
      agendamentos,
      mesReferencia: hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      totalAgendamentos: agendamentos.length,
      totalHoje: agendamentosHoje.length,
      totalSemana: agendamentos.length,
      totalConcluidos: concluidos.length,
      totalConfirmados: agendamentos.filter(a => a.status_agendamento === "Confirmado").length,
      totalAgendados: agendamentos.filter(a => a.status_agendamento === "Agendado").length,
      totalCanceladosFaltas: canceladosOuFaltas.length,
      faturadoServicos,
      valorPerdido,
      clientesRanking,
      statusMap: STATUS_MAP,
      erro: null,
      sucesso: null,
    });
  } catch (e) {
    console.error("Erro GET /perfil/profissional:", e);
    res.render("perfil/profissional", {
      usuario: req.usuario,
      profissional: null,
      agendamentos: [],
      mesReferencia: "",
      totalAgendamentos: 0,
      totalHoje: 0,
      totalSemana: 0,
      totalConcluidos: 0,
      totalConfirmados: 0,
      totalAgendados: 0,
      totalCanceladosFaltas: 0,
      faturadoServicos: 0,
      valorPerdido: 0,
      clientesRanking: [],
      statusMap: STATUS_MAP,
      erro: "Erro ao carregar seus dados.",
      sucesso: null,
    });
  }
});

router.post("/perfil/profissional", auth, profissionalAccess, async (req, res) => {
  try {
    const { nome, especialidade, telefone } = req.body;
    if (!nome || !nome.trim()) return res.redirect("/perfil/profissional?erro=" + encodeURIComponent("Nome é obrigatório."));

    await Profissional.findOneAndUpdate(
      { id_usuario: req.usuario._id },
      { nome: nome.trim(), especialidade: especialidade?.trim() || null, telefone: telefone?.trim() || null },
      { new: true, runValidators: true }
    );

    res.redirect("/perfil/profissional?sucesso=" + encodeURIComponent("Dados atualizados com sucesso."));
  } catch (e) {
    console.error("Erro POST /perfil/profissional:", e);
    res.redirect("/perfil/profissional?erro=" + encodeURIComponent("Erro ao salvar dados."));
  }
});

// ==============================
// PERFIL ADMIN
// ==============================

// GET /perfil/admin
router.get("/perfil/admin", auth, adminStrict, async (req, res) => {
  try {
    const [totalClientes, totalProfissionais, profissionais] = await Promise.all([
      Cliente.countDocuments(),
      Profissional.countDocuments({ flg_ativo: true }),
      Profissional.find({}).populate("id_usuario", "email permissoes flg_ativo").sort({ nome: 1 }).lean(),
    ]);

    res.render("perfil/admin", {
      usuario:           req.usuario,
      totalClientes,
      totalProfissionais,
      profissionais,
      erro:    req.query.erro || null,
      sucesso: req.query.sucesso || null,
    });
  } catch (e) {
    console.error("Erro GET /perfil/admin:", e);
    res.render("perfil/admin", {
      usuario:           req.usuario,
      totalClientes:     0,
      totalProfissionais: 0,
      profissionais: [],
      erro:    "Erro ao carregar dados.",
      sucesso: null,
    });
  }
});

// POST /perfil/admin — Super Admin pode atualizar nome e e-mail da própria conta.
router.post("/perfil/admin", auth, adminStrict, async (req, res) => {
  try {
    const nome = req.body.nome?.trim() || null;
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.redirect("/perfil/admin?erro=" + encodeURIComponent("E-mail é obrigatório."));
    }

    const emailEmUso = await Usuario.findOne({ email, _id: { $ne: req.usuario._id } }).lean();
    if (emailEmUso) {
      return res.redirect("/perfil/admin?erro=" + encodeURIComponent("Este e-mail já está em uso por outra conta."));
    }

    await Usuario.findByIdAndUpdate(req.usuario._id, { nome, email }, { runValidators: true });
    return res.redirect("/perfil/admin?sucesso=" + encodeURIComponent("Dados atualizados com sucesso."));
  } catch (e) {
    console.error("Erro POST /perfil/admin:", e);
    return res.redirect("/perfil/admin?erro=" + encodeURIComponent("Erro ao atualizar seus dados."));
  }
});


// POST /perfil/admin/profissionais — Super Admin cadastra profissional com conta de acesso.
router.post("/perfil/admin/profissionais", auth, adminStrict, async (req, res) => {
  try {
    const nome = req.body.nome?.trim();
    const email = req.body.email?.toLowerCase().trim();
    const telefone = req.body.telefone?.trim() || null;
    const especialidade = req.body.especialidade?.trim() || null;
    const senha = req.body.senha?.trim() || "Admin@2026";

    if (!nome || !email) {
      return res.redirect("/perfil/admin?erro=" + encodeURIComponent("Nome e e-mail da profissional são obrigatórios."));
    }

    const existente = await Usuario.findOne({ email }).lean();
    if (existente) {
      return res.redirect("/perfil/admin?erro=" + encodeURIComponent("Já existe um usuário com este e-mail."));
    }

    const usuarioProf = await Usuario.create({
      nome,
      email,
      senha,
      permissoes: ["PROFISSIONAL"],
      tipo_perfil: "PROFISSIONAL",
      flg_ativo: true,
    });

    await Profissional.create({
      id_usuario: usuarioProf._id,
      nome,
      telefone,
      especialidade,
      flg_ativo: true,
    });

    return res.redirect("/perfil/admin?sucesso=" + encodeURIComponent("Profissional cadastrada com sucesso."));
  } catch (e) {
    console.error("Erro ao cadastrar profissional:", e);
    return res.redirect("/perfil/admin?erro=" + encodeURIComponent(e.message || "Erro ao cadastrar profissional."));
  }
});

// ==============================
// FORNECEDORES — visão simples para Super Admin / Estoque
// ==============================
router.get("/fornecedores", auth, estoqueAccess, async (req, res) => {
  try {
    const fornecedores = await Fornecedor.find({}).sort({ razao_social: 1 }).lean();
    res.render("fornecedores", {
      usuario: req.usuario,
      fornecedores,
      erro: req.query.erro || null,
      sucesso: req.query.sucesso || null,
    });
  } catch (e) {
    console.error("Erro GET /fornecedores:", e);
    res.render("fornecedores", { usuario: req.usuario, fornecedores: [], erro: "Erro ao carregar fornecedores.", sucesso: null });
  }
});

router.post("/fornecedores", auth, estoqueAccess, async (req, res) => {
  try {
    const razao_social = req.body.razao_social?.trim();
    if (!razao_social) return res.redirect("/fornecedores?erro=" + encodeURIComponent("Razão social é obrigatória."));

    await Fornecedor.create({
      razao_social,
      cnpj: req.body.cnpj?.replace(/\D/g, "") || null,
      telefone: req.body.telefone?.trim() || null,
      email: req.body.email?.toLowerCase().trim() || null,
      cidade: req.body.cidade?.trim() || "São Paulo",
      estado: req.body.estado?.trim().toUpperCase() || "SP",
      flg_ativo: req.body.flg_ativo !== "false",
    });
    res.redirect("/fornecedores?sucesso=" + encodeURIComponent("Fornecedor cadastrado."));
  } catch (e) {
    console.error("Erro POST /fornecedores:", e);
    res.redirect("/fornecedores?erro=" + encodeURIComponent(e.message || "Erro ao salvar fornecedor."));
  }
});

module.exports = router;
