const mongoose = require("mongoose");

// ============================================================
// models/Fornecedor.js
// Fornecedores de insumos e produtos do salão (B2B).
//
// Equivalente à tabela "fornecedor" do schema SQL.
// Referenciado por PedidoCompra para rastrear entradas
// de estoque e histórico de compras.
// ============================================================

const FornecedorSchema = new mongoose.Schema(
  {
    razao_social: {
      type: String,
      required: [true, "Razão social é obrigatória"],
      trim: true,
      maxlength: [100, "Razão social não pode ter mais de 100 caracteres"],
    },

    cnpj: {
      type: String,
      unique: true,
      sparse: true, // Permite múltiplos documentos sem CNPJ (fornecedor pessoa física)
      trim: true,
      // Armazena apenas os 14 dígitos, sem pontuação: "12345678000195"
      match: [/^\d{14}$/, "CNPJ deve conter 14 dígitos sem pontuação"],
      default: null,
    },

    telefone: {
      type: String,
      trim: true,
      default: null,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    cidade: {
      type: String,
      trim: true,
      default: null,
    },

    estado: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [2, "Use a sigla do estado com 2 letras (ex: SP)"],
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

// Índice de texto para busca por nome no painel de compras
FornecedorSchema.index({ razao_social: "text" });

module.exports = mongoose.model("Fornecedor", FornecedorSchema);
