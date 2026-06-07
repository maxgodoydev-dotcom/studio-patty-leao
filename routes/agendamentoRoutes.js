// ===============================
// agendamentoRoutes.js
// Responsável por:
// • CRUD de agendamentos
// ===============================

const express = require("express");
const router = express.Router();

const agendamentoController = require("../controllers/agendamentoController");

const auth = require("../middlewares/auth");

// Listar agendamentos
router.get("/", auth, agendamentoController.listar);

// Consultar horários disponíveis
router.get("/disponibilidade", auth, agendamentoController.disponibilidade);

// Buscar agendamento por ID
router.get("/:id", auth, agendamentoController.buscarPorId);

// Criar agendamento
router.post("/", auth, agendamentoController.criar);

// Atualizar agendamento
router.put("/:id", auth, agendamentoController.atualizar);

// Cancelar/deletar agendamento
router.delete("/:id", auth, agendamentoController.deletar);

module.exports = router;