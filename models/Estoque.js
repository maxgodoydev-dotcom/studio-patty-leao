const mongoose = require("mongoose");

// ============================================================
// models/Estoque.js
// Saldo atual de cada produto no salão.
//
// Relação 1:1 com Produto — cada produto tem exatamente
// um documento de estoque. O estoqueController é responsável
// por criar este documento junto com o Produto.
//
// quantidade_minima define o threshold de alerta:
// quando quantidade_atual <= quantidade_minima, o painel
// administrativo exibe o aviso de reposição.
// ============================================================

const EstoqueSchema = new mongoose.Schema(
  {
    id_produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produto",
      required: [true, "Produto é obrigatório"],
      unique: true, // Garante a relação 1:1
    },

    quantidade_atual: {
      type: Number,
      default: 0,
      min: [0, "Quantidade não pode ser negativa"],
    },

    quantidade_minima: {
      type: Number,
      default: 0,
      min: [0, "Quantidade mínima não pode ser negativa"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ------------------------------------------------------------
// VIRTUAL: alerta de estoque baixo
// Disponível como estoque.estoque_baixo (true/false).
// Não persiste no banco — calculado na hora da leitura.
//
// Uso na view EJS:
//   <% if (item.estoque_baixo) { %> ⚠️ Repor <% } %>
// ------------------------------------------------------------
EstoqueSchema.virtual("estoque_baixo").get(function () {
  return this.quantidade_atual <= this.quantidade_minima;
});

module.exports = mongoose.model("Estoque", EstoqueSchema);
