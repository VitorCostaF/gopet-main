// lib/javaApi.js — cliente do gopet-java-api (backend Java separado, ver java-api/)
// O navegador fala direto com esse serviço para criar a reserva (POST /reservas,
// que já dispara a confirmação por WhatsApp). Exige NEXT_PUBLIC_JAVA_API_URL —
// pública porque é chamada do cliente, não do servidor Next.js.

const JAVA_API_URL = process.env.NEXT_PUBLIC_JAVA_API_URL || "http://localhost:8081";

export function javaApiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  return fetch(`${JAVA_API_URL}${path}`, { ...options, headers });
}

/**
 * Busca o access token do Auth0 da sessão atual (via app/api/auth/token/route.js), pra
 * autenticar chamadas ao java-api (ver POST /reservas em app/reservar/[slug]/page.js).
 * Sem Auth0 configurado (modo demo) ou sem sessão válida, devolve null — nesse caso o java-api
 * não exige token (ver java-api SecurityConfig.java).
 */
export async function tokenJavaApi() {
  try {
    const resp = await fetch("/api/auth/token");
    if (!resp.ok) return null;
    const { accessToken } = await resp.json();
    return accessToken;
  } catch {
    return null;
  }
}
