// middleware.js — monta as rotas do Auth0 (/auth/login, /auth/logout, /auth/callback,
// /auth/profile, /auth/access-token, etc.), que o SDK expõe automaticamente.
// Sem Auth0 configurado (modo demo, ver DEMO_MODE em lib/auth.js), deixa toda requisição
// passar direto — nada muda no app, e essas rotas simplesmente não existem.
import { NextResponse } from "next/server";
import { auth0, AUTH0_CONFIGURADO } from "@/lib/auth0";

export async function middleware(request) {
  if (!AUTH0_CONFIGURADO) return NextResponse.next();
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
