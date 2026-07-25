// app/api/webhooks/pagamento/route.js — confirmações do gateway
// Mock agora; ao integrar o gateway real, validarWebhook passa a checar HMAC.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validarWebhook } from "@/lib/pagamentos";

export async function POST(req) {
  const raw = await req.text();
  if (!validarWebhook(req.headers, raw)) {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE" } }, { status: 401 });
  }

  let evento;
  try { evento = JSON.parse(raw); } catch {
    return NextResponse.json({ error: { code: "BAD_PAYLOAD" } }, { status: 400 });
  }
  const { event_id, tipo, pagamento_id } = evento || {};
  if (!event_id || !tipo) {
    return NextResponse.json({ error: { code: "BAD_PAYLOAD" } }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && srk) {
    const admin = createClient(url, srk, { auth: { persistSession: false } });

    // Idempotência: evento já processado responde 200 sem efeitos
    const { error: dup } = await admin.from("webhook_events").insert({ event_id, tipo, payload: evento });
    if (dup) return NextResponse.json({ ok: true, duplicado: true });

    if (tipo === "pix.paid" && pagamento_id) {
      await admin.from("reservas")
        .update({ status: "confirmada" })
        .eq("pagamento_id", pagamento_id)
        .eq("status", "pendente_pagamento");
    }
    // Demais eventos (charge.refused, chargeback.created…) entram aqui conforme o gateway.
  }

  return NextResponse.json({ ok: true });
}
