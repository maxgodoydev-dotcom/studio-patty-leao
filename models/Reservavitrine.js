const mongoose = require("mongoose");

// ============================================================
// models/ReservaVitrine.js
//
// Registra reservas de produtos da vitrine digital.
// NÃO realiza pagamento — apenas sinaliza ao salão que
// a cliente deseja retirar o produto presencialmente.
//
// Fluxo:
//   Cliente reserva → status "Pendente"
//   Recepção confirma disponibilidade → "Confirmada"
//   Cliente retira no salão → "Retirada"
//   Cancelamento por qualquer parte → "Cancelada"
// ============================================================

const ReservaVitrineSchema = new mongoose.Schema(
  {
    id_cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: [true, "Cliente é obrigatório"],
    },

    id_produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produto",
      required: [true, "Produto é obrigatório"],
    },

    quantidade: {
      type: Number,
      required: [true, "Quantidade é obrigatória"],
      min: [1, "Quantidade mínima é 1"],
      max: [10, "Quantidade máxima por reserva é 10"],
      default: 1,
    },

    observacao: {
      type: String,
      trim: true,
      maxlength: [250, "Observação não pode ter mais de 250 caracteres"],
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ["Pendente", "Confirmada", "Retirada", "Cancelada"],
        message: "Status inválido: {VALUE}",
      },
      default: "Pendente",
    },

    // Data prevista pelo cliente para retirada
    data_retirada_prevista: {
      type: Date,
      default: null,
    },

    // Valor unitário no momento da reserva (congelado para histórico)
    preco_unitario_reserva: {
      type: Number,
      min: [0, "Preço não pode ser negativo"],
      default: 0,
    },

    // Evita baixa duplicada quando a reserva passa para Retirada.
    // Continua sem pagamento online: apenas controla a saída física do produto.
    estoque_baixado: {
      type: Boolean,
      default: false,
    },

    data_baixa_estoque: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = data da reserva
  }
);

// Índice para listar reservas por cliente e status rapidamente
ReservaVitrineSchema.index({ id_cliente: 1, status: 1 });
ReservaVitrineSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ReservaVitrine", ReservaVitrineSchema);