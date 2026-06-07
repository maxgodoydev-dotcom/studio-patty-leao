const mongoose = require("mongoose");

// ============================================================
// models/Profissional.js
// Representa uma profissional do salão (cabeleireira, etc.).
//
// Ao contrário do Cliente, toda Profissional DEVE ter uma
// conta de acesso — por isso id_usuario é required aqui.
// ============================================================

const ProfissionalSchema = new mongoose.Schema(
  {
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "Profissional deve ter uma conta de usuário vinculada"],
      unique: true, // Uma conta por profissional
    },

    nome: {
      type: String,
      required: [true, "Nome da profissional é obrigatório"],
      trim: true,
      maxlength: [100, "Nome não pode ter mais de 100 caracteres"],
    },

    especialidade: {
      type: String,
      trim: true,
      default: null,
      // Ex: "Coloração", "Corte feminino", "Tratamentos capilares"
    },

    telefone: {
      type: String,
      trim: true,
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

module.exports = mongoose.model("Profissional", ProfissionalSchema);
