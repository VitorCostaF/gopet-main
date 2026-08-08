"use client";
// lib/auth.js — sessão do tutor via Auth0 (e-mail/senha + Google, ambos configurados no
// tenant do Auth0 — ver AUTH0_DOMAIN/AUTH0_CLIENT_ID/AUTH0_CLIENT_SECRET/AUTH0_SECRET em
// .env.example). Login e cadastro reais acontecem na Universal Login do Auth0 (redirecionamento
// pras rotas /auth/login, /auth/logout que o SDK expõe via middleware.js) — este app não tem
// formulário de senha próprio: é o Auth0 quem valida credenciais, guarda hashes de senha etc.
//
// DEMO_MODE (sem Auth0 configurado): simula a sessão em localStorage, pra manter o fluxo de
// login → reserva usável em dev sem precisar de um tenant Auth0 configurado. AUTH0_CONFIGURADO
// vem de next.config.mjs (flag pública inlined no bundle, sem vazar segredo nenhum).
import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

export const AUTH0_CONFIGURADO = process.env.AUTH0_CONFIGURADO === "true";
export const DEMO_MODE = !AUTH0_CONFIGURADO;

const DEMO_KEY = "gopet_demo_session";
const DEMO_EVENTO = "gopet-demo-session";

function lerSessaoDemo() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
  } catch {
    return null;
  }
}

function salvarSessaoDemo(email) {
  const fake = { user: { id: `demo-${btoa(unescape(encodeURIComponent(email))).slice(0, 16)}`, email } };
  localStorage.setItem(DEMO_KEY, JSON.stringify(fake));
  window.dispatchEvent(new Event(DEMO_EVENTO));
}

/**
 * Sessão atual do tutor. `carregando` fica true até a checagem inicial terminar.
 * Chama useUser() (Auth0) incondicionalmente — regra dos hooks — mesmo em modo demo; nesse
 * modo o resultado é só ignorado (o /auth/profile que ele tentaria buscar nem existe, já que o
 * middleware não monta as rotas do Auth0 sem configuração — a chamada falha silenciosamente).
 */
export function useSession() {
  const [demoSession, setDemoSession] = useState(undefined); // undefined = ainda checando
  const auth0User = useUser();

  useEffect(() => {
    if (!DEMO_MODE) return;
    setDemoSession(lerSessaoDemo());
    const atualizar = () => setDemoSession(lerSessaoDemo());
    window.addEventListener(DEMO_EVENTO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(DEMO_EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  if (DEMO_MODE) {
    return { session: demoSession, user: demoSession?.user ?? null, carregando: demoSession === undefined };
  }
  return {
    session: auth0User.user ? { user: auth0User.user } : null,
    user: auth0User.user ?? null,
    carregando: auth0User.isLoading,
  };
}

// ── Modo demo — login/cadastro fake, sem Auth0 (usado em app/entrar/page.js) ────────────────
export function entrarComSenhaDemo(email) {
  salvarSessaoDemo(email);
}
export function entrarComGoogleDemo() {
  salvarSessaoDemo("voce@gmail.com");
}

// ── Modo real — links pra Universal Login do Auth0 (redirecionamento) ───────────────────────
// screen_hint=signup abre direto na aba de cadastro; connection=google-oauth2 pula a tela do
// Auth0 e vai direto pro Google. returnTo é pra onde volta depois de autenticar.
export function linkEntrar(next = "/minha-conta") {
  return `/auth/login?returnTo=${encodeURIComponent(next)}`;
}
export function linkCriarConta(next = "/minha-conta") {
  return `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(next)}`;
}
export function linkGoogle(next = "/minha-conta") {
  return `/auth/login?connection=google-oauth2&returnTo=${encodeURIComponent(next)}`;
}

/** Sai da sessão — demo (localStorage) ou Auth0 (navega pra /auth/logout). */
export function sair() {
  if (DEMO_MODE) {
    localStorage.removeItem(DEMO_KEY);
    window.dispatchEvent(new Event(DEMO_EVENTO));
    return;
  }
  window.location.href = "/auth/logout";
}
