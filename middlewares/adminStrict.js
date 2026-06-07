const { exigirPermissao } = require("./permissao");

// Rotas realmente sensíveis: apenas Super Admin.
module.exports = exigirPermissao("SUPER_ADMIN");
