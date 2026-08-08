"use client";
// app/entrar/page.js — Entrar/criar conta, com redirecionamento de volta pra onde o tutor
// estava indo (?next=), usado pelo checkout de reserva (ver app/reservar/[slug]/page.js).
//
// Modo real (Auth0 configurado): e-mail/senha e Google acontecem na Universal Login do Auth0 —
// esta página só linka pra lá (ver lib/auth.js linkEntrar/linkCriarConta/linkGoogle). Não existe
// formulário de senha aqui: quem valida credenciais é o Auth0.
// Modo demo (sem Auth0 configurado): formulário fake, qualquer e-mail/senha funciona, sessão
// simulada em localStorage — pra manter o fluxo login → reserva usável em dev sem tenant Auth0.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { C, F, Btn } from "@/components/ui";
import { DEMO_MODE, entrarComSenhaDemo, entrarComGoogleDemo, linkEntrar, linkCriarConta, linkGoogle } from "@/lib/auth";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/minha-conta";

  if (!DEMO_MODE) return <FormularioAuth0 next={next} />;
  return <FormularioDemo next={next} router={router} />;
}

function FormularioAuth0({ next }) {
  return (
    <main className="max-w-sm mx-auto px-5 py-14">
      <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>Entrar</h1>
      <p className="mt-1" style={{ color: C.inkSoft, fontSize: 14 }}>
        Pra reservar, primeiro entre na sua conta GO PET. Você vai continuar no login seguro do Auth0.
      </p>

      <a
        href={linkGoogle(next)}
        className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold"
        style={{ background: C.white, color: C.ink, border: `2px solid ${C.mint}` }}
      >
        <GoogleIcone /> Continuar com Google
      </a>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: C.mint }} />
        <span className="text-xs" style={{ color: C.inkSoft, fontFamily: F.mono }}>OU</span>
        <div className="flex-1 h-px" style={{ background: C.mint }} />
      </div>

      <a
        href={linkEntrar(next)}
        className="block text-center px-5 py-3 rounded-xl font-semibold"
        style={{ fontFamily: F.body, fontSize: 15, background: C.brand, color: C.paper }}
      >
        Entrar com e-mail e senha
      </a>

      <p className="mt-5 text-center text-sm" style={{ color: C.inkSoft }}>
        Ainda não tem conta?{" "}
        <a href={linkCriarConta(next)} className="underline font-semibold" style={{ color: C.brand }}>
          Criar conta
        </a>
      </p>
    </main>
  );
}

function traduzErro(mensagem) {
  const m = String(mensagem || "");
  if (/password should be at least/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  return "Não conseguimos concluir agora. Tente de novo.";
}

function FormularioDemo({ next, router }) {
  const [modo, setModo] = useState("entrar"); // "entrar" | "criar"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const enviar = (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      if (senha.length < 6) throw new Error("password should be at least 6 characters");
      entrarComSenhaDemo(email);
      router.push(next);
    } catch (err) {
      setErro(traduzErro(err.message));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto px-5 py-14">
      <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>
        {modo === "entrar" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-1" style={{ color: C.inkSoft, fontSize: 14 }}>
        Pra reservar, primeiro entre na sua conta GO PET.
      </p>

      <div className="mt-4 rounded-xl p-3 text-xs" style={{ background: C.amberSoft, color: "#8A5A14" }}>
        Modo demo: qualquer e-mail/senha funciona, sem enviar nada de verdade. Configure o Auth0
        (ver .env.example) pra login real com e-mail/senha e Google.
      </div>

      <button
        type="button"
        onClick={() => { entrarComGoogleDemo(); router.push(next); }}
        className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold"
        style={{ background: C.white, color: C.ink, border: `2px solid ${C.mint}` }}
      >
        <GoogleIcone /> Continuar com Google
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: C.mint }} />
        <span className="text-xs" style={{ color: C.inkSoft, fontFamily: F.mono }}>OU</span>
        <div className="flex-1 h-px" style={{ background: C.mint }} />
      </div>

      <form onSubmit={enviar} className="grid gap-3">
        <div>
          <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>E-MAIL</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="w-full mt-1 px-4 py-3 rounded-xl"
            style={{ background: C.paper, border: `2px solid ${C.mint}` }}
          />
        </div>
        <div>
          <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>SENHA</label>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full mt-1 px-4 py-3 rounded-xl"
            style={{ background: C.paper, border: `2px solid ${C.mint}` }}
          />
        </div>

        {erro && <p className="text-sm font-semibold" style={{ color: C.danger }}>{erro}</p>}

        <Btn tom="brand" className="mt-1" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </Btn>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: C.inkSoft }}>
        {modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
        <button
          type="button"
          onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setErro(null); }}
          className="underline font-semibold"
          style={{ color: C.brand }}
        >
          {modo === "entrar" ? "Criar conta" : "Entrar"}
        </button>
      </p>
    </main>
  );
}

function GoogleIcone() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

export default function Entrar() {
  return (
    <Suspense fallback={<main className="max-w-sm mx-auto px-5 py-14" style={{ color: "#5A6157" }}>Carregando…</main>}>
      <Formulario />
    </Suspense>
  );
}
