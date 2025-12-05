import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const medicoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  especialidad: { type: String, required: true },
  foto: { type: String },
  experiencia: { type: String, required: true },
  descripcion: { type: String, required: true },
  horario: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  telefono: { type: String, required: true },
  contraseña: { type: String, required: true },

  // 🟦 Campos para recuperar contraseña
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpire: {
    type: Date,
    default: null
  }
});

// Antes de guardar, encripta la contraseña
medicoSchema.pre("save", async function (next) {
  if (!this.isModified("contraseña")) return next();
  const salt = await bcrypt.genSalt(10);
  this.contraseña = await bcrypt.hash(this.contraseña, salt);
  next();
});

// Método para comparar contraseñas
medicoSchema.methods.compararContraseña = async function (password) {
  return await bcrypt.compare(password, this.contraseña);
};

export default mongoose.model("Medico", medicoSchema);

