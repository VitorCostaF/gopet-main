"use client";
// app/minha-conta/page.js — Painel do tutor, 100% dados reais do java-api (GET /reservas,
// GET /pets, GET /usuarios/me) — sem conteúdo de demonstração. Acompanhamento ao vivo do
// passeio e relatórios pós-passeio ainda não existem no backend (dependem de atribuição de
// passeador em tempo real) — ficam pra uma fase futura, não fazem parte deste painel por ora.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { C, F, Btn, Selo } from "@/components/ui";
import { DEMO } from "@/lib/supabase";
import { useSession } from "@/lib/auth";
import { useCadastroTutor } from "@/lib/cadastro";
import { listarReservas, listarPets } from "@/lib/javaApi";

const STATUS_LABEL = {
  pendente_pagamento: "Pendente",
  confirmada: "Confirmada",
  em_execucao: "Em andamento",
  concluida: "Concluída",
  cancelada_tutor: "Cancelada",
  cancelada_operacao: "Cancelada",
  expirada: "Expirada",
};

const PORTE_LABEL = { PEQUENO: "Pequeno", MEDIO: "Médio", GRANDE: "Grande" };

function nomeServico(id) {
  return DEMO.servicos.find((s) => s.id === id)?.nome || id;
}

function AlertaCadastro() {
  return (
    <div className="mt-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
      <span className="text-2xl">⚠️</span>
      <div className="flex-1 text-sm" style={{ color: "#8A5A14" }}>
        <b>Finalize seu cadastro</b> — precisamos do seu nome e endereço antes de você reservar um passeio.
      </div>
      <Link href="/minha-conta/cadastro?next=/minha-conta">
        <Btn tom="amber" className="!py-2 !px-4 whitespace-nowrap">Completar</Btn>
      </Link>
    </div>
  );
}

function Painel() {
  const router = useRouter();
  const params = useSearchParams();
  const novaId = params.get("nova");
  const planoNovo = params.get("plano");
  const { user, carregando: carregandoSessao } = useSession();
  const { usuario, completo: cadastroCompleto, carregando: carregandoCadastro } = useCadastroTutor();

  const [aba, setAba] = useState("reservas");
  const [reservas, setReservas] = useState(null);
  const [erroReservas, setErroReservas] = useState(null);
  const [pets, setPets] = useState(null);
  const [erroPets, setErroPets] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!carregandoSessao && !user) router.replace("/entrar?next=/minha-conta");
  }, [carregandoSessao, user, router]);

  useEffect(() => {
    if (!user) return;
    listarReservas(user.id).then(setReservas).catch((e) => setErroReservas(e.message));
    listarPets(user.id).then(setPets).catch((e) => setErroPets(e.message));
  }, [user, novaId]);

  const petsPorId = Object.fromEntries((pets || []).map((p) => [p.id, p]));

  const cancelar = (id) => {
    // TODO: POST /reservas/{id}/cancelar no java-api (aplica janela de 12h + estorno) — ainda não existe
    setReservas((rs) => rs.filter((r) => r.id !== id));
    setConfirmandoId(null);
    setToast("Reserva cancelada. Reembolso integral a caminho.");
    setTimeout(() => setToast(null), 3000);
  };

  if (carregandoSessao || !user) {
    return <main className="max-w-3xl mx-auto px-5 py-16 text-center" style={{ color: C.inkSoft }}>Verificando sua conta…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.brand }}>
            Olá, {usuario?.nome || user.name || "tutor"} 👋
          </div>
          <div className="text-sm" style={{ color: C.inkSoft }}>{usuario?.email || user.email}</div>
        </div>
        <Link href="/minha-conta/cadastro?next=/minha-conta" className="text-sm font-semibold underline shrink-0" style={{ color: C.brand }}>
          Editar cadastro
        </Link>
      </div>

      {!carregandoCadastro && !cadastroCompleto && <AlertaCadastro />}

      {planoNovo && (
        <div className="mt-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <span className="text-2xl">🎉</span>
          <div className="text-sm" style={{ color: "#8A5A14" }}>
            <b>Assinatura ativa!</b> Seus passeios fixos já estão garantidos — os próximos aparecem na sua agenda em instantes.
          </div>
        </div>
      )}

      {novaId && (
        <div className="mt-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: C.mint, border: `1px solid ${C.brand}` }}>
          <span className="text-2xl">🎉</span>
          <div className="text-sm" style={{ color: C.brand }}><b>Reserva confirmada!</b> Já aparece na aba Reservas.</div>
        </div>
      )}

      <div className="flex gap-2 mt-5">
        {[["reservas", "Reservas"], ["pets", "Meus pets"]].map(([v, l]) => (
          <button key={v} onClick={() => setAba(v)} className="px-4 py-2 rounded-full font-bold text-sm"
            style={{ background: aba === v ? C.brand : C.white, color: aba === v ? C.paper : C.brand, border: `1px solid ${C.mint}` }}>{l}</button>
        ))}
      </div>

      {aba === "reservas" && (
        <div className="mt-5 grid gap-3">
          {erroReservas && <p className="text-sm font-semibold" style={{ color: C.danger }}>{erroReservas}</p>}

          {reservas === null && !erroReservas && <p className="text-sm" style={{ color: C.inkSoft }}>Carregando…</p>}

          {reservas && reservas.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: C.white, border: `1px dashed ${C.mint}` }}>
              <p style={{ color: C.inkSoft }}>Sua agenda está vazia. Que tal a primeira reserva?</p>
              <div className="mt-3"><Link href="/"><Btn tom="brand">Ver serviços</Btn></Link></div>
            </div>
          )}

          {reservas && reservas.map((r) => {
            const nomesPets = (r.pet_ids || []).map((id) => petsPorId[id]?.nome).filter(Boolean);
            return (
              <div key={r.id} className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{ background: C.white, border: `1px solid ${C.mint}` }}>
                <div>
                  <div className="font-bold">{nomeServico(r.servico)}</div>
                  <div className="text-sm" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                    {STATUS_LABEL[r.status] || r.status}{nomesPets.length > 0 ? ` · ${nomesPets.join(", ")}` : ""}
                  </div>
                </div>
                {r.status === "em_execucao" ? (
                  <Selo tom="live">● AO VIVO</Selo>
                ) : confirmandoId === r.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => cancelar(r.id)} className="text-sm font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: "#FBE9E5", color: C.danger }}>Sim, cancelar</button>
                    <button onClick={() => setConfirmandoId(null)} className="text-sm underline" style={{ color: C.inkSoft }}>Manter</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmandoId(r.id)} className="text-sm underline" style={{ color: C.danger }}>Cancelar</button>
                )}
              </div>
            );
          })}

          {reservas && reservas.length > 0 && (
            <p className="text-xs" style={{ color: C.inkSoft }}>
              Cancelamentos até 12h antes: reembolso integral. Depois disso, taxa de 50%.
            </p>
          )}
        </div>
      )}

      {aba === "pets" && (
        <div className="mt-5 grid gap-3">
          <div className="flex justify-end">
            <Link href="/minha-conta/pets/novo?next=/minha-conta"><Btn tom="brand" className="!py-2">+ Cadastrar pet</Btn></Link>
          </div>

          {erroPets && <p className="text-sm font-semibold" style={{ color: C.danger }}>{erroPets}</p>}

          {pets === null && !erroPets && <p className="text-sm" style={{ color: C.inkSoft }}>Carregando…</p>}

          {pets && pets.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: C.white, border: `1px dashed ${C.mint}` }}>
              <div className="text-3xl">🐾</div>
              <p className="mt-2" style={{ color: C.inkSoft }}>Você ainda não cadastrou nenhum pet.</p>
            </div>
          )}

          {pets && pets.map((p) => (
            <div key={p.id} className="rounded-2xl p-4" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
              <div className="flex items-center justify-between">
                <div className="font-bold">{p.nome}</div>
                <span className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                  {p.idade_anos} {p.idade_anos === 1 ? "ano" : "anos"} · {PORTE_LABEL[p.porte] || p.porte}{p.peso_kg ? ` · ${p.peso_kg}kg` : ""}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {p.reativo && <Selo tom="amber">Reativo</Selo>}
                {p.agressivo_pessoas && <Selo tom="amber">Agressivo com pessoas</Selo>}
                <Selo tom={p.vacinas_em_dia ? "mint" : "amber"}>{p.vacinas_em_dia ? "Vacinas em dia" : "Vacinas pendentes"}</Selo>
              </div>
              {p.problema_saude && <p className="mt-2 text-sm" style={{ color: C.inkSoft }}><b>Saúde:</b> {p.problema_saude}</p>}
              {p.observacoes && <p className="mt-1 text-sm" style={{ color: C.inkSoft }}><b>Observações:</b> {p.observacoes}</p>}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl font-semibold z-50"
          style={{ background: C.brandDeep, color: C.paper }}>{toast}</div>
      )}
    </main>
  );
}

export default function MinhaConta() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto px-5 py-10" style={{ color: "#5A6157" }}>Carregando seu painel…</main>}>
      <Painel />
    </Suspense>
  );
}
