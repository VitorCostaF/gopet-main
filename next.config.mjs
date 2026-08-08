/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Flag pública (não-secreta) inlined no bundle do client — deixa o client saber se o Auth0
    // está configurado sem expor AUTH0_DOMAIN/CLIENT_SECRET etc. Fonte da verdade real fica em
    // lib/auth0.js (server-only). Ver DEMO_MODE em lib/auth.js.
    AUTH0_CONFIGURADO: String(
      Boolean(
        process.env.AUTH0_DOMAIN &&
          process.env.AUTH0_CLIENT_ID &&
          process.env.AUTH0_CLIENT_SECRET &&
          process.env.AUTH0_SECRET
      )
    ),
  },
};

export default nextConfig;
