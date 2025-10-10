import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    const payload = {
      model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hola OpenRouter, ¿estás disponible?" }]
    };
    const headers = {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    };
    const r = await axios.post("https://openrouter.ai/api/v1/chat/completions", payload, { headers });
    console.log("Respuesta:", r.data?.choices?.[0]?.message?.content ?? r.data);
  } catch (e) {
    console.error("Error test-openrouter:", e?.response?.data ?? e.message ?? e);
  }
}
test();
