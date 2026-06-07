// ============================================================
// routes/financeiroRoutes.js
// Financeiro simples/manual do salão.
// Sem checkout, gateway, pagamento online ou PDV avançado.
// ============================================================

const express = require("express");
const router  = express.Router();

const auth = require("../middlewares/auth");
const financeiroAccess = require("../middlewares/financeiro");
const financeiroController = require("../controllers/financeiroController");

router.get("/movimentacoes", auth, financeiroAccess, financeiroController.listarMovimentacoes);
router.post("/movimentacoes", auth, financeiroAccess, financeiroController.criarMovimentacao);

router.post("/caixa/abrir", auth, financeiroAccess, financeiroController.abrirCaixa);
router.post("/caixa/fechar", auth, financeiroAccess, financeiroController.fecharCaixa);
router.get("/caixa", auth, financeiroAccess, financeiroController.caixa);

// Rotas legadas mantidas para compatibilidade: representam venda presencial de balcão.
router.get("/vendas", auth, financeiroAccess, financeiroController.listarVendas);
router.post("/vendas", auth, financeiroAccess, financeiroController.criarVenda);

module.exports = router;
