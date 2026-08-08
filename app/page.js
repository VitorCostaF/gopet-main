"use client";
// app/page.js — Home pública GO PET
import { useState } from "react";
import Link from "next/link";
import { C, F, Btn, Selo, AvatarIni, Estrelas, TrilhaAoVivo } from "@/components/ui";
import { DEMO, brl, precoPlanoMensal } from "@/lib/supabase";
import { javaApiFetch } from "@/lib/javaApi";

export default function Home() {
  const [cep, setCep] = useState("");
  const [cepStatus, setCepStatus] = useState(null);
  const [avisado, setAvisado] = useState({});

  const cepDigits = cep.replace(/\D/g, "");
  const cepFormatoInvalido = cep.length > 0 && cepDigits.length !== 8;

  const checarCep = async () => {
    if (cepDigits.length !== 8) return;
    setCepStatus("checando");
    try {
      const resp = await javaApiFetch(`/cobertura?cep=${cepDigits}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error();
      if (data.motivo) {
        setCepStatus("cepNaoEncontrado");
      } else {
        setCepStatus(data.atende ? "ok" : "fora");
      }
    } catch {
      setCepStatus("erro");
    }
  };

  return (
    <main>
      {/* HERO */}
      <section className="px-5 md:px-10 pt-10 pb-14 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Selo tom="amber">JABAQUARA · ZONA SUL · SP</Selo>
            <h1 className="mt-4 leading-none" style={{ fontFamily: F.display, fontSize: "clamp(34px,5vw,54px)", color: C.brand, fontWeight: 800 }}>
              Veja seu cão<br />o tempo todo —<br />
              <span style={{ color: C.amber }}>do passeio à soneca.</span>
            </h1>
            <p className="mt-4 max-w-md" style={{ color: C.inkSoft, fontSize: 17, lineHeight: 1.6 }}>
              Passeio, creche e leva e traz no bairro, com trajeto ao vivo, fotos em tempo real e ficha de portaria digital pro seu prédio.
            </p>
            <div className="mt-6 flex gap-2 max-w-md">
              <input
                value={cep}
                onChange={(e) => { setCep(e.target.value); setCepStatus(null); }}
                placeholder="Seu CEP (ex.: 04321-000)"
                aria-label="CEP"
                className="flex-1 px-4 py-3 rounded-xl outline-none"
                style={{ background: C.white, border: `2px solid ${C.mint}`, fontSize: 15 }}
              />
              <Btn tom="brand" onClick={checarCep} disabled={cepStatus === "checando" || cepDigits.length !== 8}>
                {cepStatus === "checando" ? "Checando…" : "Ver se atendemos"}
              </Btn>
            </div>
            {cepFormatoInvalido && <p className="mt-2" style={{ color: C.danger }}>Digite um CEP válido de 8 números.</p>}
            {cepStatus === "ok" && <p className="mt-2 font-semibold" style={{ color: C.brand }}>Atendemos! 🎉 Escolha um serviço abaixo.</p>}
            {cepStatus === "fora" && <p className="mt-2" style={{ color: C.danger }}>Ainda não chegamos aí — mas estamos expandindo pela Zona Sul.</p>}
            {cepStatus === "cepNaoEncontrado" && <p className="mt-2" style={{ color: C.danger }}>Não conseguimos localizar esse CEP. Confira o número e tente de novo.</p>}
            {cepStatus === "erro" && <p className="mt-2" style={{ color: C.danger }}>Não conseguimos checar agora. Tente de novo mais tarde.</p>}
          </div>
          <div>
            <TrilhaAoVivo altura={230} />
            <p className="mt-2 text-center" style={{ fontFamily: F.mono, fontSize: 12, color: C.inkSoft }}>
              ↑ assim você acompanha o passeio, em tempo real
            </p>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section className="px-5 md:px-10 py-12" style={{ background: C.white }}>
        <div className="max-w-5xl mx-auto">
          <h2 style={{ fontFamily: F.display, fontSize: 30, color: C.brand, fontWeight: 700 }}>Serviços do bairro</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {DEMO.servicos.map((s) => (
              <div key={s.id} className="rounded-2xl p-5 flex flex-col"
                style={{ background: C.paper, border: `1px solid ${C.mint}`, opacity: s.ativo ? 1 : 0.92 }}>
                <div className="flex items-center justify-between">
                  <div className="text-3xl">{s.icone}</div>
                  {!s.ativo && <Selo tom="amber">EM PROJETO 🚧</Selo>}
                </div>
                <h3 className="mt-3 font-bold" style={{ fontFamily: F.display, fontSize: 18 }}>{s.nome}</h3>
                <p className="mt-1 flex-1" style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.5 }}>{s.descricao}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span style={{ fontFamily: F.mono, color: C.brand, fontWeight: 700 }}>
                    {s.ativo ? brl(s.preco_centavos) : "diária a definir"}
                  </span>
                  {s.ativo ? (
                    <Link href={`/reservar/${s.id}`} className="px-4 py-2 rounded-xl font-semibold"
                      style={{ background: C.amber, color: C.brandDeep }}>Reservar</Link>
                  ) : avisado[s.id] ? (
                    <span className="text-sm font-semibold" style={{ color: C.brand }}>Você será avisado ✓</span>
                  ) : (
                    <Btn cheio={false} tom="brand" className="!px-4 !py-2"
                      onClick={() => setAvisado((a) => ({ ...a, [s.id]: true }))}>Quero ser avisado</Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS DE ASSINATURA */}
      <section className="px-5 md:px-10 py-12 max-w-5xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 30, color: C.brand, fontWeight: 700 }}>Assine e esqueça a agenda</h2>
            <p style={{ color: C.inkSoft, marginTop: 4 }}>
              Passeios fixos toda semana, sempre com o mesmo passeador. Pause nas férias quando quiser.
            </p>
          </div>
          <Selo tom="amber">CANCELE QUANDO QUISER</Selo>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {DEMO.planos.map((p) => {
            const base = DEMO.servicos.find((s) => s.id === "passeio_30").preco_centavos;
            const mensal = precoPlanoMensal(base, p.vezesSemana, p.descontoPct);
            return (
              <div key={p.id} className="rounded-2xl p-6 flex flex-col relative"
                style={{
                  background: p.destaque ? C.brand : C.white,
                  border: p.destaque ? `2px solid ${C.amber}` : `1px solid ${C.mint}`,
                }}>
                {p.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: C.amber, color: C.brandDeep, fontFamily: F.mono }}>MAIS ESCOLHIDO</span>
                )}
                <div className="font-bold" style={{ fontFamily: F.display, fontSize: 20, color: p.destaque ? C.paper : C.ink }}>
                  {p.nome}
                </div>
                <div className="mt-1 text-sm" style={{ color: p.destaque ? C.mint : C.inkSoft }}>
                  {p.vezesSemana}x por semana · {p.frase}
                </div>
                <div className="mt-4">
                  <span style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: p.destaque ? C.amberSoft : C.brand }}>
                    {brl(mensal)}
                  </span>
                  <span className="text-sm" style={{ color: p.destaque ? C.mint : C.inkSoft }}>/mês</span>
                </div>
                <div className="mt-1 text-xs" style={{ fontFamily: F.mono, color: p.destaque ? C.mint : C.inkSoft }}>
                  {p.descontoPct}% mais barato que o avulso · passeios de 30 min
                </div>
                <div className="mt-5">
                  <Link href={`/assinar/${p.id}`} className="block text-center px-5 py-3 rounded-xl font-semibold"
                    style={p.destaque
                      ? { background: C.amber, color: C.brandDeep }
                      : { border: `2px solid ${C.brand}`, color: C.brand }}>
                    Assinar {p.nome.replace("Plano ", "")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs" style={{ color: C.inkSoft }}>
          Prefere passeios de 60 min? Dá pra escolher na assinatura — o valor ajusta na hora, com o mesmo desconto.
        </p>
      </section>

      {/* PASSEADORES */}
      <section className="px-5 md:px-10 py-12 max-w-5xl mx-auto">
        <h2 style={{ fontFamily: F.display, fontSize: 30, color: C.brand, fontWeight: 700 }}>Quem passeia com seu cão</h2>
        <p style={{ color: C.inkSoft, marginTop: 4 }}>Todos verificados, entrevistados e avaliados a cada passeio.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {DEMO.passeadores.map((p) => (
            <div key={p.slug} className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.mint}` }}>
              <div className="flex items-center gap-3">
                <AvatarIni ini={p.ini} />
                <div>
                  <div className="font-bold">{p.nome_publico}</div>
                  <Estrelas n={p.nota_media} />
                </div>
              </div>
              <p className="mt-3" style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.5 }}>{p.bio}</p>
              <div className="mt-3" style={{ fontFamily: F.mono, fontSize: 12, color: C.brand }}>
                {p.total_passeios} passeios concluídos
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PROVA SOCIAL */}
      <section className="px-5 md:px-10 py-12" style={{ background: C.brand }}>
        <div className="max-w-5xl mx-auto">
          <h2 style={{ fontFamily: F.display, fontSize: 30, color: C.paper, fontWeight: 700 }}>Vizinhos que já confiam</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {DEMO.avaliacoes.map((a, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: C.brandDeep }}>
                <Estrelas n={a.nota} />
                <p className="mt-3" style={{ color: C.mint, fontSize: 14, lineHeight: 1.6 }}>&ldquo;{a.texto}&rdquo;</p>
                <div className="mt-4" style={{ fontFamily: F.mono, fontSize: 12, color: C.amberSoft }}>
                  {a.nome} · tutor(a) de {a.pet}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            style={{ background: C.amber }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.brandDeep }}>
                Indique um vizinho de prédio
              </div>
              <div style={{ color: C.brandDeep, opacity: 0.85, fontSize: 14 }}>Vocês dois ganham R$ 15 no próximo serviço.</div>
            </div>
            <Link href="/minha-conta" className="px-5 py-3 rounded-xl font-semibold"
              style={{ background: C.brand, color: C.paper }}>Pegar meu link</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
