// app/api/assinaturas/route.js — POST /api/assinaturas
// Cria a assinatura de passeios: valida, calcula mensalidade no servidor,
// cria a cobrança recorrente via adaptador (mock) e persiste quando o
// Supabase estiver configurado.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarCobranca } from "@/lib/pagamentos";

const PRECOS = { passeio_30: 3500, passeio_60: 5500 };
const PLANOS = {
  leve: { vezesSemana: 2, descontoPct: 10 },
  rotina: { vezesSemana: 3, descontoPct: 15 },
  total: { vezesSemana: 5, descontoPct: 20 },
};

const mensalidade = (precoAvulso, vezes, desconto) =>
  Math.round((precoAvulso * vezes * 4.33 * (1 - desconto / 100)) / 100) * 100;

function erro(status, code, message) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return erro(400, "VALIDATION_ERROR", "JSON inválido."); }

  const idem = req.headers.get("Idempotency-Key");
  if (!idem) return erro(400, "VALIDATION_ERROR", "Header Idempotency-Key é obrigatório.");

  const { plano, servico, dias_semana, horario, pagamento } = body || {};
  const cfg = PLANOS[plano];
  if (!cfg) return erro(400, "VALIDATION_ERROR", "Plano inválido.");
  if (!PRECOS[servico]) return erro(400, "VALIDATION_ERROR", "Serviço inválido para assinatura.");
  if (!Array.isArray(dias_semana) || dias_semana.length !== cfg.vezesSemana ||
      dias_semana.some((d) => d < 0 || d > 6))
    return erro(400, "VALIDATION_ERROR", `Escolha exatamente ${cfg.vezesSemana} dias da semana.`);
  if (!horario) return erro(400, "VALIDATION_ERROR", "Escolha um horário fixo.");
  if (pagamento?.metodo !== "cartao")
    return erro(400, "VALIDATION_ERROR", "Assinaturas são cobradas no cartão (Pix disponível só no avulso).");

  const valorMensal = mensalidade(PRECOS[servico], cfg.vezesSemana, cfg.descontoPct);

  let cobranca;
  try {
    cobranca = await criarCobranca({
      valorCentavos: valorMensal,
      metodo: "cartao",
      tokenCartao: pagamento.token_cartao,
      referencia: idem,
      descricao: `GO PET · assinatura ${plano} · ${servico}`,
    });
  } catch {
    return erro(502, "PAYMENT_GATEWAY_ERROR", "Tivemos um problema com o pagamento. Tente novamente.");
  }
  if (cobranca.status === "recusado")
    return erro(402, "PAYMENT_DECLINED", "Cartão recusado pelo banco emissor. Tente outro cartão.");

  const assinatura = {
    id: crypto.randomUUID(),
    plano, servico,
    dias_semana, horario,
    valor_mensal_centavos: valorMensal,
    status: "ativa",
    assinatura_gateway_id: cobranca.id,
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && srk) {
    try {
      const admin = createClient(url, srk, { auth: { persistSession: false } });
      await admin.from("recorrencias").insert({
        id: assinatura.id,
        tutor_id: body.tutor_id ?? null, // produção: sessão autenticada
        servico,
        dias_semana,
        horario,
        valor_mensal_centavos: valorMensal,
        status: "ativa",
        assinatura_gateway_id: cobranca.id,
        idempotency_key: idem,
      });
      // Job diário (a implementar) gera as reservas dos próximos 30 dias a partir daqui.
    } catch (e) {
      if (String(e?.message || "").includes("idx_recorrencias_idem"))
        return NextResponse.json({ assinatura });
      return erro(500, "DB_ERROR", "Não conseguimos salvar sua assinatura. Nosso time já foi avisado.");
    }
  }

  return NextResponse.json({ assinatura }, { status: 201 });
}
