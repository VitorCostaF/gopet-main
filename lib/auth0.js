// lib/auth0.js — cliente Auth0 (server-only). Só existe quando as credenciais estão
// configuradas (AUTH0_DOMAIN/AUTH0_CLIENT_ID/AUTH0_CLIENT_SECRET/AUTH0_SECRET, ver
// .env.example). Sem elas, o app roda em modo demo (ver DEMO_MODE em lib/auth.js): sessão fake
// em localStorage, sem depender de um tenant Auth0 configurado.
//
// Não importe este arquivo de um componente "use client" — @auth0/nextjs-auth0/server usa APIs
// só de servidor. Componentes client usam lib/auth.js (useUser do pacote /client).
import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const AUTH0_CONFIGURADO = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET
);

// AUTH0_AUDIENCE identifica a API do gopet-java-api cadastrada no Auth0 (Applications > APIs).
// Precisa ser IGUAL ao AUTH0_AUDIENCE configurado em java-api/.env.example — é o mesmo valor
// dos dois lados: o Next pede o access token com essa audience, o java-api confere que o token
// tem essa audience (ver java-api SecurityConfig.java).
export const auth0 = AUTH0_CONFIGURADO
  ? new Auth0Client({
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: "openid profile email",
      },
    })
  : null;
