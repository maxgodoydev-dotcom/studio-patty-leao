const mongoose = require("mongoose");

// ============================================================
// models/PedidoCompra.js
// Pedidos de compra de insumos e produtos (B2B).
//
// Equivalente às tabelas "pedido_compra" + "pedido_compra_itens"
// do schema SQL. Os itens são embutidos como subdocumento
// (mesmo padrão de Agendamento e Venda) porque um pedido
// e seus itens são sempre lidos e escritos juntos.
//
// Fluxo:
//   1. Admin cria pedido com status "Pendente"
//   2. Fornecedor entrega → admin muda para "Recebido"
//      → estoqueController incrementa quantidade_atual
//   3. Se cancelado → status "Cancelado" (sem mexer no estoque)
// ============================================================

// Sub-schema para cada item do pedido
const ItemPedidoSchema = new mongoose.Schema(
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

    // Custo no momento do pedido — histórico de preços de compra
    custo_unitario: {
      type: Number,
      required: [true, "Custo unitário é obrigatório"],
      min: [0, "Custo não pode ser negativo"],
    },
  },
  { _id: true }
);

const PedidoCompraSchema = new mongoose.Schema(
  {
    id_fornecedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fornecedor",
      required: [true, "Fornecedor é obrigatório"],
    },

    status_pedido: {
      type: String,
      enum: {
        values: ["Pendente", "Recebido", "Cancelado"],
        message: "Status inválido: {VALUE}",
      },
      default: "Pendente",
    },

    // Calculado no controller ao salvar ou atualizar itens
    valor_total_pedido: {
      type: Number,
      default: 0,
      min: [0, "Valor total não pode ser negativo"],
    },

    // Quem registrou o pedido (auditoria)
    registrado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },

    // Data prevista de entrega (opcional, para alertas)
    data_entrega_prevista: {
      type: Date,
      default: null,
    },

    observacoes: {
      type: String,
      default: null,
    },

    itens: {
      type: [ItemPedidoSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Pedido deve ter pelo menos um item",
      },
    },
  },
  {
    timestamps: true, // createdAt = data do pedido
  }
);

// Índices para relatórios de compras
PedidoCompraSchema.index({ createdAt: -1 });
PedidoCompraSchema.index({ id_fornecedor: 1 });
PedidoCompraSchema.index({ status_pedido: 1 });

module.exports = mongoose.model("PedidoCompra", PedidoCompraSchema);
