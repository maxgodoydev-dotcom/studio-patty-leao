const mongoose = require("mongoose");

async function conectarBanco() {
  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI não definida. Configure o arquivo .env ou as variáveis de ambiente no Render."
    );
  }

  // Já conectado — reutiliza a conexão
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "studio_patty_leao",
      serverSelectionTimeoutMS: 30000,
      ssl: true,
    });

    console.log(
      `MongoDB conectado — banco: ${mongoose.connection.db.databaseName}`
    );

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB desconectado. Tentando reconectar...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconectado.");
    });

    return mongoose.connection;
  } catch (error) {
    console.error("Falha ao conectar ao MongoDB:", error.message);
    throw error; // deixa o caller (app.js) decidir se encerra
  }
}

module.exports = conectarBanco;
