# GO PET · MVP (Fase 1)

Site público + checkout + painel do tutor, conforme a spec `spec-dogwalking-jabaquara.md`.
Roda em **modo demo** sem nenhuma configuração; com as contas configuradas, passa a persistir dados reais.

## Rodar agora (modo demo)
```bash
npm install
npm run dev        # http://localhost:3000
```

## Ligar as contas reais (quando tiver as credenciais)
1. **Supabase** — crie o projeto, rode `supabase/schema.sql` no SQL Editor e crie os buckets `fotos-pets` e `fotos-passeios` (leitura pública). Copie URL e chaves para `.env.local` (modelo em `.env.example`).
2. **Gateway de pagamento** — crie a conta (Asaas/Pagar.me/Stripe), troque `PAGAMENTO_PROVIDER` e implemente o case correspondente em `lib/pagamentos.js` (a interface já está pronta). Aponte o webhook do gateway para `/api/webhooks/pagamento`.
3. **Deploy** — importe o repositório na Vercel e configure as mesmas variáveis lá.

> ⚠️ Segurança: `SUPABASE_SERVICE_ROLE_KEY` e chaves de gateway são segredos de servidor.
> Nunca as coloque em variáveis `NEXT_PUBLIC_*`, em commits ou em conversas.

## Estrutura
```
app/
  page.js                      # home pública (SEO, CEP, serviços, passeadores)
  reservar/[slug]/page.js      # checkout 3 etapas (Pix/cartão)
  minha-conta/page.js          # painel do tutor (agenda, relatórios, ficha de portaria)
  api/reservas/route.js        # POST cria reserva + cobrança (idempotente)
  api/webhooks/pagamento/route.js
components/ui.js               # identidade GO PET + TrilhaAoVivo
lib/supabase.js                # cliente + modo demo
lib/pagamentos.js              # adaptador de pagamento (mock → gateway real)
supabase/schema.sql            # schema Fase 1 completo com RLS
```

## Próximos passos (ordem sugerida)
- [ ] Autenticação de tutores (Supabase Auth) e vínculo `tutor_id` nas reservas
- [ ] Agenda real de disponibilidade (`GET /api/disponibilidade`)
- [ ] Painel simplificado do passeador (relatório de passeio — fluxo 5.1 da spec)
- [ ] Programa de indicação com link único
- [ ] Fase 2: app React Native (caminhada ao vivo com GPS real)
