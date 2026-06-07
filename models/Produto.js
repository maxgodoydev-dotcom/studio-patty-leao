const mongoose = require("mongoose");

// ============================================================
// models/Produto.js
// Produtos do salão — insumos usados em serviços e/ou
// itens disponíveis para venda direta no balcão.
//
// As flags flg_insumo e flg_venda podem ser true ao mesmo
// tempo (ex: um shampoo usado no serviço E vendido ao cliente).
// ============================================================

const ProdutoSchema = new mongoose.Schema(
  {
    // Código interno do produto (ex: "SHAM-001")
    sku: {
      type: String,
      unique: true,
      sparse: true, // Permite múltiplos documentos sem SKU (null)
      trim: true,
      uppercase: true,
      default: null,
    },

    descricao: {
      type: String,
      required: [true, "Descrição do produto é obrigatória"],
      trim: true,
      maxlength: [150, "Descrição não pode ter mais de 150 caracteres"],
    },

    custo_unitario: {
      type: Number,
      required: [true, "Custo unitário é obrigatório"],
      min: [0, "Custo não pode ser negativo"],
    },

    preco_venda: {
      type: Number,
      required: [true, "Preço de venda é obrigatório"],
      min: [0, "Preço de venda não pode ser negativo"],
    },

    unidade_medida: {
      type: String,
      default: "un",
      trim: true,
      // Ex: "un", "ml", "g", "kg", "L"
    },

    // Produto consumido durante execução de serviços
    flg_insumo: {
      type: Boolean,
      default: true,
    },

    // Produto disponível para venda direta ao cliente
    flg_venda: {
      type: Boolean,
      default: false,
    },

    // Caminho da imagem para exibição na vitrine digital
    // Ex: "/assets/img/imagemReparador.png"
    imagem_url: {
      type: String,
      trim: true,
      default: null,
    },

    // Texto descritivo para o card da vitrine
    descricao_vitrine: {
      type: String,
      trim: true,
      maxlength: [300, "Descrição da vitrine não pode ter mais de 300 caracteres"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Índice de texto para busca por descrição no módulo de estoque
ProdutoSchema.index({ descricao: "text" });

module.exports = mongoose.model("Produto", ProdutoSchema);