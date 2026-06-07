const Agendamento = require("../models/Agendamento");
const {
  calcularJanelaAtendimento,
  buscarConflito,
  STATUS_AGENDAMENTO,
  montarFiltroAgendaPorUsuario,
  usuarioPodeAcessarAgendamento,
  gerarHorariosDisponiveis,
} = require("../services/agendamentoService");
const { possuiPermissao } = require("../middlewares/permissao");
const { baixarInsumosDoAgendamento } = require("../services/estoqueService");

const POPULATES = [
  { path: "id_cliente", select: "nome telefone flg_alergico detalhes_alergia" },
  { path: "itens.id_servico", select: "nome_servico preco_servico duracao_estimada_min" },
  { path: "itens.id_profissional", select: "nome especialidade" },
];

function popularAgendamento(query) {
  return POPULATES.reduce((q, populate) => q.populate(populate), query);
}

module.exports = {
  async listar(req, res) {
    try {
      const filtro = await montarFiltroAgendaPorUsuario(req.usuario);
      const agendamentos = await popularAgendamento(
        Agendamento.find(filtro).sort({ data_hora_inicio: -1 })
      );

      return res.status(200).json(agendamentos);
    } catch (error) {
      console.error("Erro listar agendamentos:", error);
      return res.status(500).json({ erro: "Erro ao listar agendamentos." });
    }
  },

  async buscarPorId(req, res) {
    try {
      const agendamento = await popularAgendamento(Agendamento.findById(req.params.id));

      if (!agendamento) {
        return res.status(404).json({ erro: "Agendamento não encontrado." });
      }

      const podeAcessar = await usuarioPodeAcessarAgendamento(req.usuario, agendamento);
      if (!podeAcessar) {
        return res.status(403).json({ erro: "Você não tem permissão para acessar este agendamento." });
      }

      return res.status(200).json(agendamento);
    } catch (error) {
      console.error("Erro buscar agendamento:", error);
      return res.status(500).json({ erro: "Erro ao buscar agendamento." });
    }
  },

  async criar(req, res) {
    try {
      const { id_cliente, data_hora_inicio, itens } = req.body;

      if (!id_cliente || !data_hora_inicio || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ erro: "Cliente, data/hora e itens são obrigatórios." });
      }

      const { inicio, fim, itensNormalizados } = await calcularJanelaAtendimento(data_hora_inicio, itens);

      const conflito = await buscarConflito({
        inicio,
        fim,
        itens: itensNormalizados,
      });

      if (conflito) {
        return res.status(409).json({
          erro: "Profissional já possui agendamento nesse intervalo. Escolha outro horário ou profissional.",
        });
      }

      const agendamento = await Agendamento.create({
        id_cliente,
        data_hora_inicio: inicio,
        data_hora_fim: fim,
        status_agendamento: "Agendado",
        itens: itensNormalizados,
      });

      return res.status(201).json({ mensagem: "Agendamento criado com sucesso.", agendamento });
    } catch (error) {
      console.error("Erro criar agendamento:", error);
      return res.status(400).json({ erro: error.message || "Erro ao criar agendamento." });
    }
  },

  async atualizar(req, res) {
    try {
      const agendamentoAtual = await Agendamento.findById(req.params.id);
      if (!agendamentoAtual) {
        return res.status(404).json({ erro: "Agendamento não encontrado." });
      }

      const podeAcessar = await usuarioPodeAcessarAgendamento(req.usuario, agendamentoAtual);
      if (!podeAcessar) {
        return res.status(403).json({ erro: "Você não tem permissão para alterar este agendamento." });
      }

      const podeRemarcar = possuiPermissao(req.usuario, ["SUPER_ADMIN", "RECEPCAO"]);
      const podeAtualizarStatus = possuiPermissao(req.usuario, ["SUPER_ADMIN", "RECEPCAO", "PROFISSIONAL"]);
      const dadosPermitidos = {};

      if (req.body.status_agendamento) {
        if (!podeAtualizarStatus) {
          return res.status(403).json({ erro: "Você não pode alterar o status deste agendamento." });
        }

        if (!STATUS_AGENDAMENTO.includes(req.body.status_agendamento)) {
          return res.status(400).json({ erro: "Status de agendamento inválido." });
        }
        dadosPermitidos.status_agendamento = req.body.status_agendamento;
      }

      if (req.body.data_hora_inicio || req.body.itens) {
        if (!podeRemarcar) {
          return res.status(403).json({ erro: "Somente recepção ou Super Admin podem remarcar atendimentos." });
        }

        const { inicio, fim, itensNormalizados } = await calcularJanelaAtendimento(
          req.body.data_hora_inicio || agendamentoAtual.data_hora_inicio,
          req.body.itens || agendamentoAtual.itens
        );

        const conflito = await buscarConflito({
          inicio,
          fim,
          itens: itensNormalizados,
          ignorarAgendamentoId: agendamentoAtual._id,
        });

        if (conflito) {
          return res.status(409).json({ erro: "Existe conflito de agenda para esse intervalo." });
        }

        dadosPermitidos.data_hora_inicio = inicio;
        dadosPermitidos.data_hora_fim = fim;
        dadosPermitidos.itens = itensNormalizados;

        if (!dadosPermitidos.status_agendamento) {
          dadosPermitidos.status_agendamento = "Reagendado";
        }
      }

      if (!Object.keys(dadosPermitidos).length) {
        return res.status(400).json({ erro: "Nenhum campo permitido foi enviado para atualização." });
      }

      const statusAnterior = agendamentoAtual.status_agendamento;

      let agendamento = await Agendamento.findByIdAndUpdate(
        req.params.id,
        dadosPermitidos,
        { new: true, runValidators: true }
      );

      if (dadosPermitidos.status_agendamento === "Concluido" && !agendamento.estoque_baixado) {
        try {
          await baixarInsumosDoAgendamento(agendamento._id, req.usuario?._id);
          agendamento = await Agendamento.findById(agendamento._id);
        } catch (erroEstoque) {
          await Agendamento.findByIdAndUpdate(agendamento._id, { status_agendamento: statusAnterior }, { runValidators: true });
          return res.status(400).json({
            erro: erroEstoque.message || "Não foi possível concluir o atendimento por falta de estoque.",
          });
        }
      }

      return res.status(200).json({ mensagem: "Agendamento atualizado com sucesso.", agendamento });
    } catch (error) {
      console.error("Erro atualizar agendamento:", error);
      return res.status(400).json({ erro: error.message || "Erro ao atualizar agendamento." });
    }
  },

  async deletar(req, res) {
    try {
      const agendamentoAtual = await Agendamento.findById(req.params.id);
      if (!agendamentoAtual) {
        return res.status(404).json({ erro: "Agendamento não encontrado." });
      }

      const podeAcessar = await usuarioPodeAcessarAgendamento(req.usuario, agendamentoAtual);
      if (!podeAcessar) {
        return res.status(403).json({ erro: "Você não tem permissão para cancelar este agendamento." });
      }

      const agendamento = await Agendamento.findByIdAndUpdate(
        req.params.id,
        { status_agendamento: "Cancelado" },
        { new: true, runValidators: true }
      );

      return res.status(200).json({ mensagem: "Agendamento cancelado com sucesso.", agendamento });
    } catch (error) {
      console.error("Erro cancelar agendamento:", error);
      return res.status(500).json({ erro: "Erro ao cancelar agendamento." });
    }
  },

  async disponibilidade(req, res) {
    try {
      const { data, id_servico, id_profissional } = req.query;

      if (!data || !id_servico || !id_profissional) {
        return res.status(400).json({ erro: "Data, serviço e profissional são obrigatórios." });
      }

      const horarios = await gerarHorariosDisponiveis({
        data,
        idServico: id_servico,
        idProfissional: id_profissional,
      });

      return res.status(200).json({ horarios });
    } catch (error) {
      console.error("Erro disponibilidade agendamento:", error);
      return res.status(400).json({ erro: error.message || "Erro ao consultar disponibilidade." });
    }
  },
};
