const express = require("express");
const router = express.Router();

const usuarioController = require("../controllers/usuarioController");
const auth = require("../middlewares/auth");
const adminStrict = require("../middlewares/adminStrict");

router.get("/", auth, adminStrict, usuarioController.listar);
router.get("/:id", auth, usuarioController.buscarPorId);
router.post("/", auth, adminStrict, usuarioController.criar);
router.put("/:id", auth, usuarioController.atualizar);
router.delete("/:id", auth, adminStrict, usuarioController.deletar);

module.exports = router;
