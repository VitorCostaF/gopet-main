// lib/javaApi.js — cliente do gopet-java-api (backend Java separado, ver java-api/)
// O navegador fala direto com esse serviço para criar a reserva (POST /reservas,
// que já dispara a confirmação por WhatsApp). Exige NEXT_PUBLIC_JAVA_API_URL —
// pública porque é chamada do cliente, não do servidor Next.js.

const JAVA_API_URL = process.env.NEXT_PUBLIC_JAVA_API_URL || "http://localhost:8081";

export function javaApiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  return fetch(`${JAVA_API_URL}${path}`, { ...options, headers });
}
