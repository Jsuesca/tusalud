import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔌 Conexión a MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// 📝 Registro
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const userExistente = await User.findOne({ email });
    if (userExistente) return res.status(400).json({ mensaje: "El usuario ya existe" });

    const hash = await bcrypt.hash(password, 10);
    const nuevoUsuario = new User({ nombre, email, password: hash });
    await nuevoUsuario.save();
    res.status(201).json({ mensaje: "Usuario registrado con éxito" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
});

// 🔑 Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(400).json({ mensaje: "Usuario no encontrado" });

    const esValido = await bcrypt.compare(password, usuario.password);
    if (!esValido) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario._id }, "secretito", { expiresIn: "1h" });
    res.json({ mensaje: "Login exitoso", token });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
