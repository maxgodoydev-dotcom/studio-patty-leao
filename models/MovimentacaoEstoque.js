const mongoose = require("mongoose");

// ============================================================
// models/MovimentacaoEstoque.js
// Histórico auditável das entradas e saídas de estoque.
//
// Este model NÃO transforma o sistema em ERP complexo. Ele serve
// para responder perguntas operacionais simples:
// - Quem movimentou?
// - Quando movimentou?
// - Qual produto saiu/entrou?
// - A origem foi atendimento, reserva, ajuste manual ou venda presencial?
// - Qual era o saldo antes e depois?
// ============================================================

const MovimentacaoEstoqueSchema = new mongoose.Schema(
  {
    id_estoque: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Estoque",
      required: [true, "Estoque é obrigatório"],
    },

    id_produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produto",
      required: [true, "Produto é obrigatório"],
    },

    tipo: {
      type: String,
      enum: ["ENTRADA", "SAIDA"],
      required: [true, "Tipo de movimentação é obrigatório"],
    },

    origem: {
      type: String,
      enum: ["MANUAL", "ATENDIMENTO", "RESERVA_VITRINE", "AJUSTE", "VENDA_PRESENCIAL"],
      default: "MANUAL",
    },

    quantidade: {
      type: Number,
      required: [true, "Quantidade é obrigatória"],
      min: [0.001, "Quantidade deve ser maior que zero"],
    },

    saldo_anterior: {
      type: Number,
      required: true,
      min: [0, "Saldo anterior não pode ser negativo"],
    },

    saldo_posterior: {
      type: Number,
      required: true,
      min: [0, "Saldo posterior não pode ser negativo"],
    },

    id_agendamento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agendamento",
      default: null,
    },

    id_reserva_vitrine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservavitrine",
      default: null,
    },

    id_usuario_responsavel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },

    observacao: {
      type: String,
      trim: true,
      maxlength: [300, "Observação não pode ter mais de 300 caracteres"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MovimentacaoEstoqueSchema.index({ id_produto: 1, createdAt: -1 });
MovimentacaoEstoqueSchema.index({ tipo: 1, origem: 1, createdAt: -1 });
MovimentacaoEstoqueSchema.index({ id_agendamento: 1 });

module.exports = mongoose.model("MovimentacaoEstoque", MovimentacaoEstoqueSchema);
