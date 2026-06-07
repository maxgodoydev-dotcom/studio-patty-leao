const Usuario = require("../models/Usuario");

module.exports = async function auth(req, res, next) {
  try {
    // Se o sessionMiddleware já carregou o usuário, reutiliza
    if (req.usuario) {
      return next();
    }

    const token = req.session?.token_sessao;

    if (!token) {
      if (req.accepts("html")) return res.redirect("/login");
      return res.status(401).json({ erro: "Acesso negado. Faça login." });
    }

    const usuario = await Usuario
      .findOne({ token_sessao: token, flg_ativo: true })
      .select("+token_sessao");

    if (!usuario) {
      req.session.destroy(() => {});
      if (req.accepts("html")) return res.redirect("/login");
      return res.status(401).json({ erro: "Sessão inválida ou expirada." });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error("Erro middleware auth:", error);
    return res.status(500).json({ erro: "Erro interno na autenticação." });
  }
};
