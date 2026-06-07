const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const PERMISSOES_VALIDAS = [
  "CLIENTE",
  "SUPER_ADMIN",
  "PROFISSIONAL",
  "FINANCEIRO",
  "ESTOQUE",
  "RECEPCAO",
];

const UsuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      trim: true,
      maxlength: [100, "Nome não pode ter mais de 100 caracteres"],
      default: null,
    },

    email: {
      type: String,
      required: [true, "E-mail é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    // CPF deixou de ser obrigatório por decisão de negócio/LGPD.
    // Mantido apenas como dado opcional para uso futuro e protegido nas views/sessões.
    cpf: {
      type: String,
      required: false,
      trim: true,
      default: null,
      match: [/^\d{11}$/, "CPF deve conter 11 dígitos sem pontuação"],
    },

    senha: {
      type: String,
      required: [true, "Senha é obrigatória"],
      select: false,
    },

    permissoes: {
      type: [String],
      enum: {
        values: PERMISSOES_VALIDAS,
        message: "Permissão inválida: {VALUE}",
      },
      default: ["CLIENTE"],
    },

    // Campo legado mantido temporariamente para compatibilidade com views/dados antigos.
    // A regra nova deve usar permissoes[].
    tipo_perfil: {
      type: String,
      enum: ["ADMIN", "CLIENTE", "PROFISSIONAL"],
      default: "CLIENTE",
    },

    flg_ativo: {
      type: Boolean,
      default: true,
    },

    token_sessao: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

// CPF é opcional. O índice único só deve valer quando CPF for string preenchida.
// Importante: se já existir o índice antigo cpf_1 no Atlas, remova-o manualmente uma vez.
UsuarioSchema.index(
  { cpf: 1 },
  {
    unique: true,
    partialFilterExpression: { cpf: { $type: "string" } },
    name: "cpf_unico_quando_preenchido",
  }
);

UsuarioSchema.pre("validate", function (next) {
  if (!Array.isArray(this.permissoes) || this.permissoes.length === 0) {
    this.permissoes = ["CLIENTE"];
  }

  // Mantém o legado tipo_perfil minimamente coerente enquanto o projeto migra.
  if (this.permissoes.includes("SUPER_ADMIN")) this.tipo_perfil = "ADMIN";
  else if (this.permissoes.includes("PROFISSIONAL")) this.tipo_perfil = "PROFISSIONAL";
  else this.tipo_perfil = "CLIENTE";

  if (this.cpf === "") this.cpf = null;
  next();
});

UsuarioSchema.pre("save", async function (next) {
  if (!this.isModified("senha")) return next();

  try {
    this.senha = await bcrypt.hash(this.senha, SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

UsuarioSchema.methods.compararSenha = async function (senhaTextoPlano) {
  return bcrypt.compare(senhaTextoPlano, this.senha);
};

UsuarioSchema.methods.temPermissao = function (...permissoes) {
  return permissoes.some((permissao) => this.permissoes.includes(permissao));
};

UsuarioSchema.statics.PERMISSOES_VALIDAS = PERMISSOES_VALIDAS;

module.exports = mongoose.model("Usuario", UsuarioSchema);
