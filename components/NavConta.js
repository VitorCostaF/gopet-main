"use client";
// components/NavConta.js — link de conta no header: "Entrar" sem sessão, "Minha conta" + "Sair" com sessão.
import Link from "next/link";
import { useSession, sair } from "@/lib/auth";

export function NavConta() {
  const { user, carregando } = useSession();

  if (carregando) return <span style={{ display: "inline-block", width: 110, height: 40 }} />;

  if (!user) {
    return (
      <Link href="/entrar" className="px-5 py-2 rounded-xl font-semibold" style={{ background: "#1D3F2F", color: "#F7F6F2" }}>
        Entrar
      </Link>
    );
  }

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
