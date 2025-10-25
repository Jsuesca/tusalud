import mongoose from "mongoose";

const citaSchema = new mongoose.Schema({
  pacienteNombre: { type: String, required: true },
  pacienteCorreo: { type: String, required: true },
  medicoId: { type: mongoose.Schema.Types.ObjectId, ref: "Medico", required: true },
  fecha: { type: Date, required: true },
  hora: { type: String, required: true },
  motivo: { type: String, required: true },
  estado: { type: String, default: "Pendiente" }
}, { timestamps: true });

export default mongoose.model("Cita", citaSchema);
