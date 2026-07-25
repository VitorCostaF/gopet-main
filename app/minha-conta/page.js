"use client";
// app/minha-conta/page.js — Painel do tutor
// DEMO_MODE: estado local. Com Supabase configurado, os TODOs marcados
// trocam o estado local por consultas reais (RLS garante isolamento por tutor).
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { C, F, Btn, Selo, AvatarIni, TrilhaAoVivo } from "@/components/ui";
import { DEMO } from "@/lib/supabase";

const RESERVAS_DEMO = [
  { id: "r1", servico: "Passeio 30 min", data: "Hoje", hora: "16:30", passeador: DEMO.passeadores[0], status: "ao_vivo" },
  { id: "r2", servico: "Passeio 30 min", data: "Amanhã", hora: "07:30", passeador: DEMO.passeadores[0], status: "confirmada" },
  { id: "r3", servico: "Creche (dia)", data: "Sáb", hora: "09:00", passeador: DEMO.passeadores[2], status: "confirmada" },
];
const RELATORIOS = [
  { id: "h1", data: "Ontem · 07:32", dist: "1,8 km", dur: "31 min", eventos: ["💧 07:41", "💩 07:49", "🥤 07:55"], obs: "Frida super animada hoje! Fez amizade com um beagle na praça." },
  { id: "h2", data: "Seg · 07:30", dist: "1,6 km", dur: "29 min", eventos: ["💧 07:38", "🥤 07:52"], obs: "Passeio tranquilo, dia mais quente — reforçamos a água." },
];

function Painel() {
  const params = useSearchParams();
  const novaId = params.get("nova");
  const planoNovo = params.get("plano");
  const [aba, setAba] = useState("hoje");
  const [reservas, setReservas] = useState(() =>
    novaId
      ? [...RESERVAS_DEMO, { id: novaId, servico: "Nova reserva", data: "Confirmada 🎉", hora: "", passeador: DEMO.passeadores[1], status: "confirmada" }]
      : RESERVAS_DEMO
  );
  const [petFoto, setPetFoto] = useState(null);
  const [verRelatorio, setVerRelatorio] = useState(null);
  const [verFicha, setVerFicha] = useState(false);
  const [recStatus, setRecStatus] = useState("ativa");
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const aoVivo = reservas.find((r) => r.status === "ao_vivo");

  const carregarFoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => setPetFoto(leitor.result); // TODO Supabase: upload no bucket fotos-pets + salvar foto_url
    leitor.readAsDataURL(f);
    e.target.value = "";
  };

  const cancelar = (id) => {
    // TODO Supabase: POST /api/reservas/{id}/cancelar (aplica janela de 12h + estorno)
    setReservas((rs) => rs.filter((r) => r.id !== id));
    setConfirmandoId(null);
    setToast("Reserva cancelada. Reembolso integral a caminho.");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <main className="max-w-3xl mx-auto px-5 py-6">
      <input ref={fileRef} type="file" accept="image/*" onChange={carregarFoto} className="hidden" aria-label="Enviar foto do pet" />

      <div className="flex items-center gap-3">
        <button onClick={() => fileRef.current?.click()} className="relative shrink-0" aria-label="Trocar foto da Frida">
          {petFoto
            ? <img src={petFoto} alt="Foto da Frida" className="w-14 h-14 rounded-full object-cover" style={{ border: `3px solid ${C.amber}` }} />
            : <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ background: C.amberSoft }}>🐕</div>}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: C.brand, color: C.paper }}>📷</span>
        </button>
        <div>
          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.brand }}>Frida</div>
          <div className="text-sm" style={{ color: C.inkSoft }}>
            vira-lata · porte M · 3 anos
            {!petFoto && <> · <button onClick={() => fileRef.current?.click()} className="underline" style={{ color: C.brand }}>adicionar foto</button></>}
          </div>
        </div>
      </div>

      {planoNovo && (
        <div className="mt-4 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
          <span className="text-2xl">🎉</span>
          <div className="text-sm" style={{ color: "#8A5A14" }}>
            <b>Assinatura ativa!</b> Seus passeios fixos já estão garantidos — os próximos aparecem na sua agenda em instantes.
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-5">
        {[["hoje", "Hoje"], ["agenda", "Agenda"], ["pet", "Perfil da Frida"]].map(([v, l]) => (
          <button key={v} onClick={() => setAba(v)} className="px-4 py-2 rounded-full font-bold text-sm"
            style={{ background: aba === v ? C.brand : C.white, color: aba === v ? C.paper : C.brand, border: `1px solid ${C.mint}` }}>{l}</button>
        ))}
      </div>

      {aba === "hoje" && (
        <div className="mt-5 grid gap-4">
          {aoVivo ? (
            <div className="rounded-2xl p-5" style={{ background: C.white, border: `2px solid ${C.amber}` }}>
              <div className="flex items-center justify-between">
                <div className="font-bold">Acontecendo agora</div>
                <Selo tom="live">● AO VIVO</Selo>
              </div>
              <div className="mt-3"><TrilhaAoVivo altura={180} petFoto={petFoto} /></div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AvatarIni ini={aoVivo.passeador.ini} tam={36} />
                  <span className="text-sm" style={{ color: C.inkSoft }}>{aoVivo.passeador.nome_publico} está com a Frida</span>
                </div>
                <Btn tom="brand" className="!px-4 !py-2">Abrir chat</Btn>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center" style={{ background: C.white, border: `1px dashed ${C.mint}` }}>
              <div className="text-3xl">😌</div>
              <p className="mt-2" style={{ color: C.inkSoft }}>Nenhum serviço em andamento agora. O próximo aparece aqui ao vivo.</p>
            </div>
          )}

          <div className="rounded-2xl p-5" style={{ background: C.brand }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold" style={{ color: C.paper }}>Plano recorrente · 3x/semana</div>
                <div className="text-sm" style={{ color: C.mint }}>Seg · Qua · Sex às 07:30 com Ana Beatriz</div>
              </div>
              <Selo tom={recStatus === "ativa" ? "amber" : "mint"}>{recStatus === "ativa" ? "ATIVA" : "PAUSADA"}</Selo>
            </div>
            <div className="mt-4 flex gap-2">
              <Btn tom="amber" className="!py-2" onClick={() => setRecStatus(recStatus === "ativa" ? "pausada" : "ativa")}>
                {recStatus === "ativa" ? "Pausar (férias)" : "Reativar plano"}
              </Btn>
              <Btn cheio={false} tom="amber" className="!py-2">Trocar dias</Btn>
            </div>
          </div>

          <div>
            <div className="font-bold mb-2">Últimos passeios</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {RELATORIOS.map((r) => (
                <button key={r.id} onClick={() => setVerRelatorio(r)} className="rounded-2xl p-4 text-left"
                  style={{ background: C.white, border: `1px solid ${C.mint}` }}>
                  <div className="flex justify-between" style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>
                    <span>{r.data}</span><span>{r.dist} · {r.dur}</span>
                  </div>
                  <div className="mt-2 flex gap-1 flex-wrap">{r.eventos.map((e) => <Selo key={e}>{e}</Selo>)}</div>
                  <div className="mt-2 text-sm underline" style={{ color: C.brand }}>Ver relatório completo →</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {aba === "agenda" && (
        <div className="mt-5 grid gap-3">
          {reservas.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: C.white, border: `1px dashed ${C.mint}` }}>
              <p style={{ color: C.inkSoft }}>Sua agenda está vazia. Que tal a primeira reserva?</p>
            </div>
          )}
          {reservas.map((r) => (
            <div key={r.id} className="rounded-2xl p-4 flex items-center justify-between gap-3"
              style={{ background: C.white, border: `1px solid ${C.mint}` }}>
              <div className="flex items-center gap-3">
                <AvatarIni ini={r.passeador.ini} tam={40} />
                <div>
                  <div className="font-bold">{r.servico}</div>
                  <div className="text-sm" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                    {r.data}{r.hora && ` · ${r.hora}`} · {r.passeador.nome_publico}
                  </div>
                </div>
              </div>
              {r.status === "ao_vivo" ? (
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
          ))}
          <p className="text-xs" style={{ color: C.inkSoft }}>
            Cancelamentos até 12h antes: reembolso integral. Depois disso, taxa de 50%.
          </p>
        </div>
      )}

      {aba === "pet" && (
        <div className="mt-5 grid gap-4">
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
            {petFoto
              ? <img src={petFoto} alt="Foto da Frida" className="w-20 h-20 rounded-full object-cover" style={{ border: `3px solid ${C.amber}` }} />
              : <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: C.amberSoft }}>🐕</div>}
            <div className="flex-1">
              <div className="font-bold">{petFoto ? "Que linda! 🧡" : "Coloque a carinha da Frida aqui"}</div>
              <div className="text-sm" style={{ color: C.inkSoft }}>
                {petFoto ? "A foto dela agora aparece no mapa do passeio ao vivo." : "Ela vai aparecer no mapa do passeio ao vivo, no lugar do avatar."}
              </div>
              <div className="mt-2">
                <Btn tom="brand" className="!py-2 !px-4" onClick={() => fileRef.current?.click()}>
                  {petFoto ? "Trocar foto" : "Enviar foto"}
                </Btn>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
            <div className="font-bold mb-3">Ficha da Frida</div>
            {[["Temperamento", "Dócil, convive bem com outros cães. Medo de fogos."],
              ["Saúde", "Sem restrições. Vet de referência: Dra. Paula"],
              ["Acesso", "Interfone 132 · retirar na portaria · guia no gancho da entrada"]].map(([t, v]) => (
              <div key={t} className="py-2" style={{ borderBottom: `1px dashed ${C.mint}` }}>
                <div className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>{t.toUpperCase()}</div>
                <div className="text-sm mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={{ background: C.amberSoft }}>
            <div>
              <div className="font-bold" style={{ color: "#8A5A14" }}>Ficha de portaria de hoje</div>
              <div className="text-sm" style={{ color: "#8A5A14", opacity: 0.8 }}>Mostre ao porteiro quem está autorizado a buscar a Frida.</div>
            </div>
            <Btn tom="brand" onClick={() => setVerFicha(true)}>Gerar ficha</Btn>
          </div>
        </div>
      )}

      {verRelatorio && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "#00000088" }} onClick={() => setVerRelatorio(null)}>
          <div className="w-full max-w-lg rounded-2xl p-5 max-h-full overflow-auto" style={{ background: C.paper }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.brand }}>Relatório do passeio</div>
              <button onClick={() => setVerRelatorio(null)} className="text-xl" aria-label="Fechar">✕</button>
            </div>
            <div className="mt-3"><TrilhaAoVivo altura={150} rotulo={false} petFoto={petFoto} /></div>
            <div className="mt-3 flex gap-2 flex-wrap" style={{ fontFamily: F.mono, fontSize: 13 }}>
              <Selo>{verRelatorio.data}</Selo><Selo>{verRelatorio.dist}</Selo><Selo>{verRelatorio.dur}</Selo>
              {verRelatorio.eventos.map((e) => <Selo key={e} tom="amber">{e}</Selo>)}
            </div>
            <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: C.white }}>
              <span className="font-bold">Ana Beatriz:</span> &ldquo;{verRelatorio.obs}&rdquo;
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div style={{ color: C.amber, fontSize: 22 }}>★★★★★</div>
              <Btn tom="brand" className="!py-2" onClick={() => setVerRelatorio(null)}>Avaliar passeio</Btn>
            </div>
          </div>
        </div>
      )}

      {verFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "#00000088" }} onClick={() => setVerFicha(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: C.white }}
            onClick={(e) => e.stopPropagation()}>
            <div className="p-4 text-center" style={{ background: C.brand }}>
              <div style={{ fontFamily: F.display, color: C.paper, fontWeight: 700 }}>GO PET · FICHA DE PORTARIA</div>
              <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mint }}>Hoje · válida até 23:59</div>
            </div>
            <div className="p-5 text-center">
              <div className="mx-auto w-fit"><AvatarIni ini="AB" tam={72} /></div>
              <div className="mt-2 font-bold" style={{ fontSize: 18 }}>Ana Beatriz Lima</div>
              <div style={{ fontFamily: F.mono, fontSize: 13, color: C.inkSoft }}>CPF ***.456.789-** · Passeadora verificada</div>
              <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: C.paper }}>
                Autorizada a buscar <b>Frida</b> (apto 132)<br />entre <b>16:15 e 17:30</b>
              </div>
              <div className="mt-4 flex gap-2 justify-center">
                <Btn tom="brand" className="!py-2">Enviar no WhatsApp</Btn>
                <Btn cheio={false} tom="brand" className="!py-2" onClick={() => setVerFicha(false)}>Fechar</Btn>
              </div>
            </div>
          </div>
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
