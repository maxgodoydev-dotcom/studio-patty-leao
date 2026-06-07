const mongoose = require("mongoose");

// ============================================================
// models/Agendamento.js
// Representa um atendimento agendado no salão.
//
// DECISÃO DE MODELAGEM — subdocumento vs. collection separada:
// Os itens do agendamento (serviços + profissional + valor)
// são embutidos como subdocumento "itens" em vez de uma
// collection agendamento_itens separada (como no schema SQL).
//
// Motivo: um agendamento e seus itens são sempre lidos e
// escritos juntos — nunca se consulta um item isolado.
// Embutir elimina um JOIN (populate) na rota mais acessada
// do sistema (agenda do dia), o que melhora a performance
// e simplifica o código do controller.
// ============================================================

// Sub-schema para cada serviço dentro do agendamento
const ItemAgendamentoSchema = new mongoose.Schema(
  {
    id_servico: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Servico",
      required: [true, "Serviço é obrigatório"],
    },

    id_profissional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profissional",
      required: [true, "Profissional é obrigatória"],
    },

    // Valor efetivamente cobrado — pode diferir do preco_servico
    // (desconto, promoção, cortesia)
    valor_cobrado: {
      type: Number,
      required: [true, "Valor cobrado é obrigatório"],
      min: [0, "Valor cobrado não pode ser negativo"],
    },
  },
  { _id: true }
);

const AgendamentoSchema = new mongoose.Schema(
  {
    id_cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: [true, "Cliente é obrigatório"],
    },

    data_hora_inicio: {
      type: Date,
      required: [true, "Data e hora de início são obrigatórias"],
    },

    data_hora_fim: {
      type: Date,
      required: [true, "Data e hora de término são obrigatórias"],
    },

    status_agendamento: {
      type: String,
      enum: {
        values: ["Agendado", "Confirmado", "Em Atendimento", "Concluido", "Cancelado", "Faltou", "Reagendado"],
        message: "Status inválido: {VALUE}",
      },
      default: "Agendado",
    },

    // Serviços incluídos neste atendimento
    itens: {
      type: [ItemAgendamentoSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Agendamento deve ter pelo menos um serviço",
      },
    },

    // Controle para impedir baixa duplicada de insumos quando
    // um atendimento já foi marcado como Concluido anteriormente.
    estoque_baixado: {
      type: Boolean,
      default: false,
    },

    data_baixa_estoque: {
      type: Date,
      default: null,
    },

    movimentacoes_estoque: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "MovimentacaoEstoque",
    }],
  },
  {
    timestamps: true,
  }
);

// Índices para as consultas mais comuns
AgendamentoSchema.index({ data_hora_inicio: 1, data_hora_fim: 1 }); // agenda do dia e conflitos
AgendamentoSchema.index({ id_cliente: 1 });                  // histórico do cliente
AgendamentoSchema.index({ "itens.id_profissional": 1, data_hora_inicio: 1, data_hora_fim: 1 }); // agenda por profissional

module.exports = mongoose.model("Agendamento", AgendamentoSchema);
