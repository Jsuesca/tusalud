import crypto from "crypto";
import User from "../models/user.js";

// ========= SOLICITAR RESET ===============
export const resetPasswordRequest = async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if(!user) return res.status(404).json({ mensaje: "Correo no registrado" });

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 1000 * 60 * 30; // 30 min
    await user.save();

    // LINK QUE ABRIRÁ reset-password.html
    res.json({
        mensaje: "Correo enviado (o token generado)",
        recoveryLink: `http://localhost:5500/views/reset-password.html?token=${token}`
    });
};

// ========= CAMBIAR CONTRASEÑA ============
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpire: { $gt: Date.now() }
    });

    if(!user) return res.status(400).json({ mensaje: "Enlace inválido o expirado" });

    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpire = null;
    await user.save();

    res.json({ mensaje: "Contraseña actualizada con éxito ✔" });
};
