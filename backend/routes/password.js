import express from "express";
import User from "../models/user.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const router = express.Router();

// =============================
// 🔹 1. Solicitar recuperación
// =============================
router.post("/reset-password-request", async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
        return res.status(404).json({ mensaje: "❌ El correo no existe" });

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutos
    await user.save();

    const recoveryLink = `http://localhost:5500/frontend/paginas/reset-password.html?token=${token}`;

    return res.json({
        mensaje: "📧 Link de recuperación generado",
        recoveryLink
    });
});


// =============================
// 🔹 2. Guardar nueva contraseña
// =============================
router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpire: { $gt: Date.now() }
    });

    if (!user)
        return res.status(400).json({ mensaje: "❌ El token expiró o no es válido" });

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpire = null;

    await user.save();

    return res.json({ mensaje: "🔐 Contraseña actualizada con éxito" });
});


export default router;
