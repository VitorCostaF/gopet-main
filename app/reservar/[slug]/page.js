"use client";
// app/reservar/[slug]/page.js — Checkout em 3 etapas
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { C, F, Btn } from "@/components/ui";
import { DEMO, brl } from "@/lib/supabase";
import { javaApiFetch } from "@/lib/javaApi";

const DIAS = ["Amanhã", "Sáb", "Dom", "Seg"];

export default function Reservar() {
  const { slug } = useParams();
  const router = useRouter();
  const servico = useMemo(() => DEMO.servicos.find((s) => s.id === slug && s.ativo), [slug]);

  const [etapa, setEtapa] = useState(1);
  const [dia, setDia] = useState(DIAS[0]);
  const [hora, setHora] = useState(null);
  const [pets2, setPets2] = useState(false);
  const [endereco, setEndereco] = useState({ cep: "", numero: "", instrucoes: "" });
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [concluida, setConcluida] = useState(null);

  if (!servico) {
    return (
      <main className="max-w-md mx-auto px-5 py-16 text-center">
        <div className="text-4xl">🐕</div>
        <h1 className="mt-3 font-bold" style={{ fontFamily: F.display, fontSize: 24, color: C.brand }}>
          Esse serviço ainda não está disponível
        </h1>
        <p className="mt-2" style={{ color: C.inkSoft }}>Volte pra home e escolha um dos serviços ativos.</p>
      </main>
    );
  }

  const total = Math.round(servico.preco_centavos * (pets2 ? 1.6 : 1));

  const pagar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      // Reserva criada direto no gopet-java-api, que já dispara a confirmação por WhatsApp.
      const resp = await javaApiFetch("/reservas", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ servico: servico.id, dia, hora, dois_pets: pets2, endereco, whatsapp }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || "Não foi possível concluir. Tente de novo.");

      setConcluida(data.reserva);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const etapas = ["Data e horário", "Endereço", "Confirmação"];

  return (
    <main className="max-w-2xl mx-auto px-5 py-8">
      <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>Reservar · {servico.nome}</h1>
      <div className="flex gap-2 mt-4">
        {etapas.map((e, i) => (
          <div key={e} className="flex-1 text-center py-2 rounded-lg text-xs font-bold"
            style={{ fontFamily: F.mono, background: etapa >= i + 1 ? C.brand : C.mint, color: etapa >= i + 1 ? C.paper : C.brand }}>
            {i + 1}. {e}
          </div>
        ))}
      </div>

      {etapa === 1 && (
        <div className="mt-6 rounded-2xl p-6" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
          <div className="font-bold mb-2">Quando?</div>
          <div className="flex gap-2 flex-wrap">
            {DIAS.map((d) => (
              <button key={d} onClick={() => setDia(d)} className="px-4 py-2 rounded-xl font-semibold"
                style={{ background: dia === d ? C.brand : C.paper, color: dia === d ? C.paper : C.ink, border: `1px solid ${C.mint}` }}>{d}</button>
            ))}
          </div>
          <div className="font-bold mt-5 mb-2">Horários com passeador disponível</div>
          <div className="flex gap-2 flex-wrap">
            {DEMO.horarios.map((h, i) => (
              <button key={h} onClick={() => i !== 2 && setHora(h)} disabled={i === 2}
                className="px-4 py-2 rounded-xl font-semibold disabled:opacity-30 disabled:line-through"
                style={{ fontFamily: F.mono, background: hora === h ? C.amber : C.paper, color: hora === h ? C.brandDeep : C.ink, border: `1px solid ${C.mint}` }}>{h}</button>
            ))}
          </div>
          <label className="flex items-center gap-3 mt-5 cursor-pointer">
            <input type="checkbox" checked={pets2} onChange={(e) => setPets2(e.target.checked)} className="w-5 h-5" style={{ accentColor: C.brand }} />
            <span>Tenho 2 cães no mesmo passeio <span style={{ color: C.inkSoft }}>(+60%)</span></span>
          </label>
          <div className="mt-6 flex justify-end"><Btn onClick={() => setEtapa(2)} disabled={!hora}>Continuar</Btn></div>
        </div>
      )}

      {etapa === 2 && (
        <div className="mt-6 rounded-2xl p-6" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>CEP</label>
              <input value={endereco.cep} onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })} placeholder="04321-000"
                className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
            </div>
            <div>
              <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>NÚMERO</label>
              <input value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} placeholder="123"
                className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>INSTRUÇÕES DE PORTARIA</label>
            <textarea value={endereco.instrucoes} onChange={(e) => setEndereco({ ...endereco, instrucoes: e.target.value })}
              placeholder="Ex.: interfone 132, deixar identificação na portaria" rows={3}
              className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
            <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>O passeador recebe isso junto com a ficha de portaria digital.</p>
          </div>
          <div className="mt-6 flex justify-between">
            <Btn tom="ghost" onClick={() => setEtapa(1)}>Voltar</Btn>
            <Btn onClick={() => setEtapa(3)} disabled={!endereco.numero || endereco.cep.replace(/\D/g, "").length !== 8}>Continuar</Btn>
          </div>
        </div>
      )}

      {etapa === 3 && (
        <div className="mt-6 rounded-2xl p-6" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
          <div className="rounded-xl p-4 mb-5" style={{ background: C.paper }}>
            <div className="flex justify-between text-sm" style={{ color: C.inkSoft }}>
              <span>{servico.nome} · {dia} às {hora}</span><span>{brl(servico.preco_centavos)}</span>
            </div>
            {pets2 && (
              <div className="flex justify-between text-sm mt-1" style={{ color: C.inkSoft }}>
                <span>2º pet</span><span>{brl(Math.round(servico.preco_centavos * 0.6))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-2 pt-2" style={{ borderTop: `1px dashed ${C.mint}` }}>
              <span>Total</span><span style={{ fontFamily: F.mono }}>{brl(total)}</span>
            </div>
          </div>

          {!concluida && (
            <div>
              <label className="text-xs font-bold" style={{ fontFamily: F.mono, color: C.inkSoft }}>WHATSAPP</label>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 91234-5678" type="tel"
                className="w-full mt-1 px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
              <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>Vamos te avisar por lá assim que sua reserva for agendada.</p>
            </div>
          )}

          {concluida && (
            <div className="text-center">
              <div className="text-4xl">✅</div>
              <p className="mt-2 font-semibold">Reserva confirmada!</p>
              <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>Enviamos os detalhes pro seu WhatsApp.</p>
              <div className="mt-4">
                <Btn onClick={() => router.push(`/minha-conta?nova=${concluida.id}`)}>Ver minha reserva</Btn>
              </div>
            </div>
          )}

          {erro && <p className="mt-3 font-semibold" style={{ color: C.danger }}>{erro}</p>}

          {!concluida && (
            <div className="mt-6 flex justify-between items-center">
              <Btn tom="ghost" onClick={() => setEtapa(2)}>Voltar</Btn>
              <Btn onClick={pagar} disabled={enviando || whatsapp.replace(/\D/g, "").length < 10}>
                {enviando ? "Confirmando…" : "Confirmar reserva"}
              </Btn>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
