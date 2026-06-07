const mongoose = require("mongoose");

// ============================================================
// models/Caixa.js
// Controle de abertura e fechamento de caixa diário.
//
// DECISÃO DE MODELAGEM — diferença em relação ao schema SQL:
// No SQL, "caixa" era uma tabela de movimentações individuais
// (cada venda/agendamento gerava uma linha). Aqui modelamos
// como sessão de caixa: um documento por dia de operação,
// com referências às vendas e agendamentos do dia.
//
// As movimentações individuais ficam nos documents Venda e
// Agendamento — o Caixa registra os totais consolidados e
// o estado de abertura/fechamento. Isso simplifica os
// relatórios de fechamento sem precisar agregar N linhas.
// ============================================================

const CaixaSchema = new mongoose.Schema(
  {
    data_referencia: {
      type: String,
      required: [true, "Data de referência é obrigatória"],
      trim: true,
    },

    data_abertura: {
      type: Date,
      required: [true, "Data de abertura é obrigatória"],
      default: Date.now,
    },

    data_fechamento: {
      type: Date,
      default: null, // null = caixa ainda aberto
    },

    // Valor em dinheiro físico no início do dia (troco)
    saldo_inicial: {
      type: Number,
      required: [true, "Saldo inicial é obrigatório"],
      min: [0, "Saldo inicial não pode ser negativo"],
      default: 0,
    },

    // Preenchido no fechamento pelo financeiroController
    saldo_final: {
      type: Number,
      default: null,
      min: [0, "Saldo final não pode ser negativo"],
    },

    // Saldo calculado pelo sistema: saldo_inicial + entradas - saídas
    saldo_sistema: {
      type: Number,
      default: null,
    },

    // Totalizadores calculados no fechamento
    total_entradas: {
      type: Number,
      default: 0,
    },

    total_saidas: {
      type: Number,
      default: 0,
    },

    // Mantidos por compatibilidade com o projeto anterior
    total_vendas: {
      type: Number,
      default: 0,
    },

    total_servicos: {
      type: Number,
      default: 0,
    },

    status_caixa: {
      type: String,
      enum: ["Aberto", "Fechado"],
      default: "Aberto",
    },

    // Quem abriu e fechou o caixa (auditoria)
    aberto_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "Responsável pela abertura é obrigatório"],
    },

    fechado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },

    observacoes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ------------------------------------------------------------
// VIRTUAL: status do caixa
// Retorna "aberto" ou "fechado" sem campo extra no banco.
// ------------------------------------------------------------
CaixaSchema.virtual("status").get(function () {
  return this.status_caixa === "Fechado" || this.data_fechamento ? "fechado" : "aberto";
});

// Impede abertura de dois caixas no mesmo dia
CaixaSchema.index({ data_abertura: -1 });
CaixaSchema.index({ data_referencia: 1, status_caixa: 1 });

module.exports = mongoose.model("Caixa", CaixaSchema);
