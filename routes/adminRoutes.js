// ===============================
// adminRoutes.js
// Responsável por:
// • painel administrativo
// • estatísticas
// • gerenciamento interno
// ===============================

const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

// Dashboard principal
router.get("/dashboard", auth, admin, adminController.dashboard);

// Estatísticas gerais
router.get("/estatisticas", auth, admin, adminController.estatisticas);

// Relatórios financeiros
router.get("/financeiro", auth, admin, adminController.financeiro);

// Relatórios de agendamentos
router.get("/agendamentos", auth, admin, adminController.agendamentos);

module.exports = router;