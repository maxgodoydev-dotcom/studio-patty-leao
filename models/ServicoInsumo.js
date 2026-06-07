const mongoose = require("mongoose");

// ============================================================
// models/ServicoInsumo.js
// Liga cada serviço aos produtos (insumos) que ele consome.
//
// Equivalente à tabela "servicos_itens" do schema SQL.
//
// DECISÃO DE MODELAGEM — collection separada vs. subdocumento:
// Diferente de Agendamento e Venda (onde itens são embutidos),
// aqui usamos collection separada porque:
//   a) A relação serviço ↔ insumo é consultada isoladamente
//      (ex: "quais produtos preciso para a progressiva?")
//   b) Facilita atualizações: adicionar/remover um insumo
//      de um serviço sem reescrever todo o documento.
//   c) Um mesmo produto pode ser insumo de vários serviços
//      (consulta inversa: "em quais serviços uso este produto?")
//
// Uso pelo estoqueController:
//   Ao finalizar um atendimento, busca todos os ServicoInsumo
//   do serviço prestado e desconta do Estoque automaticamente.
// ============================================================

const ServicoInsumoSchema = new mongoose.Schema(
  {
    id_servico: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Servico",
      required: [true, "Serviço é obrigatório"],
    },

    id_produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produto",
      required: [true, "Produto (insumo) é obrigatório"],
    },

    // Quantidade do produto consumida por execução do serviço
    // Ex: progressiva consome 200ml de queratina (0.200 L)
    qtde_utilizada: {
      type: Number,
      required: [true, "Quantidade utilizada é obrigatória"],
      min: [0.001, "Quantidade deve ser maior que zero"],
    },
  },
  {
    timestamps: true,
  }
);

// Garante que o mesmo produto não seja adicionado duas vezes ao mesmo serviço
ServicoInsumoSchema.index(
  { id_servico: 1, id_produto: 1 },
  { unique: true }
);

// Índice para a consulta inversa: "em quais serviços uso este produto?"
ServicoInsumoSchema.index({ id_produto: 1 });

module.exports = mongoose.model("ServicoInsumo", ServicoInsumoSchema);
