"use client";
// app/assinar/[plano]/page.js — Assinatura de passeios (cobrança mensal, cartão)
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { C, F, Btn, Selo } from "@/components/ui";
import { DEMO, brl, precoPlanoMensal } from "@/lib/supabase";

const DIAS_SEMANA = [
  { n: 1, curto: "Seg" }, { n: 2, curto: "Ter" }, { n: 3, curto: "Qua" },
  { n: 4, curto: "Qui" }, { n: 5, curto: "Sex" }, { n: 6, curto: "Sáb" },
];

export default function Assinar() {
  const { plano: planoId } = useParams();
  const router = useRouter();
  const plano = useMemo(() => DEMO.planos.find((p) => p.id === planoId), [planoId]);

  const [servicoId, setServicoId] = useState("passeio_30");
  const [dias, setDias] = useState([]);
  const [hora, setHora] = useState(null);
  const [cartao, setCartao] = useState({ numero: "", validade: "", cvv: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  if (!plano) {
    return (
      <main className="max-w-md mx-auto px-5 py-16 text-center">
        <div className="text-4xl">🐾</div>
        <h1 className="mt-3 font-bold" style={{ fontFamily: F.display, fontSize: 24, color: C.brand }}>Plano não encontrado</h1>
        <p className="mt-2" style={{ color: C.inkSoft }}>Volte pra home e escolha um dos planos disponíveis.</p>
      </main>
    );
  }

  const servico = DEMO.servicos.find((s) => s.id === servicoId);
  const mensal = precoPlanoMensal(servico.preco_centavos, plano.vezesSemana, plano.descontoPct);

  const alternarDia = (n) => {
    setDias((ds) =>
      ds.includes(n) ? ds.filter((d) => d !== n)
        : ds.length < plano.vezesSemana ? [...ds, n].sort() : ds
    );
  };

  const assinar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const resp = await fetch("/api/assinaturas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          plano: plano.id, servico: servicoId, dias_semana: dias, horario: hora,
          pagamento: { metodo: "cartao", token_cartao: "tok_" + cartao.numero.slice(-4) },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || "Não foi possível concluir. Tente de novo.");
      router.push(`/minha-conta?plano=${data.assinatura.id}`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const pronto = dias.length === plano.vezesSemana && hora && cartao.numero.length >= 13;

  return (
    <main className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>Assinar · {plano.nome}</h1>
        {plano.destaque && <Selo tom="amber">MAIS ESCOLHIDO</Selo>}
      </div>
      <p className="mt-1" style={{ color: C.inkSoft }}>
        {plano.vezesSemana}x por semana, sempre no mesmo horário e com o mesmo passeador. Pause nas férias ou cancele quando quiser.
      </p>

      <div className="mt-6 rounded-2xl p-6 grid gap-5" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
        <div>
          <div className="font-bold mb-2">Duração de cada passeio</div>
          <div className="flex gap-2">
            {["passeio_30", "passeio_60"].map((id) => {
              const s = DEMO.servicos.find((x) => x.id === id);
              return (
                <button key={id} onClick={() => setServicoId(id)} className="flex-1 py-3 rounded-xl font-bold"
                  style={{ background: servicoId === id ? C.brand : C.paper, color: servicoId === id ? C.paper : C.ink, border: `1px solid ${C.mint}` }}>
                  {s.nome.replace("Passeio ", "")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="font-bold mb-1">Quais dias? <span className="font-normal text-sm" style={{ color: C.inkSoft }}>escolha {plano.vezesSemana}</span></div>
          <div className="flex gap-2 flex-wrap">
            {DIAS_SEMANA.map((d) => (
              <button key={d.n} onClick={() => alternarDia(d.n)}
                className="w-14 py-2 rounded-xl font-bold"
                style={{
                  fontFamily: F.mono,
                  background: dias.includes(d.n) ? C.amber : C.paper,
                  color: dias.includes(d.n) ? C.brandDeep : C.ink,
                  border: `1px solid ${C.mint}`,
                  opacity: !dias.includes(d.n) && dias.length >= plano.vezesSemana ? 0.4 : 1,
                }}>
                {d.curto}
              </button>
            ))}
          </div>
          {dias.length === plano.vezesSemana && (
            <p className="mt-1 text-sm font-semibold" style={{ color: C.brand }}>Perfeito! {plano.vezesSemana} dias escolhidos ✓</p>
          )}
        </div>

        <div>
          <div className="font-bold mb-2">Horário fixo</div>
          <div className="flex gap-2 flex-wrap">
            {DEMO.horarios.map((h) => (
              <button key={h} onClick={() => setHora(h)} className="px-4 py-2 rounded-xl font-semibold"
                style={{ fontFamily: F.mono, background: hora === h ? C.amber : C.paper, color: hora === h ? C.brandDeep : C.ink, border: `1px solid ${C.mint}` }}>
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: C.paper }}>
          <div className="flex justify-between text-sm" style={{ color: C.inkSoft }}>
            <span>{servico.nome} · {plano.vezesSemana}x/semana</span>
            <span>{brl(servico.preco_centavos)} /passeio avulso</span>
          </div>
          <div className="flex justify-between text-sm mt-1" style={{ color: C.brand }}>
            <span>Desconto do plano</span><span>−{plano.descontoPct}%</span>
          </div>
          <div className="flex justify-between font-bold mt-2 pt-2" style={{ borderTop: `1px dashed ${C.mint}` }}>
            <span>Mensalidade</span><span style={{ fontFamily: F.mono }}>{brl(mensal)}/mês</span>
          </div>
        </div>

        <div>
          <div className="font-bold mb-2">Cartão de crédito</div>
          <p className="text-xs mb-2" style={{ color: C.inkSoft }}>
            Assinaturas são no cartão pra renovação automática — Pix fica disponível nos passeios avulsos.
          </p>
          <div className="grid gap-3">
            <input placeholder="Número do cartão" value={cartao.numero}
              onChange={(e) => setCartao({ ...cartao, numero: e.target.value })}
              className="px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="MM/AA" value={cartao.validade}
                onChange={(e) => setCartao({ ...cartao, validade: e.target.value })}
                className="px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
              <input placeholder="CVV" value={cartao.cvv}
                onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
                className="px-4 py-3 rounded-xl" style={{ background: C.paper, border: `2px solid ${C.mint}` }} />
            </div>
          </div>
        </div>

        {erro && <p className="font-semibold" style={{ color: C.danger }}>{erro}</p>}

        <div className="flex justify-end">
          <Btn onClick={assinar} disabled={!pronto || enviando}>
            {enviando ? "Confirmando…" : `Assinar por ${brl(mensal)}/mês`}
          </Btn>
        </div>
        <p className="text-xs text-center" style={{ color: C.inkSoft }}>
          Sem fidelidade. Você pode pausar (férias), trocar os dias ou cancelar direto no seu painel.
        </p>
      </div>
    </main>
  );
}
