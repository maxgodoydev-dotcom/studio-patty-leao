const mongoose = require("mongoose");

// ============================================================
// models/TipoPagto.js
// Métodos de pagamento aceitos pelo salão.
//
// Populado via seed na inicialização do banco:
// Dinheiro, Pix, Débito, Crédito à vista, Crédito parcelado.
//
// taxa_operadora é usada pelo financeiroController para
// calcular o valor líquido recebido em relatórios.
// ============================================================

const TipoPagtoSchema = new mongoose.Schema(
  {
    nome_metodo: {
      type: String,
      required: [true, "Nome do método é obrigatório"],
      unique: true,
      trim: true,
      maxlength: [50, "Nome não pode ter mais de 50 caracteres"],
    },

    // Percentual cobrado pela operadora (ex: 2.99 para 2,99%)
    taxa_operadora: {
      type: Number,
      default: 0,
      min: [0, "Taxa não pode ser negativa"],
      max: [100, "Taxa não pode ser maior que 100%"],
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

module.exports = mongoose.model("TipoPagto", TipoPagtoSchema);
