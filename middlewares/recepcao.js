const { exigirPermissao } = require("./permissao");

// Recepção operacional: Super Admin e Recepção.
// Profissionais possuem agenda própria em /perfil/profissional.
module.exports = exigirPermissao("SUPER_ADMIN", "RECEPCAO");
