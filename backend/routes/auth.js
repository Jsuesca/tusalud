import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user.js";

const router = express.Router();

// =========================
// 📩 1️⃣ Solicitar enlace de recuperación
// =========================
router.post("/reset-password-request", async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ mensaje: "Correo no encontrado" });

    // Generar token y expiración
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpire = Date.now() + (30 * 60 * 1000); // 30 min
    await user.save();

    // Link que abrirá reset-password.html
    const link = `http://localhost:5500/frontend/paginas/reset-password.html?token=${token}`;

    res.json({
        mensaje: "Enlace de recuperación generado",
        recoveryLink: link
    });
});

// =========================
// 🔐 2️⃣ Guardar nueva contraseña
// =========================
router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ mensaje: "❌ Enlace inválido o expirado" });

    // Hashear contraseña nueva
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpire = null;
    await user.save();

    res.json({ mensaje: "✔ Contraseña actualizada con éxito" });
});

export default router;
