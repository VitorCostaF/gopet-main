"use client";
// app/minha-conta/pets/page.js — lista os pets do tutor logado; um tutor pode ter mais de um
// (ver POST /pets no java-api). Cada pet cadastrado aqui fica disponível pra vincular numa
// reserva (ver app/reservar/[slug]/page.js).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, F, Btn, Selo } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { listarPets } from "@/lib/javaApi";

const PORTE_LABEL = { PEQUENO: "Pequeno", MEDIO: "Médio", GRANDE: "Grande" };

export default function MeusPets() {
  const router = useRouter();
  const { user, carregando: carregandoSessao } = useSession();
  const [pets, setPets] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!carregandoSessao && !user) router.replace("/entrar?next=/minha-conta/pets");
  }, [carregandoSessao, user, router]);

  useEffect(() => {
    if (!user) return;
    listarPets(user.id).then(setPets).catch((e) => setErro(e.message));
  }, [user]);

  if (carregandoSessao || !user) {
    return <main className="max-w-2xl mx-auto px-5 py-16 text-center" style={{ color: C.inkSoft }}>Verificando sua conta…</main>;
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: F.display, fontSize: 28, color: C.brand, fontWeight: 700 }}>Meus pets</h1>
        <Link href="/minha-conta/pets/novo"><Btn tom="brand" className="!py-2">+ Cadastrar pet</Btn></Link>
      </div>

      {erro && <p className="mt-4 text-sm font-semibold" style={{ color: C.danger }}>{erro}</p>}

      {pets === null && !erro && <p className="mt-6 text-sm" style={{ color: C.inkSoft }}>Carregando…</p>}

      {pets && pets.length === 0 && (
        <div className="mt-6 rounded-2xl p-8 text-center" style={{ background: C.white, border: `1px dashed ${C.mint}` }}>
          <div className="text-3xl">🐾</div>
          <p className="mt-2" style={{ color: C.inkSoft }}>Você ainda não cadastrou nenhum pet.</p>
          <div className="mt-4"><Link href="/minha-conta/pets/novo"><Btn tom="brand">Cadastrar primeiro pet</Btn></Link></div>
        </div>
      )}

      {pets && pets.length > 0 && (
        <div className="mt-6 grid gap-3">
          {pets.map((p) => (
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
    </main>
  );
}
