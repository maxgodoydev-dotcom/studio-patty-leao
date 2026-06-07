function obterPermissoes(usuario) {
  if (!usuario) return [];

  if (Array.isArray(usuario.permissoes) && usuario.permissoes.length) {
    return usuario.permissoes;
  }

  // Compatibilidade com documentos antigos que ainda usam tipo_perfil.
  if (usuario.tipo_perfil === "ADMIN") return ["SUPER_ADMIN"];
  if (usuario.tipo_perfil === "PROFISSIONAL") return ["PROFISSIONAL"];
  return ["CLIENTE"];
}

function possuiPermissao(usuario, permissoesRequeridas = []) {
  const permissoes = obterPermissoes(usuario);
  return permissoesRequeridas.some((permissao) => permissoes.includes(permissao));
}

function exigirPermissao(...permissoesRequeridas) {
  return function permissaoMiddleware(req, res, next) {
    try {
      if (!req.usuario) {
        if (req.accepts("html")) return res.redirect("/login");
        return res.status(401).json({ erro: "Usuário não autenticado." });
      }

      if (!possuiPermissao(req.usuario, permissoesRequeridas)) {
        if (req.accepts("html")) return res.redirect("/");
        return res.status(403).json({ erro: "Acesso não autorizado para este perfil." });
      }

      return next();
    } catch (error) {
      console.error("Erro middleware permissao:", error);
      return res.status(500).json({ erro: "Erro interno de autorização." });
    }
  };
}

module.exports = {
  obterPermissoes,
  possuiPermissao,
  exigirPermissao,
};
