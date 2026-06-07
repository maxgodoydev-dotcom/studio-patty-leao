const express    = require("express");
const router     = express.Router();
const auth       = require("../middlewares/auth");
const admin      = require("../middlewares/admin");
const adminStrict = require("../middlewares/adminStrict");
const vitrineCtrl = require("../controllers/Vitrinecontroller");

// Vitrine pública — qualquer visitante pode ver
router.get("/",                 vitrineCtrl.listarVitrine);

// Reserva — requer login
router.post("/reservar",        auth, vitrineCtrl.criarReserva);

// Histórico da cliente — requer login
router.get("/minhas-reservas",  auth, vitrineCtrl.minhasReservas);

// Painel admin — requer perfil admin
router.get("/admin",            auth, adminStrict, vitrineCtrl.adminReservas);
router.post("/admin/:id/status",auth, adminStrict, vitrineCtrl.atualizarStatusReserva);

module.exports = router;