// ===============================
// estoqueRoutes.js
// Responsável por:
// • CRUD de produtos
// • movimentação de estoque
// ===============================

const express = require("express");
const router = express.Router();

const estoqueController = require("../controllers/estoqueController");

const auth = require("../middlewares/auth");
const estoqueAccess = require("../middlewares/estoque");

// Listar produtos
router.get("/", auth, estoqueController.listar);

// Listar histórico de movimentações
router.get("/movimentacoes/recentes", auth, estoqueAccess, estoqueController.listarMovimentacoes);

// Buscar produto por ID
router.get("/:id", auth, estoqueController.buscarPorId);

// Criar produto
router.post("/", auth, estoqueAccess, estoqueController.criar);

// Atualizar produto
router.put("/:id", auth, estoqueAccess, estoqueController.atualizar);

// Remover produto
router.delete("/:id", auth, estoqueAccess, estoqueController.deletar);

// Entrada de estoque
router.post("/:id/entrada", auth, estoqueAccess, estoqueController.entradaEstoque);

// Saída de estoque
router.post("/:id/saida", auth, estoqueAccess, estoqueController.saidaEstoque);

module.exports = router;