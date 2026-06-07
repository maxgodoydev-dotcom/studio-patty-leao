const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const crypto = require("crypto");
const Usuario = require("../models/Usuario");
const Cliente = require("../models/Cliente");
const auth = require("../middlewares/auth");
const { obterPermissoes } = require("../middlewares/permissao");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  handler: (req, res) => res.status(429).render("login", {
    usuario: null,
    erro: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  }),
});

function validarCPF(cpf) {
  const limpo = String(cpf || "").replace(/\D/g, "");
  if (!limpo) return true; // CPF é opcional.
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(limpo[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(limpo[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[10])) return false;

  return true;
}

function destinoAposLogin(usuario) {
  const permissoes = obterPermissoes(usuario);

  // Cada setor entra direto no painel que faz sentido para sua rotina.
  // Apenas SUPER_ADMIN acessa o BI Central completo.
  if (permissoes.includes("SUPER_ADMIN")) return "/admin";
  if (permissoes.includes("RECEPCAO")) return "/recepcao";
  if (permissoes.includes("PROFISSIONAL")) return "/perfil/profissional";
  if (permissoes.includes("FINANCEIRO")) return "/financeiro";
  if (permissoes.includes("ESTOQUE")) return "/estoque";
  return "/";
}

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.render("login", { usuario: null, erro: "Preencha e-mail e senha." });
    }

    const usuario = await Usuario
      .findOne({ email: email.toLowerCase().trim() })
      .select("+senha +token_sessao");

    if (!usuario || !usuario.flg_ativo) {
      return res.render("login", { usuario: null, erro: "E-mail ou senha inválidos." });
    }

    const senhaCorreta = await usuario.compararSenha(senha);
    if (!senhaCorreta) {
      return res.render("login", { usuario: null, erro: "E-mail ou senha inválidos." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    usuario.token_sessao = token;
    await usuario.save();

    req.session.regenerate((err) => {
      if (err) console.error("Erro ao regenerar sessão:", err);
      req.session.token_sessao = token;
      req.session.save(() => res.redirect(destinoAposLogin(usuario)));
    });
  } catch (e) {
    console.error("Erro login:", e);
    res.render("login", { usuario: null, erro: "Erro interno. Tente novamente." });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, cpf, senha, confirmarSenha, nome, telefone, flgAlergico, detalhesAlergia } = req.body;

    if (!email || !senha || !nome) {
      return res.render("cadastro", { usuario: null, erro: "Preencha nome, e-mail e senha." });
    }

    if (senha !== confirmarSenha) {
      return res.render("cadastro", { usuario: null, erro: "As senhas não coincidem." });
    }

    if (senha.length < 6) {
      return res.render("cadastro", { usuario: null, erro: "A senha deve ter no mínimo 6 caracteres." });
    }

    const cpfLimpo = cpf ? cpf.replace(/\D/g, "") : null;

    if (cpfLimpo && !validarCPF(cpfLimpo)) {
      return res.render("cadastro", { usuario: null, erro: "CPF inválido. Verifique os dígitos informados ou deixe em branco." });
    }

    const filtrosDuplicidade = [{ email: email.toLowerCase().trim() }];
    if (cpfLimpo) filtrosDuplicidade.push({ cpf: cpfLimpo });

    const existe = await Usuario.findOne({ $or: filtrosDuplicidade });
    if (existe) {
      return res.render("cadastro", { usuario: null, erro: "E-mail ou CPF já cadastrado." });
    }

    let novoUsuario = null;
    try {
      novoUsuario = await Usuario.create({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        cpf: cpfLimpo || null,
        senha,
        permissoes: ["CLIENTE"],
      });

      await Cliente.create({
        id_usuario: novoUsuario._id,
        nome: nome.trim(),
        telefone: telefone?.trim() || null,
        flg_alergico: flgAlergico === "on",
        detalhes_alergia: flgAlergico === "on" ? (detalhesAlergia?.trim() || null) : null,
      });
    } catch (createErr) {
      if (novoUsuario?._id) await Usuario.findByIdAndDelete(novoUsuario._id).catch(() => {});
      throw createErr;
    }

    res.redirect("/login");
  } catch (e) {
    console.error("Erro register:", e);
    res.render("cadastro", { usuario: null, erro: "Erro ao cadastrar. Verifique os dados e tente novamente." });
  }
});

router.post("/logout", auth, async (req, res) => {
  try {
    if (req.usuario) {
      const u = await Usuario.findById(req.usuario._id).select("+token_sessao");
      if (u) {
        u.token_sessao = null;
        await u.save();
      }
    }
  } catch (e) {
    console.error("Erro ao limpar token no logout:", e);
  }

  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
