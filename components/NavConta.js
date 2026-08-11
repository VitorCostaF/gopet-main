"use client";
// components/NavConta.js — link de conta no header: "Entrar"/"Criar conta" sem sessão, "Minha
// conta" + "Sair" com sessão. Mostra "Entrar" (em vez de um espaço em branco) também enquanto
// `carregando` é true — sem isso, qualquer travamento na checagem de sessão (ex.: /auth/profile
// do Auth0 demorando ou falhando) deixava o header sem nenhum botão de entrar/cadastrar.
import Link from "next/link";
import { useSession, sair } from "@/lib/auth";

export function NavConta() {
  const { user, carregando } = useSession();

  if (!carregando && user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/minha-conta" className="px-5 py-2 rounded-xl font-semibold" style={{ background: "#1D3F2F", color: "#F7F6F2" }}>
          Minha conta
        </Link>
        <button onClick={() => sair()} className="text-sm underline" style={{ color: "#5A6157" }}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/entrar" className="px-5 py-2 rounded-xl font-semibold" style={{ background: "#1D3F2F", color: "#F7F6F2" }}>
        Entrar
      </Link>
      {/* /entrar já mostra "Criar conta" ao lado de "Entrar" (nos dois modos, demo e Auth0) —
          por isso este link também aponta pra lá, sem screen_hint: linkCriarConta() de lib/auth.js
          usa a rota /auth/login, que só existe com Auth0 configurado (ver middleware.js). */}
      <Link href="/entrar" className="text-sm underline hidden sm:inline" style={{ color: "#5A6157" }}>
        Criar conta
      </Link>
    </div>
  );
}
