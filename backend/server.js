import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import User from "./models/user.js";
import Medico from "./models/medico.js";
import Cita from "./models/cita.js"; // 👈 Modelo de citas
import path from "path";
import { fileURLToPath } from "url";

// =============================
// CONFIGURACIÓN INICIAL
// =============================
dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "frontend"))); // Sirve tu carpeta frontend

// =============================
// CONEXIÓN A MONGODB
// =============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error al conectar a MongoDB:", err));

// =============================
// USUARIOS NORMALES
// =============================

// Registro usuario
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) return res.status(400).json({ mensaje: "El usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new User({ nombre, email, password: hashedPassword });
    await nuevoUsuario.save();

    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

// Login usuario
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(400).json({ mensaje: "Usuario no encontrado" });

    const esValido = await bcrypt.compare(password, usuario.password);
    if (!esValido) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario._id }, "secretito", { expiresIn: "1h" });
    res.json({ mensaje: "Login exitoso", token, nombre: usuario.nombre });
  } catch (error) {
    console.error("❌ Error al iniciar sesión:", error);
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});

// =============================
// CHAT IA (OpenRouter)
// =============================
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No se recibió ningún mensaje" });

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";

    const payload = { model, messages: [{ role: "user", content: message }], max_tokens: 400 };
    const headers = {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5000",
      "X-Title": "TuSalud",
    };

    const orResp = await axios.post("https://openrouter.ai/api/v1/chat/completions", payload, { headers });
    const reply = orResp.data?.choices?.[0]?.message?.content || "No se obtuvo respuesta de la IA.";
    res.json({ reply });
  } catch (error) {
    console.error("❌ Error en /api/chat:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error al conectar con OpenRouter" });
  }
});

// =============================
// MÉDICOS
// =============================
const SECRET_KEY = "clave_super_segura";

// Registrar médico
app.post("/api/medicos/register", async (req, res) => {
  try {
    const { nombre, especialidad, foto, experiencia, descripcion, horario, correo, telefono, contraseña } = req.body;
    const medicoExistente = await Medico.findOne({ correo });
    if (medicoExistente) return res.status(400).json({ mensaje: "Ya existe un médico con ese correo" });

    const nuevoMedico = new Medico({ nombre, especialidad, foto, experiencia, descripcion, horario, correo, telefono, contraseña });
    await nuevoMedico.save();

    res.status(201).json({ mensaje: "Médico registrado exitosamente" });
  } catch (error) {
    console.error("❌ Error al registrar médico:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// Login médico
app.post("/api/medicos/login", async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    const medico = await Medico.findOne({ correo });
    if (!medico) return res.status(404).json({ mensaje: "Correo no encontrado" });

    const match = await bcrypt.compare(contraseña, medico.contraseña);
    if (!match) return res.status(400).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign({ id: medico._id }, SECRET_KEY, { expiresIn: "2h" });
    res.json({ mensaje: "Login exitoso", token, medicoId: medico._id });
  } catch (error) {
    console.error("❌ Error al iniciar sesión médico:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// Obtener todos los médicos
app.get("/api/medicos", async (req, res) => {
  try {
    const medicos = await Medico.find().select("-contraseña");
    res.json(medicos);
  } catch (error) {
    console.error("❌ Error al obtener médicos:", error);
    res.status(500).json({ mensaje: "Error al obtener médicos" });
  }
});

// Obtener médico por ID
app.get("/api/medicos/:id", async (req, res) => {
  try {
    const medico = await Medico.findById(req.params.id).select("-contraseña");
    if (!medico) return res.status(404).json({ mensaje: "Médico no encontrado" });
    res.json(medico);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener médico" });
  }
});

// Actualizar perfil médico
app.put("/api/medicos/:id", async (req, res) => {
  try {
    const medico = await Medico.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!medico) return res.status(404).json({ mensaje: "Médico no encontrado" });
    res.json({ mensaje: "Perfil actualizado", medico });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar perfil" });
  }
});

// =============================
// 📅 CITAS
// =============================

// Registrar nueva cita
app.post("/api/citas", async (req, res) => {
  try {
    const { pacienteNombre, pacienteCorreo, medicoId, fecha, hora, motivo } = req.body;

    if (!pacienteNombre || !pacienteCorreo || !medicoId || !fecha || !hora || !motivo) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    const nuevaCita = new Cita({ pacienteNombre, pacienteCorreo, medicoId, fecha, hora, motivo });
    await nuevaCita.save();

    res.status(201).json({ mensaje: "Cita registrada exitosamente" });
  } catch (error) {
    console.error("❌ Error al registrar cita:", error);
    res.status(500).json({ mensaje: "Error al registrar cita" });
  }
});

// Obtener citas por médico
app.get("/api/citas", async (req, res) => {
  try {
    const { medicoId } = req.query;
    if (!medicoId) return res.status(400).json({ mensaje: "Falta el ID del médico" });

    const citas = await Cita.find({ medicoId }).sort({ fecha: 1 });
    res.json(citas);
  } catch (error) {
    console.error("❌ Error al obtener citas:", error);
    res.status(500).json({ mensaje: "Error al obtener citas" });
  }
});

// =============================
// SERVIDOR
// =============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`));
