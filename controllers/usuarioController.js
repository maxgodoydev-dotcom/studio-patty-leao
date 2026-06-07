const Usuario = require("../models/Usuario");
const { possuiPermissao } = require("../middlewares/permissao");

function podeGerenciarUsuario(req, idAlvo) {
  return possuiPermissao(req.usuario, ["SUPER_ADMIN"]) || String(req.usuario._id) === String(idAlvo);
}

function limparDadosUsuario(body, podeAlterarPermissoes = false) {
  const dados = {};

  if (typeof body.email === "string" && body.email.trim()) {
    dados.email = body.email.toLowerCase().trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "cpf")) {
    const cpf = String(body.cpf || "").replace(/\D/g, "");
    dados.cpf = cpf || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "flg_ativo") && podeAlterarPermissoes) {
    dados.flg_ativo = body.flg_ativo === true || body.flg_ativo === "true" || body.flg_ativo === "on";
  }

  if (podeAlterarPermissoes && Array.isArray(body.permissoes)) {
    dados.permissoes = body.permissoes;
  }

  return dados;
}

module.exports = {
  async listar(req, res) {
    try {
      const usuarios = await Usuario.find().select("-cpf");
      return res.status(200).json(usuarios);
    } catch (error) {
      console.error("Erro listar usuários:", error);
      return res.status(500).json({ erro: "Erro ao listar usuários." });
    }
  },

  async buscarPorId(req, res) {
    try {
      if (!podeGerenciarUsuario(req, req.params.id)) {
        return res.status(403).json({ erro: "Você não tem permissão para visualizar este usuário." });
      }

      const select = possuiPermissao(req.usuario, ["SUPER_ADMIN", "FINANCEIRO"]) ? "" : "-cpf";
      const usuario = await Usuario.findById(req.params.id).select(select);

      if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });
      return res.status(200).json(usuario);
    } catch (error) {
      console.error("Erro buscar usuário:", error);
      return res.status(500).json({ erro: "Erro ao buscar usuário." });
    }
  },

  async criar(req, res) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
      }

      const dados = limparDadosUsuario(req.body, true);
      dados.senha = senha;
      dados.permissoes = Array.isArray(req.body.permissoes) && req.body.permissoes.length
        ? req.body.permissoes
        : ["CLIENTE"];

      const usuario = await Usuario.create(dados);
      return res.status(201).json({ mensagem: "Usuário criado com sucesso.", usuario });
    } catch (error) {
      console.error("Erro criar usuário:", error);
      return res.status(500).json({ erro: "Erro ao criar usuário." });
    }
  },

  async atualizar(req, res) {
    try {
      if (!podeGerenciarUsuario(req, req.params.id)) {
        return res.status(403).json({ erro: "Você não tem permissão para editar este usuário." });
      }

      const podeAlterarPermissoes = possuiPermissao(req.usuario, ["SUPER_ADMIN"]);
      const dadosParaAtualizar = limparDadosUsuario(req.body, podeAlterarPermissoes);

      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        dadosParaAtualizar,
        { new: true, runValidators: true }
      );

      if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });
      return res.status(200).json({ mensagem: "Usuário atualizado com sucesso.", usuario });
    } catch (error) {
      console.error("Erro atualizar usuário:", error);
      return res.status(500).json({ erro: "Erro ao atualizar usuário." });
    }
  },

  async deletar(req, res) {
    try {
      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        { flg_ativo: false, token_sessao: null },
        { new: true, runValidators: true }
      );

      if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });
      return res.status(200).json({ mensagem: "Usuário desativado com sucesso." });
    } catch (error) {
      console.error("Erro desativar usuário:", error);
      return res.status(500).json({ erro: "Erro ao desativar usuário." });
    }
  },
};
