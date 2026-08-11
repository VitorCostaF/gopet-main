"use client";
// app/minha-conta/pets/novo/page.js — cadastro de um novo pet do tutor logado (ver POST /pets
// no java-api). Campos obrigatórios: nome, idade, porte, reativo, agressivo com pessoas, vacinas
// em dia. Peso, problema de saúde e observações são opcionais.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { C, F, Btn } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { criarPet } from "@/lib/javaApi";

const PORTES = [
  { valor: "PEQUENO", rotulo: "Pequeno" },
  { valor: "MEDIO", rotulo: "Médio" },
  { valor: "GRANDE", rotulo: "Grande" },
];

function SimNao({ rotulo, ajuda, valor, onChange }) {
  return (
    <div>
      <div className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>{rotulo.toUpperCase()}</div>
      {ajuda && <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{ajuda}</p>}
      <div className="flex gap-2 mt-1.5">
        {[["Não", false], ["Sim", true]].map(([r, v]) => (
          <button key={r} type="button" onClick={() => onChange(v)}
            className="px-4 py-2 rounded-xl font-semibold text-sm"
            style={{ background: valor === v ? C.brand : C.paper, color: valor === v ? C.paper : C.ink, border: `1px solid ${C.mint}` }}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/minha-conta/pets";
  const { user, carregando: carregandoSessao } = useSession();

  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [porte, setPorte] = useState("MEDIO");
  const [peso, setPeso] = useState("");
  const [reativo, setReativo] = useState(false);
  const [agressivo, setAgressivo] = useState(false);
  const [vacinas, setVacinas] = useState(false);
  const [problemaSaude, setProblemaSaude] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!carregandoSessao && !user) {
      const voltaPraCa = `/minha-conta/pets/novo?next=${encodeURIComponent(next)}`;
      router.replace(`/entrar?next=${encodeURIComponent(voltaPraCa)}`);
    }
  }, [carregandoSessao, user, next, router]);

  if (carregandoSessao || !user) {
    return <main className="max-w-sm mx-auto px-5 py-16 text-center" style={{ color: C.inkSoft }}>Verificando sua conta…</main>;
  }

  const podeSalvar = nome.trim().length > 0 && idade !== "" && Number(idade) >= 0;

  const salvar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await criarPet({
        nome: nome.trim(),
        idade_anos: Number(idade),
        porte,
        peso_kg: peso ? Number(peso) : null,
        reativo,
        agressivo_pessoas: agressivo,
        vacinas_em_dia: vacinas,
        problema_saude: problemaSaude.trim() || null,
        observacoes: observacoes.trim() || null,
      }, user.id);
      router.push(next);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto px-5 py-14">
      <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>Cadastrar pet</h1>
      <p className="mt-1" style={{ color: C.inkSoft, fontSize: 14 }}>
        Essas informações ajudam o passeador a cuidar bem do seu pet.
      </p>

      <form onSubmit={salvar} className="grid gap-4 mt-6">
        <div>
          <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>NOME</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Frida" required
            className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>IDADE (ANOS)</label>
            <input value={idade} onChange={(e) => setIdade(e.target.value)} type="number" min="0" max="30" placeholder="3" required
              className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
          </div>
          <div>
            <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>PESO EM KG (OPCIONAL)</label>
            <input value={peso} onChange={(e) => setPeso(e.target.value)} type="number" min="0.5" max="90" step="0.1" placeholder="12"
              className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>PORTE</label>
          <div className="flex gap-2 mt-1.5">
            {PORTES.map((p) => (
              <button key={p.valor} type="button" onClick={() => setPorte(p.valor)}
                className="px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background: porte === p.valor ? C.brand : C.paper, color: porte === p.valor ? C.paper : C.ink, border: `1px solid ${C.mint}` }}>
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>

        <SimNao rotulo="É reativo?" ajuda="Reage com latidos/puxões a outros cães, pessoas ou barulhos." valor={reativo} onChange={setReativo} />
        <SimNao rotulo="É agressivo com pessoas?" valor={agressivo} onChange={setAgressivo} />
        <SimNao rotulo="Vacinas em dia?" valor={vacinas} onChange={setVacinas} />

        <div>
          <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>PROBLEMA DE SAÚDE OU DOENÇA (OPCIONAL)</label>
          <textarea value={problemaSaude} onChange={(e) => setProblemaSaude(e.target.value)} rows={2}
            placeholder="Ex.: displasia no quadril, toma remédio de manhã"
            className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
        </div>

        <div>
          <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>OBSERVAÇÕES (OPCIONAL)</label>
          <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2}
            placeholder="Qualquer outra coisa que o passeador deveria saber"
            className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
        </div>

        {erro && <p className="text-sm font-semibold" style={{ color: C.danger }}>{erro}</p>}

        <Btn tom="brand" disabled={!podeSalvar || enviando}>{enviando ? "Salvando…" : "Salvar pet"}</Btn>
      </form>
    </main>
  );
}

export default function CadastrarPet() {
  return (
    <Suspense fallback={<main className="max-w-sm mx-auto px-5 py-14" style={{ color: C.inkSoft }}>Carregando…</main>}>
      <Formulario />
    </Suspense>
  );
}
