const { exigirPermissao } = require("./permissao");

// BI Central e painel administrativo geral: apenas Super Admin.
module.exports = exigirPermissao("SUPER_ADMIN");
