"use client";
// app/minha-conta/cadastro/page.js — cadastro do tutor (nome + endereço), exigido antes de
// reservar (ver app/reservar/[slug]/page.js) e sinalizado como pendente em app/minha-conta.
// O e-mail vem do login (Google ou e-mail/senha via Auth0) — não é digitado aqui, só exibido.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { C, F, Btn } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { salvarUsuario } from "@/lib/javaApi";
import { useCadastroTutor } from "@/lib/cadastro";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/minha-conta";
  const { user, carregando: carregandoSessao } = useSession();
  const { usuario, carregando: carregandoCadastro } = useCadastroTutor();

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState({ cep: "", numero: "", instrucoes: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!carregandoSessao && !user) {
      const voltaPraCa = `/minha-conta/cadastro?next=${encodeURIComponent(next)}`;
      router.replace(`/entrar?next=${encodeURIComponent(voltaPraCa)}`);
    }
  }, [carregandoSessao, user, next, router]);

  // Preenche com o cadastro existente (edição) assim que carregar.
  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome || "");
      setEndereco({ cep: usuario.endereco?.cep || "", numero: usuario.endereco?.numero || "", instrucoes: usuario.endereco?.instrucoes || "" });
    } else if (user?.name) {
      setNome(user.name);
    }
  }, [usuario, user]);

  if (carregandoSessao || !user) {
    return <main className="max-w-md mx-auto px-5 py-16 text-center" style={{ color: C.inkSoft }}>Verificando sua conta…</main>;
  }

  const cepDigits = endereco.cep.replace(/\D/g, "");
  const cepFormatoInvalido = endereco.cep.length > 0 && cepDigits.length !== 8;
  const podeSalvar = nome.trim().length > 0 && cepDigits.length === 8 && endereco.numero.trim().length > 0;

  const salvar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await salvarUsuario({ nome: nome.trim(), email: user.email, endereco: { ...endereco, cep: cepDigits } }, user.id);
      router.push(next);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto px-5 py-14">
      <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>
        {usuario ? "Editar cadastro" : "Finalize seu cadastro"}
      </h1>
      <p className="mt-1" style={{ color: C.inkSoft, fontSize: 14 }}>
        Precisamos do seu nome e endereço antes de você reservar um passeio.
      </p>

      {carregandoCadastro ? (
        <p className="mt-6 text-sm" style={{ color: C.inkSoft }}>Carregando…</p>
      ) : (
        <form onSubmit={salvar} className="grid gap-3 mt-6">
          <div>
            <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>E-MAIL</label>
            <input value={user.email || ""} disabled
              className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.mint, border: `2px solid ${C.mint}`, color: C.inkSoft }} />
            <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>Vem da sua conta de login — não dá pra editar aqui.</p>
          </div>

          <div>
            <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>NOME</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" required
              className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>CEP</label>
              <input value={endereco.cep} onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })} placeholder="04321-000"
                className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
              {cepFormatoInvalido && <p className="mt-1 text-xs" style={{ color: C.danger }}>CEP deve ter 8 números.</p>}
            </div>
            <div>
              <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>NÚMERO</label>
              <input value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} placeholder="123"
                className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>INSTRUÇÕES DE PORTARIA (opcional)</label>
            <textarea value={endereco.instrucoes} onChange={(e) => setEndereco({ ...endereco, instrucoes: e.target.value })}
              placeholder="Ex.: interfone 132, deixar identificação na portaria" rows={3}
              className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
          </div>

          {erro && <p className="text-sm font-semibold" style={{ color: C.danger }}>{erro}</p>}

          <Btn tom="brand" className="mt-1" disabled={!podeSalvar || enviando}>
            {enviando ? "Salvando…" : "Salvar cadastro"}
          </Btn>
        </form>
      )}
    </main>
  );
}

export default function CadastroUsuario() {
  return (
    <Suspense fallback={<main className="max-w-sm mx-auto px-5 py-14" style={{ color: C.inkSoft }}>Carregando…</main>}>
      <Formulario />
    </Suspense>
  );
}
