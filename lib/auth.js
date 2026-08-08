"use client";
// lib/auth.js — sessão do tutor via Supabase Auth (e-mail/senha + Google).
// DEMO_MODE (sem Supabase configurado): simula a sessão em localStorage, pra manter
// o fluxo de login → reserva usável em dev, igual ao resto do app (ver lib/supabase.js).
import { useEffect, useState } from "react";
import { supabase, DEMO_MODE } from "@/lib/supabase";

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

/** Sessão atual do tutor. `carregando` fica true até a checagem inicial terminar. */
export function useSession() {
  const [session, setSession] = useState(undefined); // undefined = ainda checando

  useEffect(() => {
    if (DEMO_MODE) {
      setSession(lerSessaoDemo());
      const atualizar = () => setSession(lerSessaoDemo());
      window.addEventListener(DEMO_EVENTO, atualizar);
      window.addEventListener("storage", atualizar);
      return () => {
        window.removeEventListener(DEMO_EVENTO, atualizar);
        window.removeEventListener("storage", atualizar);
      };
    }

    const client = supabase();
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: assinatura } = client.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => assinatura.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, carregando: session === undefined };
}

export async function entrarComSenha(email, senha) {
  if (DEMO_MODE) {
    salvarSessaoDemo(email);
    return { error: null };
  }
  const { error } = await supabase().auth.signInWithPassword({ email, password: senha });
  return { error };
}

export async function criarConta(email, senha) {
  if (DEMO_MODE) {
    salvarSessaoDemo(email);
    return { error: null };
  }
  const { error } = await supabase().auth.signUp({ email, password: senha });
  return { error };
}

export async function entrarComGoogle(next = "/minha-conta") {
  if (DEMO_MODE) {
    salvarSessaoDemo("voce@gmail.com");
    window.location.href = next;
    return;
  }
  await supabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
}

export async function sair() {
  if (DEMO_MODE) {
    localStorage.removeItem(DEMO_KEY);
    window.dispatchEvent(new Event(DEMO_EVENTO));
    return;
  }
  await supabase().auth.signOut();
}
