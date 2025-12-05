import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  telefono: {
    type: String,
    default: "",
  },
  direccion: {
    type: String,
    default: "",
  },
  fechaNacimiento: {
    type: Date,
    default: null,
  },
  documento: {
    type: String,
    default: "",
  },
  sexo: {
    type: String,
    enum: ["Masculino", "Femenino", "Otro"],
    default: "Otro",
  },

  // recuperación de contraseña
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpire: {
    type: Date,
    default: null
  }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
