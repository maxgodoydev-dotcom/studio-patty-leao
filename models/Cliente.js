const mongoose = require("mongoose");

// ============================================================
// models/Cliente.js
// Dados operacionais do cliente do salão.
//
// id_usuario é opcional: permite atendimento de balcão para
// clientes sem cadastro de login — o recepcionista registra
// só nome e telefone. Quando o cliente cria uma conta, o
// authController vincula o Usuario criado a este documento.
// ============================================================

const ClienteSchema = new mongoose.Schema(
  {
    // Referência ao login — nulo para clientes sem conta
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },

    nome: {
      type: String,
      required: [true, "Nome do cliente é obrigatório"],
      trim: true,
      maxlength: [100, "Nome não pode ter mais de 100 caracteres"],
    },

    telefone: {
      type: String,
      trim: true,
      default: null,
    },

    // Controle de segurança para serviços químicos (progressiva, tintura, etc.)
    flg_alergico: {
      type: Boolean,
      default: false,
    },

    detalhes_alergia: {
      type: String,
      default: null,
      // Obrigatório apenas se flg_alergico for true — validado no controller
    },
  },
  {
    timestamps: true,
  }
);

// Índice para busca rápida por nome na recepção
ClienteSchema.index({ nome: "text" });

module.exports = mongoose.model("Cliente", ClienteSchema);
