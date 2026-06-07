require("dotenv").config();

const express = require("express");
const path    = require("path");
const session = require("express-session");
const helmet  = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

const conectarBanco = require("./config/database");

const authRoutes        = require("./routes/authRoutes");
const usuarioRoutes     = require("./routes/usuarioRoutes");
const agendamentoRoutes = require("./routes/agendamentoRoutes");
const estoqueRoutes     = require("./routes/estoqueRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const financeiroRoutes  = require("./routes/financeiroRoutes");
const pageRoutes        = require("./routes/pageRoutes");
const vitrineRoutes     = require("./routes/Vitrineroutes");

const app = express();

// Necessário para o Render (proxy reverso) — sem isso cookies secure falham
app.set("trust proxy", 1);

// VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// MIDDLEWARES GLOBAIS
// Helmet fica com CSP desativado para preservar CDNs já usados nas views
// (Bootstrap, FontAwesome e Chart.js) sem quebrar o visual no Render.
app.use(helmet({ contentSecurityPolicy: false }));
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Proteção básica contra operadores MongoDB injetados via body/query/params.
app.use(mongoSanitize());

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET precisa estar configurado no Render em produção.");
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "studio-patty-leao-dev-local",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure:   process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge:   1000 * 60 * 60 * 24, // 24 horas
      sameSite: "lax",
    },
  })
);

const sessionMiddleware = require("./middlewares/session");
app.use(sessionMiddleware);

app.use("/assets", express.static(path.join(__dirname, "assets")));

// CONEXÃO COM O BANCO
conectarBanco().catch((err) => {
  console.error("Falha crítica na conexão com o banco:", err.message);
  process.exit(1);
});

// ROTAS
app.use("/",             pageRoutes);
app.use("/auth",         authRoutes);
app.use("/usuarios",     usuarioRoutes);
app.use("/agendamentos", agendamentoRoutes);
app.use("/estoque",      estoqueRoutes);
app.use("/admin",        adminRoutes);
app.use("/financeiro",   financeiroRoutes);
app.use("/vitrine",      vitrineRoutes);

// 404
app.use((req, res) => {
  res.status(404).render("404", { usuario: res.locals.usuario || null }, (err) => {
    if (err) return res.status(404).json({ erro: "Página não encontrada." });
  });
});

// ERRO GLOBAL
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).render("404", { usuario: res.locals.usuario || null }, (renderErr) => {
    if (renderErr) return res.status(500).json({ erro: "Erro interno do servidor." });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT} | NODE_ENV=${process.env.NODE_ENV || "development"}`);
});
