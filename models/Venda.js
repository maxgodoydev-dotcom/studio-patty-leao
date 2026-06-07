const mongoose = require("mongoose");

// ============================================================
// models/Venda.js
// Venda direta de produtos no balcão (sem agendamento).
//
// Assim como Agendamento, os itens da venda são embutidos:
// uma venda e seus produtos são sempre lidos juntos.
//
// id_cliente é opcional — permite vendas rápidas sem
// identificar o comprador (ex: cliente de passagem).
// ============================================================

const ItemVendaSchema = new mongoose.Schema(
  {
    id_produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produto",
      required: [true, "Produto é obrigatório"],
    },

    quantidade: {
      type: Number,
      required: [true, "Quantidade é obrigatória"],
      min: [0.001, "Quantidade deve ser maior que zero"],
    },

    // Preço no momento da venda — não deve referenciar preco_venda
    // diretamente porque o preço pode mudar depois
    preco_unitario_venda: {
      type: Number,
      required: [true, "Preço unitário é obrigatório"],
      min: [0, "Preço não pode ser negativo"],
    },
  },
  { _id: true }
);

const VendaSchema = new mongoose.Schema(
  {
    id_cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      default: null,
    },

    data_hora_venda: {
      type: Date,
      default: Date.now,
    },

    // Método de pagamento usado nesta venda
    id_tipo_pagto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TipoPagto",
      required: [true, "Forma de pagamento é obrigatória"],
    },

    // Total calculado e armazenado para evitar recalcular em relatórios
    valor_total_venda: {
      type: Number,
      required: [true, "Valor total é obrigatório"],
      min: [0, "Valor total não pode ser negativo"],
    },

    itens: {
      type: [ItemVendaSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Venda deve ter pelo menos um item",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Índice para relatórios financeiros por período
VendaSchema.index({ data_hora_venda: -1 });

module.exports = mongoose.model("Venda", VendaSchema);
