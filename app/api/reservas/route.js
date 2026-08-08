// app/api/reservas/route.js — POST /api/reservas
// Fase atual: valida, calcula preço no servidor, cobra via adaptador (mock),
// e persiste no Supabase quando SUPABASE_SERVICE_ROLE_KEY existir; caso
// contrário responde em modo demo (sem persistência).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarCobranca } from "@/lib/pagamentos";

const PRECOS = { passeio_30: 3500, passeio_60: 5500, creche_dia: 9000 }; // hospedagem: em projeto
const COBERTURA = ["043"];

function erro(status, code, message) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return erro(400, "VALIDATION_ERROR", "JSON inválido."); }

  const idem = req.headers.get("Idempotency-Key");
  if (!idem) return erro(400, "VALIDATION_ERROR", "Header Idempotency-Key é obrigatório.");

  const { servico, dia, hora, dois_pets, endereco, pagamento } = body || {};

  // ── Validações (preço SEMPRE do servidor) ────────────────────
  if (!PRECOS[servico]) return erro(400, "VALIDATION_ERROR", "Serviço inválido ou indisponível.");
  if (!hora || !dia) return erro(400, "VALIDATION_ERROR", "Escolha data e horário.");
  const cepLimpo = String(endereco?.cep || "").replace(/\D/g, "");
  if (cepLimpo.length !== 8) return erro(400, "VALIDATION_ERROR", "CEP inválido.");
  if (!COBERTURA.some((p) => cepLimpo.startsWith(p)))
    return erro(422, "FORA_DA_COBERTURA", "Ainda não atendemos esse CEP.");
  if (!endereco?.numero) return erro(400, "VALIDATION_ERROR", "Informe o número do endereço.");
  if (!["pix", "cartao"].includes(pagamento?.metodo))
    return erro(400, "VALIDATION_ERROR", "Método de pagamento inválido.");

  const total = Math.round(PRECOS[servico] * (dois_pets ? 1.6 : 1));

  // ── Cobrança via adaptador ───────────────────────────────────
  let cobranca;
  try {
    cobranca = await criarCobranca({
      valorCentavos: total,
      metodo: pagamento.metodo,
      tokenCartao: pagamento.token_cartao,
      referencia: idem,
      descricao: `GO PET · ${servico} · ${dia} ${hora}`,
    });
  } catch {
    return erro(502, "PAYMENT_GATEWAY_ERROR", "Tivemos um problema com o pagamento. Tente novamente.");
  }
  if (cobranca.status === "recusado")
    return erro(402, "PAYMENT_DECLINED", "Cartão recusado pelo banco emissor. Tente outro cartão ou Pix.");

  const status = cobranca.status === "aprovado" ? "confirmada" : "pendente_pagamento";
  const reserva = {
    id: crypto.randomUUID(),
    servico, dia, hora, dois_pets: !!dois_pets,
    endereco: { cep: cepLimpo, numero: endereco.numero, instrucoes: endereco.instrucoes || "" },
    status,
    preco_total_centavos: total,
    pagamento_id: cobranca.id,
    pagamento_metodo: pagamento.metodo,
  };

  // ── Persistência (só com service role configurada) ───────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && srk) {
    try {
      const admin = createClient(url, srk, { auth: { persistSession: false } });
      // ⚠️ Rota aparentemente sem uso hoje — o checkout (app/reservar/[slug]/page.js) chama
      // POST /reservas direto no java-api, que já valida o Auth0 e resolve o tutor_id real a
      // partir do token (ver java-api SecurityConfig/ReservaController). Aqui o tutor_id ainda
      // vem cru do corpo, sem validação — não usar sem revisar antes.
      await admin.from("reservas").insert({
        id: reserva.id,
        tutor_id: body.tutor_id ?? null,
        servico,
        inicio: new Date().toISOString(), // TODO: converter dia+hora reais no fechamento da agenda
        endereco: reserva.endereco,
        status,
        preco_total_centavos: total,
        pagamento_id: cobranca.id,
        pagamento_metodo: pagamento.metodo,
        idempotency_key: idem,
      });
    } catch (e) {
      // Conflito de idempotência: devolve sucesso equivalente (não duplica cobrança)
      if (String(e?.message || "").includes("idx_reservas_idem"))
        return NextResponse.json({ reserva, pix: cobranca.pix ?? null });
      return erro(500, "DB_ERROR", "Não conseguimos salvar sua reserva. Nosso time já foi avisado.");
    }
  }

  return NextResponse.json({ reserva, pix: cobranca.pix ?? null }, { status: 201 });
}
