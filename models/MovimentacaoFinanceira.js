const mongoose = require("mongoose");

// ============================================================
// models/MovimentacaoFinanceira.js
// Registro financeiro simples e manual do salão.
//
// Este model NÃO transforma o projeto em ERP/PDV avançado.
// Ele existe para registrar entradas e saídas presenciais:
// - pagamento de atendimento concluído
// - produto vendido no balcão
// - saída operacional simples
// - ajuste manual do financeiro
// ============================================================

const MovimentacaoFinanceiraSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["ENTRADA", "SAIDA"],
      required: [true, "Tipo da movimentação é obrigatório"],
    },

    origem: {
      type: String,
      enum: ["ATENDIMENTO", "PRODUTO_BALCAO", "RESERVA_VITRINE", "MANUAL", "AJUSTE_CAIXA"],
      default: "MANUAL",
    },

    descricao: {
      type: String,
      required: [true, "Descrição é obrigatória"],
      trim: true,
      maxlength: [180, "Descrição não pode ter mais de 180 caracteres"],
    },

    valor: {
      type: Number,
      required: [true, "Valor é obrigatório"],
      min: [0.01, "Valor deve ser maior que zero"],
    },

    forma_pagamento: {
      type: String,
      enum: ["Dinheiro", "PIX presencial", "Débito", "Crédito", "Não informado"],
      default: "Não informado",
    },

    status_pagamento: {
      type: String,
      enum: ["Pendente", "Pago", "Cancelado"],
      default: "Pago",
    },

    data_movimentacao: {
      type: Date,
      default: Date.now,
    },

    id_cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      default: null,
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

    id_venda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venda",
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

    flg_ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

MovimentacaoFinanceiraSchema.index({ data_movimentacao: -1 });
MovimentacaoFinanceiraSchema.index({ tipo: 1, status_pagamento: 1, data_movimentacao: -1 });
MovimentacaoFinanceiraSchema.index({ origem: 1, data_movimentacao: -1 });
MovimentacaoFinanceiraSchema.index({ id_agendamento: 1 }, { sparse: true });

module.exports = mongoose.model("MovimentacaoFinanceira", MovimentacaoFinanceiraSchema);
