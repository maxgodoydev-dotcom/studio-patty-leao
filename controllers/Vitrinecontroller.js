// ============================================================
// controllers/vitrineController.js
//
// Gerencia a vitrine digital:
//   GET  /vitrine       — listagem pública de produtos
//   POST /vitrine/reservar — cria reserva (requer login)
//   GET  /vitrine/minhas-reservas — histórico da cliente
//   GET  /vitrine/admin          — painel de reservas (admin)
//   POST /vitrine/admin/:id/status — atualiza status (admin)
// ============================================================

const Produto        = require("../models/Produto");
const ReservaVitrine = require("../models/Reservavitrine");
const Cliente        = require("../models/Cliente");
const Estoque        = require("../models/Estoque");
const { movimentarProduto } = require("../services/estoqueService");

// -------------------------------------------------------
// GET /vitrine — Página pública da vitrine
// -------------------------------------------------------
exports.listarVitrine = async (req, res) => {
  try {
    const produtos = await Produto
      .find({
        flg_venda: true,
        descricao: { $in: ["Kit Tratamento Capilar", "Reparador de Pontas", "Perfume Capilar"] },
      })
      .sort({ descricao: 1 })
      .lean();

    res.render("vitrinedigital", {
      usuario:  res.locals.usuario || null,
      produtos,
      sucesso:  req.query.sucesso || null,
      erro:     req.query.erro    || null,
    });
  } catch (e) {
    console.error("Erro GET /vitrine:", e);
    res.render("vitrinedigital", {
      usuario:  res.locals.usuario || null,
      produtos: [],
      sucesso:  null,
      erro:     "Erro ao carregar a vitrine. Tente novamente em instantes.",
    });
  }
};

// -------------------------------------------------------
// POST /vitrine/reservar — Cria reserva (requer login)
// -------------------------------------------------------
exports.criarReserva = async (req, res) => {
  const usuario = req.usuario;

  try {
    const { id_produto, quantidade, observacao, data_retirada_prevista } = req.body;

    // Validações básicas
    if (!id_produto) {
      return res.redirect("/vitrine?erro=Produto+inválido.");
    }

    const qtd = parseInt(quantidade, 10) || 1;
    if (qtd < 1 || qtd > 10) {
      return res.redirect("/vitrine?erro=Quantidade+deve+ser+entre+1+e+10.");
    }

    // Verifica produto
    const produto = await Produto.findOne({ _id: id_produto, flg_venda: true }).lean();
    if (!produto) {
      return res.redirect("/vitrine?erro=Produto+não+encontrado.");
    }

    // Vitrine é reserva presencial, mas precisa respeitar disponibilidade real.
    const estoque = await Estoque.findOne({ id_produto }).lean();
    if (!estoque || Number(estoque.quantidade_atual || 0) < qtd) {
      return res.redirect("/vitrine?erro=Produto+sem+estoque+suficiente+para+reserva.");
    }

    // Verifica/cria registro de cliente
    let cliente = await Cliente.findOne({ id_usuario: usuario._id });
    if (!cliente) {
      cliente = await Cliente.create({
        id_usuario: usuario._id,
        nome:       usuario.email,
      });
    }

    // Verifica se já existe reserva Pendente ou Confirmada para o mesmo produto
    const reservaExistente = await ReservaVitrine.findOne({
      id_cliente: cliente._id,
      id_produto,
      status: { $in: ["Pendente", "Confirmada"] },
    });

    if (reservaExistente) {
      return res.redirect(
        "/vitrine?erro=Você+já+tem+uma+reserva+ativa+para+este+produto.+Aguarde+a+confirmação+do+salão."
      );
    }

    // Data de retirada prevista — mínimo amanhã
    let dataRetirada = null;
    if (data_retirada_prevista) {
      dataRetirada = new Date(data_retirada_prevista);
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);
      if (dataRetirada < amanha) {
        return res.redirect("/vitrine?erro=A+data+de+retirada+deve+ser+a+partir+de+amanhã.");
      }
    }

    await ReservaVitrine.create({
      id_cliente:             cliente._id,
      id_produto,
      quantidade:             qtd,
      observacao:             observacao?.trim() || null,
      status:                 "Pendente",
      data_retirada_prevista: dataRetirada,
      preco_unitario_reserva: produto.preco_venda,
    });

    return res.redirect("/vitrine?sucesso=Reserva+realizada!+Aguarde+nosso+contato+para+confirmação.");

  } catch (e) {
    console.error("Erro POST /vitrine/reservar:", e);
    return res.redirect("/vitrine?erro=Erro+ao+processar+reserva.+Tente+novamente.");
  }
};

// -------------------------------------------------------
// GET /vitrine/minhas-reservas — Histórico da cliente
// -------------------------------------------------------
exports.minhasReservas = async (req, res) => {
  return res.redirect("/perfil/cliente#reservas");
};

// -------------------------------------------------------
// GET /vitrine/admin — Painel de reservas (admin)
// -------------------------------------------------------
exports.adminReservas = async (req, res) => {
  try {
    const reservas = await ReservaVitrine
      .find()
      .populate("id_cliente", "nome telefone")
      .populate("id_produto", "descricao preco_venda sku")
      .sort({ createdAt: -1 })
      .lean();

    const pendentes   = reservas.filter(r => r.status === "Pendente").length;
    const confirmadas = reservas.filter(r => r.status === "Confirmada").length;

    res.render("admin_reservas", {
      usuario:    req.usuario,
      reservas,
      pendentes,
      confirmadas,
      erro:       req.query.erro || null,
      sucesso:    req.query.sucesso || null,
    });
  } catch (e) {
    console.error("Erro GET /vitrine/admin:", e);
    res.render("admin_reservas", {
      usuario:    req.usuario,
      reservas:   [],
      pendentes:  0,
      confirmadas: 0,
      erro:       "Erro ao carregar reservas.",
      sucesso:    null,
    });
  }
};

// -------------------------------------------------------
// POST /vitrine/admin/:id/status — Atualiza status (admin)
// -------------------------------------------------------
exports.atualizarStatusReserva = async (req, res) => {
  try {
    const statusValidos = ["Pendente", "Confirmada", "Retirada", "Cancelada"];
    const { status } = req.body;

    if (!statusValidos.includes(status)) {
      return res.redirect("/vitrine/admin");
    }

    const reserva = await ReservaVitrine.findById(req.params.id);
    if (!reserva) return res.redirect("/vitrine/admin?erro=Reserva+não+encontrada.");

    const precisaValidarEstoque = status === "Confirmada" || (status === "Retirada" && !reserva.estoque_baixado);
    if (precisaValidarEstoque) {
      const estoque = await Estoque.findOne({ id_produto: reserva.id_produto }).lean();
      if (!estoque || Number(estoque.quantidade_atual || 0) < Number(reserva.quantidade || 0)) {
        return res.redirect("/vitrine/admin?erro=Estoque+insuficiente+para+confirmar+ou+retirar+esta+reserva.");
      }
    }

    reserva.status = status;
    await reserva.save();

    // A baixa só acontece na retirada física do produto.
    // Não existe checkout nem pagamento online neste fluxo.
    if (status === "Retirada" && !reserva.estoque_baixado) {
      try {
        await movimentarProduto({
          idProduto: reserva.id_produto,
          tipo: "SAIDA",
          quantidade: reserva.quantidade,
          origem: "RESERVA_VITRINE",
          usuarioId: req.usuario?._id,
          reservaVitrineId: reserva._id,
          observacao: "Baixa automática de produto retirado da vitrine",
        });

        reserva.estoque_baixado = true;
        reserva.data_baixa_estoque = new Date();
        await reserva.save();
      } catch (erroEstoque) {
        console.error("Erro ao baixar estoque da reserva:", erroEstoque);
        reserva.status = "Confirmada";
        await reserva.save();
        return res.redirect(`/vitrine/admin?erro=${encodeURIComponent(erroEstoque.message || "Estoque insuficiente para retirar reserva.")}`);
      }
    }
  } catch (e) {
    console.error("Erro POST /vitrine/admin/:id/status:", e);
    return res.redirect("/vitrine/admin?erro=Erro+ao+atualizar+reserva.");
  }
  res.redirect("/vitrine/admin");
};