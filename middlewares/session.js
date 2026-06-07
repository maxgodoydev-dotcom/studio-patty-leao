const Usuario = require("../models/Usuario");
const { obterPermissoes } = require("./permissao");

module.exports = async function sessionMiddleware(req, res, next) {
  res.locals.usuario = null;

  try {
    const token = req.session?.token_sessao;
    if (!token) return next();

    const usuario = await Usuario
      .findOne({ token_sessao: token, flg_ativo: true })
      .select("+token_sessao")
      .lean();

    if (!usuario) {
      req.session.destroy(() => {});
      return next();
    }

    const permissoes = obterPermissoes(usuario);

    req.usuario = {
      ...usuario,
      permissoes,
    };

    // Não expor CPF, senha ou token nas views.
    res.locals.usuario = {
      _id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      tipo_perfil: usuario.tipo_perfil,
      permissoes,
      flg_ativo: usuario.flg_ativo,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };

    next();
  } catch (error) {
    console.error("Erro middleware session:", error);
    res.locals.usuario = null;
    next();
  }
};
