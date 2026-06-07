const mongoose = require("mongoose");

// ============================================================
// models/Servico.js
// Catálogo de serviços oferecidos pelo salão.
//
// duracao_estimada_min é usado pelo agendamentoController
// para calcular automaticamente o horário de término e
// evitar conflitos de agenda para a mesma profissional.
// ============================================================

const ServicoSchema = new mongoose.Schema(
  {
    nome_servico: {
      type: String,
      required: [true, "Nome do serviço é obrigatório"],
      trim: true,
      maxlength: [100, "Nome não pode ter mais de 100 caracteres"],
    },

    descricao_servico: {
      type: String,
      default: null,
    },

    preco_servico: {
      type: Number,
      required: [true, "Preço do serviço é obrigatório"],
      min: [0, "Preço não pode ser negativo"],
    },

    // Duração usada para bloquear a agenda da profissional
    duracao_estimada_min: {
      type: Number,
      required: [true, "Duração estimada é obrigatória"],
      min: [5, "Duração mínima é de 5 minutos"],
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

module.exports = mongoose.model("Servico", ServicoSchema);
