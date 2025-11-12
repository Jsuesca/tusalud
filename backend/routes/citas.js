import express from "express";
import Cita from "../models/cita.js";

const router = express.Router();

// ✅ Crear nueva cita
router.post("/", async (req, res) => {
  try {
    const nuevaCita = new Cita(req.body);
    await nuevaCita.save();
    res.status(201).json(nuevaCita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ Obtener citas por médico
router.get("/medico/:id", async (req, res) => {
  try {
    const citas = await Cita.find({ medicoId: req.params.id });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Eliminar cita por ID
router.delete("/:id", async (req, res) => {
  try {
    const cita = await Cita.findByIdAndDelete(req.params.id);
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    res.json({ mensaje: "Cita eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
