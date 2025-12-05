import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

import User from "./models/user.js";
import Medico from "./models/medico.js";
import Cita from "./models/cita.js";

import passwordRoutes from "./routes/password.js";
import authRoutes from "./routes/auth.js";

// =============================
// CONFIGURACIÓN INICIAL
// =============================
dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "frontend")));

// 🔹 Routers correctos
app.use("/api/password", passwordRoutes);
app.use("/api", authRoutes);

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
    const { nombre, email, password, telefono, direccion, documento, fechaNacimiento, sexo } = req.body;

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente)
      return res.status(400).json({ mensaje: "El usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = new User({
      nombre,
      email,
      password: hashedPassword,
      telefono,
      direccion,
      documento,
      fechaNacimiento,
      sexo
    });

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
    if (!usuario)
      return res.status(400).json({ mensaje: "Usuario no encontrado" });

    const esValido = await bcrypt.compare(password, usuario.password);
    if (!esValido)
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario._id }, "secretito", { expiresIn: "1h" });
    res.json({ mensaje: "Login exitoso", token, nombre: usuario.nombre });
  } catch (error) {
    console.error("❌ Error al iniciar sesión:", error);
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});

// =============================
// PERFIL DE USUARIO
// =============================
function autenticarUsuario(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ mensaje: "Token no proporcionado" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, "secretito", (err, decoded) => {
    if (err) return res.status(403).json({ mensaje: "Token inválido" });
    req.userId = decoded.id;
    next();
  });
}

// Obtener perfil
app.get("/api/user", autenticarUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ mensaje: "No existe" });
    res.json(user);
  } catch (error) { res.status(500).json({ mensaje: "Error" }); }
});

// Actualizar perfil
app.put("/api/user", autenticarUsuario, async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion, fechaNacimiento, documento, sexo } = req.body;
    const datosActualizados = { nombre, email, telefono, direccion, fechaNacimiento, documento, sexo };

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      datosActualizados.password = hashedPassword;
    }

    const user = await User.findByIdAndUpdate(req.userId, datosActualizados, { new: true }).select("-password");
    if (!user) return res.status(404).json({ mensaje: "No existe" });

    res.json({ mensaje: "Perfil actualizado", user });
  } catch (error) { res.status(500).json({ mensaje: "Error" }); }
});

// Eliminar usuario
app.delete("/api/user", autenticarUsuario, async (req, res) => {
  try { 
    await User.findByIdAndDelete(req.userId); 
    res.json({ mensaje: "Cuenta eliminada" }); 
  }
  catch { res.status(500).json({ mensaje: "Error" }); }
});

// =============================
// CHAT IA - OpenRouter
// =============================
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message" });

    const orResp = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: message }]
    }, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
    });

    res.json({ reply: orResp.data?.choices?.[0]?.message?.content });
  } catch { res.status(500).json({ error: "Error con IA" }); }
});

// =============================
// MÉDICOS
// =============================
const SECRET_KEY = "clave_super_segura";

// Registro médico
app.post("/api/medicos/register", async (req, res) => {
  try {
    const { nombre, especialidad, foto, experiencia, descripcion, horario, correo, telefono, contraseña } = req.body;
    const medicoExistente = await Medico.findOne({ correo });
    if (medicoExistente) return res.status(400).json({ mensaje: "Ya existe" });

    const hashed = await bcrypt.hash(contraseña, 10);
    const nuevoMedico = new Medico({ nombre, especialidad, foto, experiencia, descripcion, horario, correo, telefono, contraseña: hashed });
    await nuevoMedico.save();

    res.status(201).json({ mensaje: "Registrado" });
  } catch { res.status(500).json({ mensaje: "Error" }); }
});

// Login médico
app.post("/api/medicos/login", async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    const medico = await Medico.findOne({ correo });
    if (!medico) return res.status(404).json({ mensaje: "No existe" });

    const match = await bcrypt.compare(contraseña, medico.contraseña);
    if (!match) return res.status(400).json({ mensaje: "Incorrecta" });

    const token = jwt.sign({ id: medico._id }, SECRET_KEY, { expiresIn: "2h" });
    res.json({ mensaje: "Login", token, medicoId: medico._id });
  } catch { res.status(500).json({ mensaje: "Error" }); }
});

// Obtener médico
app.get("/api/medicos/:id", async (req, res) => {
  try {
    const medico = await Medico.findById(req.params.id).select("-contraseña");
    if (!medico) return res.status(404).json({ mensaje: "No existe" });
    res.json(medico);
  } catch { res.status(500).json({ mensaje: "Error" }); }
});

// =============================
// CITAS
// =============================
app.post("/api/citas", async (req, res) => {
  try {
    const { pacienteNombre, pacienteCorreo, medicoId, fecha, hora, motivo } = req.body;
    if (!pacienteNombre || !pacienteCorreo || !medicoId || !fecha || !hora || !motivo)
      return res.status(400).json({ mensaje: "Faltan datos" });

    const nuevaCita = new Cita({ pacienteNombre, pacienteCorreo, medicoId, fecha, hora, motivo });
    await nuevaCita.save();
    res.status(201).json({ mensaje: "Guardada" });
  } catch { res.status(500).json({ mensaje: "Error" }); }
});

app.get("/api/citas", async (req, res) => {
  try {
    const { medicoId } = req.query;
    if (!medicoId) return res.status(400).json({ mensaje: "Falta ID" });

    const citas = await Cita.find({ medicoId });
    res.json(citas);
  } catch { res.status(500).json({ mensaje: "Error" }); }
});

app.delete("/api/citas/:id", async (req, res) => {
  try {
    const citaEliminada = await Cita.findByIdAndDelete(req.params.id);
    if (!citaEliminada) return res.status(404).json({ mensaje: "No existe" });
    res.json({ mensaje: "Eliminada" });
  } catch { res.status(500).json({ mensaje: "Error" }); }
});

// =============================
// SERVIDOR
// =============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`));
