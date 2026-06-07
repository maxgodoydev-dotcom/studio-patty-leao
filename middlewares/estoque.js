const { exigirPermissao } = require("./permissao");
module.exports = exigirPermissao("SUPER_ADMIN", "ESTOQUE");
