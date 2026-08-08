// app/auth/callback/route.js — troca o código do login OAuth (Google) por uma sessão Supabase.
// Pra onde o Google redireciona de volta depois do usuário autorizar (ver lib/auth.js).
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/minha-conta";

  if (code) {
    const supabase = supabaseServer();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
