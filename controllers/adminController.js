// ============================================================
// controllers/adminController.js
// Endpoints JSON do painel administrativo.
//
// A tela EJS principal usa /admin em pageRoutes.js, mas estes
// endpoints ficam disponíveis para consultas AJAX futuras sem
// duplicar regra de negócio: ambos usam biService.
// ============================================================

const Agendamento = require("../models/Agendamento");
const MovimentacaoFinanceira = require("../models/MovimentacaoFinanceira");
const Produto = require("../models/Produto");
const { gerarDashboardSuperAdmin } = require("../services/biService");

module.exports = {
  async dashboard(req, res) {
    try {
      const dashboard = await gerarDashboardSuperAdmin(new Date());
      return res.status(200).json(dashboard);
    } catch (error) {
      console.error("Erro dashboard:", error);
      return res.status(500).json({ erro: "Erro ao carregar dashboard." });
    }
  },

  async estatisticas(req, res) {
    try {
      const dashboard = await gerarDashboardSuperAdmin(new Date());
      return res.status(200).json({
        clientesAtivos: dashboard.clientesAtivos,
        agendamentosMes: dashboard.agendamentosMes,
        agendamentosSemana: dashboard.agendamentosSemana,
        receitaMes: dashboard.receitaMes,
        saidasMes: dashboard.saidasMes,
        saldoMes: dashboard.saldoMes,
        cancelamentosMes: dashboard.cancelamentosMes,
        faltasMes: dashboard.faltasMes,
        servicosMaisRealizados: dashboard.servicosMaisRealizados,
        profissionaisMaisRequisitados: dashboard.profissionaisMaisRequisitados,
      });
    } catch (error) {
      console.error("Erro estatísticas:", error);
      return res.status(500).json({ erro: "Erro ao carregar estatísticas." });
    }
  },

  async financeiro(req, res) {
    try {
      const movimentacoes = await MovimentacaoFinanceira
        .find({ flg_ativo: true })
        .populate("id_cliente", "nome telefone")
        .populate("id_usuario_responsavel", "email permissoes")
        .sort({ data_movimentacao: -1 })
        .limit(100)
        .lean();

      return res.status(200).json(movimentacoes);
    } catch (error) {
      console.error("Erro financeiro:", error);
      return res.status(500).json({ erro: "Erro financeiro." });
    }
  },

  async agendamentos(req, res) {
    try {
      const agendamentos = await Agendamento
        .find()
        .populate("id_cliente", "nome telefone")
        .populate("itens.id_servico", "nome_servico duracao_estimada_min preco_servico")
        .populate("itens.id_profissional", "nome especialidade")
        .sort({ data_hora_inicio: -1 })
        .limit(150)
        .lean();

      return res.status(200).json(agendamentos);
    } catch (error) {
      console.error("Erro admin agendamentos:", error);
      return res.status(500).json({ erro: "Erro ao listar agendamentos." });
    }
  },

  async produtos(req, res) {
    try {
      const produtos = await Produto.find().sort({ descricao: 1 }).lean();
      return res.status(200).json(produtos);
    } catch (error) {
      console.error("Erro admin produtos:", error);
      return res.status(500).json({ erro: "Erro ao listar produtos." });
    }
  },
};
