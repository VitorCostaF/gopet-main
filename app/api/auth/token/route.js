// app/api/auth/token/route.js — devolve o access token do Auth0 da sessão atual, pra
// autenticar chamadas do browser ao java-api (ver lib/javaApi.js tokenJavaApi() e
// app/reservar/[slug]/page.js). Fica numa rota própria (em vez de usar a /auth/access-token do
// SDK direto) pra controlar exatamente o shape da resposta e o modo demo.
// Sem Auth0 configurado (modo demo), devolve accessToken: null — o java-api também não exige
// token nesse caso (ver SecurityConfig.java lá).
import { NextResponse } from "next/server";
import { auth0, AUTH0_CONFIGURADO } from "@/lib/auth0";

export async function GET() {
  if (!AUTH0_CONFIGURADO) return NextResponse.json({ accessToken: null });
  try {
    const { token: accessToken } = await auth0.getAccessToken();
    return NextResponse.json({ accessToken });
  } catch {
    // Sem sessão válida (usuário não logado, token expirado sem refresh possível, etc.)
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }
}
