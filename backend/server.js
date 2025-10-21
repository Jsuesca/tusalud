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

dotenv.config();
const app = express();

/* Habilitar CORS (importante para Live Server */
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

/* Conexión a MongoDB Atlas */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error al conectar a MongoDB:", err));


/* ==========================
   USUARIOS NORMALES
========================== */

/* Registro */
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new User({ nombre, email, password: hashedPassword });
    await nuevoUsuario.save();

    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

/* Login */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(400).json({ mensaje: "Usuario no encontrado" });

    const esValido = await bcrypt.compare(password, usuario.password);
    if (!esValido) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario._id }, "secretito", { expiresIn: "1h" });
    res.json({
      mensaje: "Login exitoso",
      token,
      nombre: usuario.nombre
    });

  } catch (error) {
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});


/* CHAT CON IA (OpenRouter) */
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No se recibió ningún mensaje" });

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_KEY) {
      console.error("❌ OPENROUTER_API_KEY no configurada en .env");
      return res.status(500).json({ error: "Falta la API key de OpenRouter" });
    }

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";

    const payload = {
      model,
      messages: [{ role: "user", content: message }],
      max_tokens: 400,
    };

    const headers = {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5000",
      "X-Title": "TuSalud",
    };

    const orResp = await axios.post("https://openrouter.ai/api/v1/chat/completions", payload, { headers });

    const reply =
      orResp.data?.choices?.[0]?.message?.content ??
      orResp.data?.choices?.[0]?.text ??
      "No se obtuvo respuesta de la IA.";

    console.log("✅ Respuesta IA:", reply);
    res.json({ reply });

  } catch (error) {
    console.error("❌ Error en /api/chat:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Error al conectar con OpenRouter",
      details: error?.response?.data || error.message,
    });
  }
});

/* Middleware para verificar el token JWT */
function verificarToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ mensaje: "Acceso denegado. Token faltante." });

  try {
    const verificado = jwt.verify(token, "secretito");
    req.user = verificado;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: "Token inválido o expirado." });
  }
}

/* Obtener datos del usuario autenticado */
app.get("/api/user", verificarToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id).select("-password");
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener los datos del usuario" });
  }
});

/* Actualizar perfil */
app.put("/api/user", verificarToken, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const updates = {};

    if (nombre) updates.nombre = nombre;
    if (email) updates.email = email;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const usuarioActualizado = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.json({ mensaje: "Perfil actualizado con éxito", usuario: usuarioActualizado });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar el perfil" });
  }
});

/* Eliminar cuenta */
app.delete("/api/user", verificarToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ mensaje: "Cuenta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar la cuenta" });
  }
});


/* ==========================
   RUTAS PARA MÉDICOS
========================== */
const SECRET_KEY = "clave_super_segura";

/* Registrar médico */
app.post("/api/medicos/register", async (req, res) => {
  try {
    const { nombre, especialidad, foto, experiencia, descripcion, horario, correo, telefono, contraseña } = req.body;

    const medicoExistente = await Medico.findOne({ correo });
    if (medicoExistente)
      return res.status(400).json({ mensaje: "Ya existe un médico con ese correo" });

    // ❌ Quita el doble hash — el modelo ya lo hace
    const nuevoMedico = new Medico({
      nombre,
      especialidad,
      foto,
      experiencia,
      descripcion,
      horario,
      correo,
      telefono,
      contraseña, // aquí la contraseña va sin hash
    });

    await nuevoMedico.save();
    res.status(201).json({ mensaje: "Médico registrado exitosamente" });
  } catch (error) {
    console.error("Error al registrar médico:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});


/* Login médico */
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
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

/* Obtener perfil médico por ID */
app.get("/api/medicos/perfil/:id", async (req, res) => {
  try {
    const medico = await Medico.findById(req.params.id);
    if (!medico) return res.status(404).json({ mensaje: "Médico no encontrado" });
    res.json(medico);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener perfil" });
  }
});

/* Actualizar perfil médico */
app.put("/api/medicos/:id", async (req, res) => {
  try {
    const medico = await Medico.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!medico) return res.status(404).json({ mensaje: "Médico no encontrado" });
    res.json({ mensaje: "Perfil actualizado", medico });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar perfil" });
  }
});

/* Obtener todos los médicos */
app.get("/api/medicos", async (req, res) => {
  try {
    const medicos = await Medico.find();
    res.json(medicos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener médicos" });
  }
});

/* Obtener un médico por ID */
app.get("/api/medicos/:id", async (req, res) => {
  try {
    const medico = await Medico.findById(req.params.id);
    if (!medico) return res.status(404).json({ mensaje: "Médico no encontrado" });
    res.json(medico);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener el médico" });
  }
});

/* ==========================
   SERVIDOR
========================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`));
