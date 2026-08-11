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

// ── Cadastro, pets e reservas — endpoints autenticados do java-api ──────────────────────────
// Com Auth0 configurado, o header Authorization (token) já basta pro java-api identificar o
// tutor (ver SecurityConfig/*Controller lá). Sem Auth0 (modo demo), não há token — mandamos
// tutor_id (user.id da sessão demo) como fallback via query/corpo, mesma convenção do POST
// /reservas em app/reservar/[slug]/page.js.
async function headersAutenticados() {
  const token = await tokenJavaApi();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function erroDaResposta(resp, mensagemPadrao) {
  let data = null;
  try { data = await resp.json(); } catch { /* corpo vazio/não-JSON */ }
  return new Error(data?.error?.message || mensagemPadrao);
}

/** @returns o cadastro do tutor, ou null se ele ainda não cadastrou (404 USUARIO_NAO_CADASTRADO). */
export async function buscarUsuario(tutorId) {
  const headers = await headersAutenticados();
  const qs = headers.Authorization ? "" : `?tutor_id=${encodeURIComponent(tutorId || "")}`;
  const resp = await javaApiFetch(`/usuarios/me${qs}`, { headers });
  if (resp.status === 404) return null;
  if (!resp.ok) throw await erroDaResposta(resp, "Não conseguimos carregar seu cadastro.");
  return (await resp.json()).usuario;
}

/** @param usuario { nome, email, endereco: { cep, numero, instrucoes } } */
export async function salvarUsuario(usuario, tutorId) {
  const headers = await headersAutenticados();
  const resp = await javaApiFetch("/usuarios/me", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...usuario, tutor_id: tutorId }),
  });
  if (!resp.ok) throw await erroDaResposta(resp, "Não conseguimos salvar seu cadastro.");
  return (await resp.json()).usuario;
}

export async function listarPets(tutorId) {
  const headers = await headersAutenticados();
  const qs = headers.Authorization ? "" : `?tutor_id=${encodeURIComponent(tutorId || "")}`;
  const resp = await javaApiFetch(`/pets${qs}`, { headers });
  if (!resp.ok) throw await erroDaResposta(resp, "Não conseguimos carregar seus pets.");
  return (await resp.json()).pets;
}

/** @param pet { nome, idade_anos, porte, peso_kg, reativo, agressivo_pessoas, vacinas_em_dia, problema_saude, observacoes } */
export async function criarPet(pet, tutorId) {
  const headers = await headersAutenticados();
  const resp = await javaApiFetch("/pets", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...pet, tutor_id: tutorId }),
  });
  if (!resp.ok) throw await erroDaResposta(resp, "Não conseguimos salvar o pet.");
  return (await resp.json()).pet;
}

export async function listarReservas(tutorId) {
  const headers = await headersAutenticados();
  const qs = headers.Authorization ? "" : `?tutor_id=${encodeURIComponent(tutorId || "")}`;
  const resp = await javaApiFetch(`/reservas${qs}`, { headers });
  if (!resp.ok) throw await erroDaResposta(resp, "Não conseguimos carregar suas reservas.");
  return (await resp.json()).reservas;
}
