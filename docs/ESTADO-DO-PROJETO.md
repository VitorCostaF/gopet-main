# GO PET · Estado do projeto

> Documento gerado para dar contexto completo a quem está entrando no projeto agora.
> Baseado no commit `77a0931` (branch `develop`, 2026-08-08) + a integração de autenticação via
> Auth0 feita em seguida (ainda não commitada nesse momento — ver seção 4.4/5.1.1). Se o código
> já andou desde então, use este documento como mapa geral e confira o código-fonte para os
> detalhes finos.

---

## 1. O que é o projeto

**GO PET** é um MVP de dog walking/creche/hospedagem no bairro do Jabaquara (Zona Sul de SP).
O produto: site público com captação de leads (checagem de CEP), checkout de reserva avulsa e
assinatura de passeios recorrentes, e um painel do tutor ("Minha conta") com acompanhamento
"ao vivo" do passeio (hoje simulado).

O README (`README.md`) referencia uma spec `spec-dogwalking-jabaquara.md` como fonte da verdade
do produto — **esse arquivo não está no repositório**. Se alguém tiver esse documento, vale
adicionar em `docs/` ou linkar; hoje a única documentação de produto é o próprio código e este
arquivo.

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14.2.35 (App Router), React 18, Tailwind CSS 3 |
| Backend  | Java 21 + Spring Boot 3.3.4 (Maven), projeto separado em `java-api/` |
| Autenticação | Auth0 (`@auth0/nextjs-auth0` v4) — e-mail/senha + Google via Universal Login, com **modo demo** sem Auth0 configurado |
| Dados do tutor | Supabase (só Postgres — não é mais usado pra autenticação, ver 4.4) |
| Persistência de reservas | Supabase REST (PostgREST) *ou* Postgres direto via JDBC — troca por env var |
| Histórico de consultas de CEP | MySQL (via Flyway, migração manual) |
| WhatsApp | Z-API (padrão) ou Evolution API self-hosted — troca por env var |
| Geolocalização de CEP | Cadeia (chain of responsibility): Geoapify → BrasilAPI → Nominatim |
| Pagamento | Adaptador próprio (`lib/pagamentos.js`), hoje só implementado em modo `mock` |

Existem **dois repositórios de código dentro do mesmo repo git**: o Next.js na raiz e o
`java-api/` como projeto Maven independente, sem nenhuma dependência de build entre os dois —
rodam como dois processos separados que conversam por HTTP.

---

## 2. Como rodar localmente

### Frontend (Next.js)
```bash
npm install
npm run dev        # http://localhost:3000
```
Sem nenhuma env var configurada, o app roda **100% em modo demo** (`DEMO_MODE`, ver 4.4): dados
fake em memória, sessão de login simulada via `localStorage`, sem Auth0/Supabase reais.

### Backend (java-api)
```bash
cd java-api
mvn spring-boot:run     # http://localhost:8081
```
Precisa das env vars documentadas em `java-api/.env.example` exportadas no shell (Spring **não**
carrega `.env` sozinho — é preciso exportar manualmente ou configurar no orquestrador). Sem
nenhuma env var, a API sobe mas roda em modo degradado:
- `POST /reservas` não exige token (sem `AUTH0_DOMAIN`, ver 5.1.1) e não persiste nada
  (`SupabaseReservaStore.configurado()` retorna `false`);
- confirmação por WhatsApp falha silenciosamente (best-effort, não derruba a reserva);
- `GET /cobertura` funciona (a cadeia de providers de geolocalização tem fallback), mas sem
  gravar histórico no MySQL.

Para o fluxo de reserva funcionar de ponta a ponta local, os dois processos (Next na 3000 e
java-api na 8081) precisam estar rodando ao mesmo tempo — o frontend chama a API Java direto do
navegador (ver seção 4.5).

### Banco de dados
- `supabase/schema.sql` — schema completo do Postgres/Supabase (rodar no SQL Editor do
  projeto Supabase). Cria tipos, tabelas, triggers e RLS.
- `java-api/src/main/resources/db/migration/V1__create_consultas_cep_table.sql` — migração
  Flyway do MySQL (histórico de CEP). Só roda via `mvn flyway:migrate` explícito dentro de
  `java-api/`, **nunca automaticamente no boot** (`spring.flyway.enabled=false`).

---

## 3. Arquitetura — visão geral

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│   Next.js (porta 3000)  │        │  java-api / Spring (porta 8081)│
│                          │        │                                │
│  app/page.js  (home)     │──GET /cobertura──▶│ CoberturaController          │
│  app/reservar/[slug]     │──POST /reservas───▶│ ReservaController            │
│  app/assinar/[plano]     │                    │   ├─ valida + calcula preço │
│  app/entrar (login)      │                    │   ├─ verifica CEP (chain)   │
│  app/minha-conta (painel)│                    │   ├─ persiste (Supabase REST│
│  app/api/* (rotas Next,  │                    │   │   ou Postgres JDBC)     │
│    ver observação 7.1)   │                    │   └─ dispara WhatsApp       │
│                          │                    │       (Z-API/Evolution)     │
└───────────┬──────────────┘        └──────────────┬───────────────┘
            │                                       │
            │ Supabase Auth (login) e RLS            │ Supabase REST (service role)
            ▼                                       ▼
     ┌────────────────────────────────────────────────────┐
     │      Supabase (Postgres) — schema em supabase/schema.sql │
     └────────────────────────────────────────────────────┘
                                                       │
                                            ┌───────────▼───────────┐
                                            │  MySQL (Flyway)        │
                                            │  histórico de CEP      │
                                            └────────────────────────┘
```

Ponto importante: **o navegador fala direto com o `java-api`** (não passa pelo Next como proxy).
`lib/javaApi.js` monta a URL a partir de `NEXT_PUBLIC_JAVA_API_URL` (pública, client-side). Isso
explica por que o CORS do `java-api` (`WebConfig.java`) precisa liberar explicitamente a origem
do frontend.

---

## 4. Frontend (Next.js) — detalhado

### 4.1 Estrutura de rotas (`app/`)

| Rota | Arquivo | Client/Server | O que faz |
|---|---|---|---|
| `/` | `app/page.js` | Client | Home pública: hero com checagem de CEP, catálogo de serviços, planos de assinatura, lista de passeadores, prova social |
| `/entrar` | `app/entrar/page.js` | Client | Login/cadastro (e-mail+senha ou Google), com `?next=` para voltar ao fluxo de origem |
| `/auth/callback` | `app/auth/callback/route.js` | Server (Route Handler) | Troca o `code` do OAuth do Google por sessão Supabase e redireciona pro `next` |
| `/reservar/[slug]` | `app/reservar/[slug]/page.js` | Client | Checkout em 3 etapas (data/horário → endereço → confirmação); **exige login** |
| `/assinar/[plano]` | `app/assinar/[plano]/page.js` | Client | Assinatura de plano recorrente (cartão), chama `POST /api/assinaturas` (rota Next, não o java-api) |
| `/minha-conta` | `app/minha-conta/page.js` | Client | Painel do tutor: passeio ao vivo, agenda, perfil do pet, ficha de portaria |
| `/api/reservas` | `app/api/reservas/route.js` | Server | **Legado — ver observação 7.1** |
| `/api/assinaturas` | `app/api/assinaturas/route.js` | Server | Cria assinatura recorrente (ainda em uso, chamado por `/assinar/[plano]`) |
| `/api/webhooks/pagamento` | `app/api/webhooks/pagamento/route.js` | Server | Recebe confirmação assíncrona do gateway de pagamento (mock hoje) |

### 4.2 Design system (`components/ui.js`)
Um arquivo único concentra a identidade visual: paleta `C`, fontes `F` (Bricolage Grotesque,
Instrument Sans, Space Mono — carregadas via Google Fonts no `layout.js`), e componentes base:
`Btn`, `Selo`, `AvatarIni`, `Estrelas`, `Logo` e `TrilhaAoVivo`.

`TrilhaAoVivo` é a peça de assinatura da marca: um SVG com um path fixo (`TRAJETO`) animado via
`requestAnimationFrame` (loop de 24s), mostrando uma "bolinha" (foto do pet ou emoji 🐕)
percorrendo o trajeto. Respeita `prefers-reduced-motion` (trava em 62% do trajeto e não anima,
de propósito, para acessibilidade). Usada na home (`app/page.js`) e no painel
(`app/minha-conta/page.js`, em dois lugares: card "ao vivo" e modal de relatório de passeio).

`components/NavConta.js` é o item do header que troca entre "Entrar" e "Minha conta"/"Sair"
conforme a sessão (usa `useSession()` de `lib/auth.js`).

### 4.3 Dados demo (`lib/supabase.js`)
`DEMO` é um objeto com todos os dados fake do catálogo/vitrine: serviços (`passeio_30`,
`passeio_60`, `creche_dia`, `hospedagem_pernoite` — este último **inativo**, "EM PROJETO"),
planos de assinatura (Leve/Rotina/Total), passeadores, avaliações, prefixos de CEP atendidos
(`043`) e horários disponíveis. Hoje esse arquivo só guarda dados + helpers de preço — a
autenticação (que também tinha `DEMO_MODE` aqui antes) mudou pra `lib/auth.js` (ver 4.4).
O Supabase em si continua sendo só o banco de dados (Postgres), acessado server-side com a
service role key — não existe mais nenhum cliente Supabase no browser.

Funções utilitárias: `brl()` (formata centavos em R$) e `precoPlanoMensal()` (calcula
mensalidade: `preço avulso × vezes/semana × 4.33 semanas × desconto`).

### 4.4 Autenticação — Auth0 (`lib/auth.js`, `lib/auth0.js`, `middleware.js`)
A autenticação (e-mail/senha + Google) é feita pelo **Auth0** via `@auth0/nextjs-auth0` v4, não
mais pelo Supabase Auth (Supabase virou só banco de dados, ver 4.3). Sem credenciais Auth0
configuradas (`AUTH0_DOMAIN`/`AUTH0_CLIENT_ID`/`AUTH0_CLIENT_SECRET`/`AUTH0_SECRET`), o app cai
em **modo demo**, mesma convenção de antes.

- **`lib/auth0.js`** (server-only): instancia o `Auth0Client` só quando as 4 env vars acima
  estão presentes; exporta `AUTH0_CONFIGURADO`. Pede `audience`/`scope` fixos na configuração
  (`authorizationParameters`), pra sempre sair com um access token JWT válido pro java-api.
- **`middleware.js`** (raiz): chama `auth0.middleware(request)`, que monta e responde sozinho
  as rotas `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile`,
  `/auth/access-token` — não existem arquivos de rota pra elas, é tudo resolvido no middleware
  antes do roteamento normal do Next. Sem Auth0 configurado, o middleware só deixa passar
  (`NextResponse.next()`), então essas rotas simplesmente não existem em modo demo.
- **`next.config.mjs`**: expõe `AUTH0_CONFIGURADO` como variável `env` (inlined no bundle do
  client, `true`/`false`) — é assim que componentes `"use client"` sabem qual modo usar sem
  precisar de `NEXT_PUBLIC_*` nem vazar as credenciais reais.
- **`lib/auth.js`** (client): `useSession()` chama `useUser()` do Auth0 incondicionalmente
  (regra dos hooks) mas só usa o resultado fora do modo demo; em demo, observa o mesmo
  `localStorage` (`gopet_demo_session`) de antes. Exporta também os *links* pra Universal Login:
  `linkEntrar()`, `linkCriarConta()` (`screen_hint=signup`), `linkGoogle()`
  (`connection=google-oauth2`) — todos aceitam um `next` (pra onde volta depois de autenticar,
  via `returnTo`).
- **Não existe formulário de senha custom em modo real** — `app/entrar/page.js` (real) só
  mostra links/botões pra Universal Login do Auth0 (hospedada, fora do app); é o Auth0 quem
  valida credenciais, guarda hash de senha, faz "esqueci minha senha" etc. Em **modo demo**,
  `app/entrar/page.js` mostra o formulário fake de sempre (qualquer e-mail/senha "funciona").
- **Login obrigatório para reservar** (mantido): em `app/reservar/[slug]/page.js`, um
  `useEffect` redireciona pra `/entrar?next=/reservar/{slug}` se não houver `user`.
- **`tutor_id` agora É validado no backend** (ver 5.1 e observação 7.2, que foi endereçada): o
  checkout busca o access token (`tokenJavaApi()` em `lib/javaApi.js`, via
  `app/api/auth/token/route.js`) e manda `Authorization: Bearer <token>` no `POST /reservas`; o
  java-api valida esse token e usa o "sub" dele como tutor_id real, ignorando o que vier no
  corpo (que só serve de fallback em modo demo/sem Auth0).
- `/assinar/[plano]` **continua sem** essa checagem de login (não mudou nesta integração).

### 4.5 Integração com o java-api (`lib/javaApi.js`)
Client HTTP fininho: monta `fetch(NEXT_PUBLIC_JAVA_API_URL + path)` com
`Content-Type: application/json`. Dois usos hoje:
- `GET /cobertura?cep=` — chamado na home e no checkout pra checar se o CEP é atendido. Público,
  não exige token (precisa funcionar antes do login).
- `POST /reservas` — chamado no passo 3 do checkout (`app/reservar/[slug]/page.js`), com header
  `Idempotency-Key` (UUID gerado no client), `Authorization: Bearer <access token do Auth0>`
  quando disponível (`tokenJavaApi()`), e body incluindo `tutor_id` (fallback pra modo demo).

### 4.6 Pagamento (`lib/pagamentos.js`)
Adaptador server-side com interface pronta (`criarCobranca`, `validarWebhook`, `estornar`) e
**apenas o provider `mock` implementado**. Pix mock devolve QR fake; cartão mock aprova tudo,
exceto token terminado em `0` (usado propositalmente pra testar o caminho de recusa). Trocar de
provider é: mudar `PAGAMENTO_PROVIDER` e implementar o `case` correspondente — os `case`s de
Asaas/Pagar.me estão comentados como placeholder.

**Nota importante**: apesar do adaptador de pagamento existir e ser usado nas rotas Next
(`/api/reservas`, `/api/assinaturas`), o fluxo de reserva avulsa **atual** (via java-api) não
passa por cobrança nenhuma — ele confirma a reserva e dispara WhatsApp, sem cobrar (ver
observação 7.1 sobre esse desalinhamento). Só a assinatura (`/api/assinaturas`, rota Next) ainda
usa `criarCobranca`.

### 4.7 Página "Minha conta" (`app/minha-conta/page.js`)
Painel 100% em estado local (`useState`), com comentários `// TODO Supabase:` marcando onde
trocar por consultas reais quando o Supabase estiver configurado:
- Upload de foto do pet: hoje só `FileReader` + `<img>` local, sem upload real pro bucket
  `fotos-pets` (mencionado no README, bucket ainda não referenciado em código).
- Cancelamento de reserva: só remove do array local (`setReservas`), sem chamar nenhuma API —
  o comentário aponta `POST /api/reservas/{id}/cancelar`, que **não existe** ainda (nem no
  java-api, nem como rota Next).
- Ficha de portaria: modal estático com dados fixos (Ana Beatriz, CPF mascarado).
- Abas "Hoje" / "Agenda" / "Perfil da Frida" — nome do pet ("Frida") está hardcoded, não vem de
  nenhum dado de sessão.

---

## 5. Backend `java-api` — detalhado

Projeto Maven independente (Java 21, Spring Boot 3.3.4), com pacotes organizados por
**feature** (não por camada técnica), cada um com `domain/`, `application/`, `controller/` e
`infra/` internos — arquitetura hexagonal/ports-and-adapters leve.

### 5.1 Pacote `reservas` — o core do MVP hoje

- **`domain`**: `Reserva` (record de saída), `ReservaRequest` (record de entrada, validado com
  Bean Validation — `@NotBlank`, `@Valid`, `@Telefone` customizado), `EnderecoRequest`,
  `ReservaStore` (porta/interface de persistência), `ReservaException` /
  `ReservaIdempotenteException` (erros de domínio), `ReservaResultado`.
- **`application/ReservaService`**: orquestra tudo — valida idempotency key, resolve preço
  (`PRECOS` hardcoded: `passeio_30=3500`, `passeio_60=5500`, `creche_dia=9000`, **em centavos,
  duplicado do frontend** — ver observação 7.3), valida CEP via `DistanciaCepService`, calcula
  total (+60% se 2 pets), monta a `Reserva`, **dispara a confirmação por WhatsApp
  best-effort** (não falha a reserva se o WhatsApp falhar), e por fim persiste via `ReservaStore`
  — só se `store.configurado()` for `true` (senão devolve a reserva "de mentirinha", sem salvar).
- **`controller/ReservaController`**: `POST /reservas`. Devolve `201` se é uma reserva nova,
  `200` se já existia (idempotência).
- **`controller/ApiExceptionHandler`**: `@RestControllerAdvice` global — traduz
  `ReservaException` e erros de `@Valid` em JSON padronizado `{ error: { code, message } }`.
- **`infra`**: duas implementações de `ReservaStore`, escolhidas por `RESERVA_STORE`
  (`@ConditionalOnProperty`):
  - `SupabaseReservaStore` (**padrão**): faz `POST` direto no PostgREST do Supabase
    (`{url}/rest/v1/reservas`) com a service role key. Detecta conflito de idempotência via
    `HttpClientErrorException.Conflict` (a constraint `idx_reservas_idem` do schema).
  - `PostgresReservaStore`: usa `JdbcClient` (Spring 3.2+) pra inserir direto via SQL, com um
    `INSERT` que casta pros tipos enum do Postgres (`::tipo_servico`, `::status_reserva`).
    Detecta idempotência via `DuplicateKeyException`. Só existe (`@ConditionalOnProperty`) quando
    `RESERVA_STORE=postgres`; o `DataSource`/`JdbcClient` desse modo vêm de
    `PostgresJdbcConfig`, que só é ativado na mesma condição.
  - `JavaApiApplication` **exclui** a auto-configuração padrão de DataSource/JDBC do Spring Boot
    justamente pra API subir sem exigir Postgres quando ninguém pediu esse store.

### 5.1.1 `config/SecurityConfig` — validação do access token do Auth0

`POST /reservas` exige um access token válido do Auth0 (Resource Server, via
`spring-boot-starter-oauth2-resource-server`) sempre que `AUTH0_DOMAIN`/`AUTH0_AUDIENCE`
estiverem configurados — isso fecha a brecha descrita na observação 7.2 original (tutor_id não
era validado): `ReservaController` extrai `@AuthenticationPrincipal Jwt jwt` e usa `jwt.getSubject()`
como tutor_id real, **sempre** sobrepondo o que vier no corpo da requisição.

- **Sem `AUTH0_DOMAIN` configurado**: `SecurityConfig` monta uma `SecurityFilterChain` que
  libera tudo (`permitAll()`) — comportamento idêntico ao de antes desta integração, então a API
  continua subindo e funcionando sem exigir Auth0 em dev/local. O bean `JwtDecoder` nem é criado
  nesse caso (evita uma chamada de rede desnecessária pra descoberta OIDC do Auth0).
- **Com `AUTH0_DOMAIN` configurado**: `GET /cobertura` continua público (precisa funcionar antes
  do login); `POST /reservas` exige token; o `JwtDecoder` valida emissor (issuer) **e** audience
  (`auth0.audience` — Spring por padrão só valida o issuer, a validação de audience foi
  adicionada manualmente via `JwtClaimValidator` + `DelegatingOAuth2TokenValidator`).
- CORS foi refatorado de `WebMvcConfigurer.addCorsMappings` (em `WebConfig`) pra um bean
  `CorsConfigurationSource` explícito, porque o Spring Security intercepta a requisição *antes*
  do Spring MVC — sem isso, o preflight (OPTIONS) e as respostas de erro (401/403) não sairiam
  com os headers de CORS corretos.
- Testes: `ReservaControllerTest` (sem Auth0 configurado, `@Import({SecurityConfig.class,
  WebConfig.class})` — precisa do import explícito porque `@WebMvcTest` não inclui
  `@Configuration` genéricas sozinho) e `ReservaControllerComAuth0ObrigatorioTest` (com
  `@TestPropertySource` setando `auth0.domain`/`auth0.audience` + `@MockBean JwtDecoder` pra não
  depender de rede/tenant real — o token é fabricado direto pelo post-processor
  `SecurityMockMvcRequestPostProcessors.jwt()`, sem passar pelo decoder de verdade).

### 5.2 Pacote `cobertura` — checagem de CEP atendido

- **`application/DistanciaCepService`**: recebe um CEP, busca coordenadas do CEP base da GO PET
  (`COBERTURA_CEP_BASE`) e do CEP consultado via `CepGeolocalizacaoProvider`, calcula distância
  pela fórmula de Haversine, compara com `COBERTURA_RAIO_KM`. Grava histórico no MySQL
  (best-effort, nunca derruba a resposta se falhar).
- **`infra/CepGeolocalizacaoProviderChain`** + **`CepGeolocalizacaoConfig`**: Chain of
  Responsibility — tenta **Geoapify → BrasilAPI → Nominatim**, nessa ordem, até um resolver o
  CEP. Cada provider é um bean independente e injetável isoladamente (útil em teste); o bean
  primário exposto é a cadeia inteira. Adicionar um novo provider = só mexer na lista em
  `CepGeolocalizacaoConfig`, sem tocar na classe da cadeia (OCP).
- **`infra/mysql/MySqlConsultaCepStore`**: grava cada consulta feita (CEP consultado, CEP base,
  distância, raio vigente, resultado) na tabela `consultas_cep` — só se `MYSQL_URL` estiver
  setada; senão `configurado()` retorna `false` e nada é gravado (mas `GET /cobertura` segue
  funcionando normalmente).
- **`controller/CoberturaController`**: `GET /cobertura?cep=` → `{ atende, distanciaKm, motivo }`.
  `motivo` vem preenchido (`CEP_INVALIDO` ou `CEP_NAO_ENCONTRADO`) quando não dá pra calcular.

### 5.3 Pacote `whatsapp` — confirmação de reserva

- **`application/ReservaConfirmacaoService`**: monta uma mensagem de texto fixa (template com
  serviço, dia, hora, CEP e número) e normaliza o telefone pro formato E.164 BR (prefixa `55` se
  necessário). Valida tamanho do número (10-11 dígitos); fora disso devolve
  `EnvioResponse.falha("WHATSAPP_INVALIDO")` sem lançar exceção — por isso o disparo nunca
  derruba a criação da reserva.
- **`domain/WhatsappProvider`**: porta única (`enviarTexto(telefoneE164, mensagem)`).
- **`infra`**: `ZApiWhatsappProvider` (padrão, `WHATSAPP_PROVIDER=zapi`) e
  `EvolutionApiWhatsappProvider` (`WHATSAPP_PROVIDER=evolution`, self-hosted), selecionados por
  `@ConditionalOnProperty`. Ambos lançam `IllegalStateException` se as credenciais não estiverem
  configuradas — esse erro é capturado no `ReservaConfirmacaoService` (`catch (Exception e)`) e
  vira só um `falha("PROVIDER_ERRO")` silencioso.
- **`controller/WhatsappController`**: `POST /whatsapp/reservas/confirmacao` — endpoint próprio,
  também chamável isoladamente (embora hoje só seja usado internamente pelo `ReservaService`).

### 5.4 Config transversal

- **`config/WebConfig`**: expõe o `CorsConfigurationSource` (liberado via `CORS_ALLOWED_ORIGINS`,
  padrão `http://localhost:3000`, métodos GET/POST/PUT/DELETE/OPTIONS, todos os headers) —
  consumido tanto pelo Spring Security (`SecurityConfig`) quanto, indiretamente, pelo Spring MVC.
- **`config/SecurityConfig`**: ver 5.1.1 — valida o access token do Auth0 no `POST /reservas`.
- **`application.yml`**: centraliza todas as env vars com valores-padrão via `${VAR:default}`.
  Log configurado para `com.gopet: DEBUG`, gravando em `logs/gopet-api.log` (ignorado no git,
  ver `java-api/.gitignore`).
- **Pastas vazias `java-api/src/main/java/com/gopet/infra/` e `.../pagamentos/`**: existem no
  disco mas sem nenhum arquivo dentro (e sem histórico no git — provavelmente resíduo de uma
  reorganização de pacotes). Não afetam o build; podem ser removidas com segurança.

### 5.5 Testes (`java-api/src/test`)

| Classe | Nº de testes | Cobre |
|---|---|---|
| `ReservaServiceTest` | 8 | Regras de negócio do `ReservaService` (preço, idempotência, cobertura, disparo de WhatsApp best-effort, tutor_id autenticado sobrepõe o do corpo) |
| `ReservaControllerTest` | 4 | Contrato HTTP do `POST /reservas` sem Auth0 configurado (status codes, validação) |
| `ReservaControllerComAuth0ObrigatorioTest` | 2 | Contrato HTTP com Auth0 configurado: 401 sem token, tutor_id vem do "sub" do token válido |
| `PostgresReservaStoreTest` | 3 | Insert via JDBC e tratamento de `DuplicateKeyException` |
| `DistanciaCepServiceTest` | 6 | Cálculo de distância, fallback de motivo, gravação de histórico |
| `MySqlConsultaCepStoreTest` | 3 | Persistência do histórico de CEP |
| `ReservaConfirmacaoServiceTest` | 4 | Validação de telefone, template de mensagem, falha silenciosa do provider |

Não há teste para `SupabaseReservaStore`, para os providers de geolocalização individuais
(Geoapify/BrasilAPI/Nominatim), nem para os providers de WhatsApp (Z-API/Evolution) — são as
integrações HTTP externas, testadas hoje só indiretamente/manualmente.

Rodar os testes: `cd java-api && mvn test`.

---

## 6. Banco de dados

### 6.1 Supabase/Postgres (`supabase/schema.sql`)
Schema completo da Fase 1, com RLS habilitado nas tabelas sensíveis. Principais tabelas:

- `perfis` — espelha `auth.users` do Supabase (1:1, criado automaticamente via trigger
  `on_auth_user_created` ao registrar um usuário), com `role` (tutor/passeador/admin). **Nota
  importante desde a migração pra Auth0** (ver 4.4): esse trigger só dispara pra usuários
  criados via Supabase Auth — usuários do Auth0 nunca entram em `auth.users`, então `perfis`
  fica sem linha correspondente e as políticas RLS baseadas em `auth.uid()` não têm como
  reconhecer um tutor autenticado via Auth0. Hoje isso não quebra nada em produção porque
  nenhuma tela lê/escreve `perfis`/`pets` via RLS ainda (tudo é mock ou passa pela service role
  key) — mas é uma decisão pendente antes de implementar qualquer leitura real dessas tabelas
  direto do browser (ver observação 7.2 e o item de "próximos passos" correspondente).
- `pets` — dados do pet (porte, temperamento, restrições de saúde, foto, instruções de acesso).
- `passeadores` — perfil público do passeador, disponibilidade em `jsonb`, nota média e total de
  passeios (atualizados via trigger `atualizar_nota_passeador` ao inserir avaliação).
- `servicos` — catálogo com preços em centavos (seed já incluso: os 4 serviços do `DEMO` do
  frontend, `hospedagem_pernoite` já inserido como inativo).
- `cobertura_ceps` — prefixos de CEP atendidos (seed: `043`, "Jabaquara e entorno") — **nota**:
  isso é uma tabela separada da lógica de distância do `java-api`, que usa CEP base + raio em km,
  não prefixos. Os dois mecanismos coexistem hoje sem estar unificados (ver observação 7.4).
- `reservas` — inclui `pagamento_id` marcado como "legado" no comentário do schema (cobrança na
  hora foi substituída pela confirmação via WhatsApp), `idempotency_key` com índice único
  parcial, `whatsapp` do tutor.
- `recorrencias` — assinaturas de planos recorrentes, com RLS (`recorrencias_sel`).
- `passeios`, `avaliacoes`, `indicacoes`, `webhook_events`, `historico_status` — suporte a
  execução do passeio, avaliação, indicação e auditoria.
- Políticas RLS: tutor só lê/edita os próprios dados; leitura pública liberada para
  `servicos`, `cobertura_ceps` e `passeadores` aprovados.
- Buckets de storage (`fotos-pets`, `fotos-passeios`) são mencionados em comentário mas
  **precisam ser criados manualmente no painel do Supabase** — não há script/migration para eles.

### 6.2 MySQL (Flyway, `java-api/`)
Só uma migração hoje: `V1__create_consultas_cep_table.sql`, cria `consultas_cep` (histórico de
cada `GET /cobertura`: CEP consultado, CEP base, distância, raio vigente, se atendeu, motivo).
Flyway roda **só manualmente** (`mvn flyway:migrate`), nunca no boot da aplicação.

---

## 7. Observações / inconsistências que vale o par conhecer

Essas não são bugs necessariamente — são pontos de atenção ou dívida técnica visível no estado
atual do código, úteis pra não perder tempo redescobrindo:

1. **`app/api/reservas/route.js` (rota Next) parece legado/órfã.** O checkout
   (`app/reservar/[slug]/page.js`) hoje chama `POST /reservas` **direto no java-api**
   (`javaApiFetch`), não mais `/api/reservas` do Next. A rota Next ainda existe, tem toda a lógica
   de cobrança via `lib/pagamentos.js` e persistência no Supabase, mas não achei nenhum client
   chamando ela hoje (busca por `/api/reservas` no código só aparece na própria definição da rota
   e num comentário TODO). Vale confirmar com o time se ela pode ser removida ou se ainda é usada
   por algum fluxo que não vi.

2. ~~**`tutor_id` não é validado no backend.**~~ **Resolvido.** O `java-api` agora exige um
   access token do Auth0 no `POST /reservas` (quando `AUTH0_DOMAIN` está configurado) e usa o
   "sub" do token — não mais o valor enviado no corpo — como tutor_id real (ver 4.4 e 5.1.1). Em
   modo demo/sem Auth0 configurado, o comportamento antigo (tutor_id cru do corpo) continua como
   fallback, já que não há como validar nada sem um provedor de identidade real.

3. **Preços duplicados em 3 lugares**: `lib/supabase.js` (`DEMO.servicos`), `app/api/reservas/route.js`
   (`PRECOS`), `app/api/assinaturas/route.js` (`PRECOS`) e `ReservaService.java` (`PRECOS`) — todos
   com os mesmos valores hardcoded (`3500`, `5500`, `9000`) em vez de uma fonte única. A tabela
   `servicos` do Supabase já tem esses preços — nenhum desses lugares consulta ela ainda.

4. **Cobertura de CEP calculada de duas formas diferentes**: o `java-api` (usado hoje pelo
   frontend) calcula distância geográfica real (Haversine) a partir de um CEP base + raio em km.
   O schema do Supabase tem uma tabela `cobertura_ceps` com prefixos (ex.: `043`), e a **rota Next
   legada** `/api/reservas` valida cobertura checando se o CEP começa com um desses prefixos
   (`COBERTURA` hardcoded como `["043"]`, nem consulta a tabela). São duas implementações
   paralelas do mesmo conceito.

5. **Cancelamento de reserva no painel é só front-end.** `app/minha-conta/page.js` remove a
   reserva do estado local sem chamar nenhuma API — nem o endpoint mencionado no comentário
   (`POST /api/reservas/{id}/cancelar`) existe ainda em lugar nenhum.

6. **`/assinar/[plano]` não exige login**, diferente de `/reservar/[slug]` que passou a exigir no
   commit mais recente. Provavelmente um descuido a alinhar.

7. **Pastas vazias no java-api**: `com/gopet/infra/` e `com/gopet/pagamentos/` existem no disco
   sem arquivos dentro (git não rastreia diretórios vazios). Resíduo de reorganização, seguro
   remover.

8. **Spec de produto referenciada no README não está no repo** (`spec-dogwalking-jabaquara.md`).

9. **Identidade Auth0 × RLS do Supabase ainda não conversam** (nova, desde a migração pra
   Auth0 — ver 4.4 e a nota em 6.1 sobre `perfis`). O Supabase virou só banco de dados; quem
   autentica é o Auth0. Isso significa que `auth.uid()` (usado nas políticas RLS de `perfis`,
   `pets`, `reservas` etc.) nunca vai bater com um usuário logado via Auth0. Hoje não trava nada
   porque nenhuma tela lê essas tabelas direto do browser via RLS (tudo é mock, ou passa pela
   service role key no servidor, que ignora RLS). Mas é uma decisão de arquitetura pendente:
   antes de implementar qualquer leitura real de `perfis`/`pets`/`reservas` direto do client
   (ex.: ligar `/minha-conta` a dados reais), alguém precisa decidir entre (a) todo acesso a
   dados do tutor passa por rotas server/java-api autenticadas com o token do Auth0 (ignorando
   RLS, sempre via service role) ou (b) sincronizar usuários do Auth0 pra uma tabela própria e
   trocar as políticas RLS de `auth.uid()` pra essa nova referência.

10. **AUTH0_AUDIENCE precisa ser cadastrado manualmente no Auth0 antes da validação de token
    funcionar.** Sem uma API cadastrada em Auth0 (Applications > APIs) com esse identifier, o
    Auth0 emite um access token **opaco** em vez de JWT — e `NimbusJwtDecoder` não consegue
    validar isso (vai dar erro ao decodificar). Ou seja: só configurar `AUTH0_DOMAIN` no java-api
    não é suficiente pra segurança funcionar; é preciso também ter criado a API no Auth0 e
    apontado `AUTH0_AUDIENCE` (nos dois `.env`, com o mesmo valor) pra esse identifier. Ver
    instruções em `.env.example` (raiz).

---

## 8. O que funciona de ponta a ponta hoje (com os dois serviços rodando)

- ✅ Home pública, checagem de CEP (via java-api + chain de geolocalização).
- ✅ Login/cadastro (demo ou Auth0 real, e-mail/senha + Google) — ver 4.4.
- ✅ Checkout de reserva avulsa **com login obrigatório**, criação via java-api com o access
  token do Auth0 (quando configurado, o java-api valida e usa o "sub" como tutor_id real —
  ver 5.1.1), disparo de WhatsApp best-effort, idempotência por header.
- ✅ Persistência da reserva — se `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (ou `RESERVA_STORE=postgres`
  + `DB_URL`) estiverem configuradas no java-api; senão fica em modo demo (não persiste).
- ⚠️ Assinatura de plano recorrente — cria via rota Next própria (`/api/assinaturas`), mock de
  pagamento, sem geração automática das reservas recorrentes (o comentário no código já aponta:
  "Job diário (a implementar) gera as reservas dos próximos 30 dias").
- ⚠️ Painel "Minha conta" — 100% estado local/mock; nenhuma leitura real do Supabase ainda,
  mesmo com Supabase configurado (os `TODO Supabase:` no código marcam onde entraria).
- ❌ Cancelamento de reserva real, upload de foto pro storage, ficha de portaria dinâmica,
  passeio ao vivo com dados reais (GPS) — tudo simulado/local hoje.

---

## 9. Próximos passos (do README + observações deste doc)

Do README (`README.md`), em ordem sugerida:
- [ ] Agenda real de disponibilidade (`GET /api/disponibilidade`)
- [ ] Painel simplificado do passeador (relatório de passeio)
- [ ] Programa de indicação com link único
- [ ] Fase 2: app React Native (caminhada ao vivo com GPS real)

Adicionais que valem discutir com o time, a partir do levantamento acima:
- Decidir o destino de `app/api/reservas/route.js` (remover ou voltar a usar) — hoje ele nem
  valida tutor_id como o java-api passou a fazer.
- Unificar a fonte de preços dos serviços (idealmente puxando da tabela `servicos`).
- Unificar a lógica de cobertura de CEP (hoje duplicada).
- ~~Adicionar validação de sessão/JWT no `POST /reservas` do java-api.~~ **Feito** (ver 4.4/5.1.1).
- Implementar `POST /reservas/{id}/cancelar` (front já assume que ele vai existir).
- Ligar `/minha-conta` a dados reais do Supabase (trocar os `TODO Supabase:`) — decidir antes
  a questão da observação 7.9 (identidade Auth0 × RLS).
- Exigir login em `/assinar/[plano]` também, se fizer sentido pro produto (observação 7.6).
- Configurar o tenant Auth0 de verdade (domínio, application, connections de e-mail/senha e
  Google, API/audience) — ver instruções passo a passo em `.env.example` (raiz).

---

## 10. Onde procurar cada coisa (mapa rápido de arquivos)

```
app/page.js                          → home pública
app/entrar/page.js                   → login/cadastro (Universal Login do Auth0, ou form demo)
app/api/auth/token/route.js          → devolve o access token da sessão pro client chamar o java-api
middleware.js                        → monta as rotas /auth/* do Auth0 (login/logout/callback/...)
app/reservar/[slug]/page.js          → checkout avulso (exige login)
app/assinar/[plano]/page.js          → assinatura recorrente
app/minha-conta/page.js              → painel do tutor (mock)
app/api/reservas/route.js            → rota Next legada (ver obs. 7.1)
app/api/assinaturas/route.js         → cria assinatura (em uso)
app/api/webhooks/pagamento/route.js  → webhook de pagamento (mock)
components/ui.js                     → design system + TrilhaAoVivo
components/NavConta.js               → header (Entrar/Minha conta)
lib/auth.js                          → sessão (demo ou Auth0, client-side)
lib/auth0.js                         → Auth0Client (server-only)
lib/supabase.js                      → dados DEMO + helpers de preço (não é mais auth)
lib/javaApi.js                       → client HTTP pro java-api (+ tokenJavaApi())
lib/pagamentos.js                    → adaptador de pagamento (mock)
next.config.mjs                      → expõe AUTH0_CONFIGURADO pro client
supabase/schema.sql                  → schema Postgres/Supabase completo

java-api/src/main/java/com/gopet/
  reservas/                          → criação de reserva (core do MVP)
  cobertura/                         → checagem de CEP atendido
  whatsapp/                          → confirmação via WhatsApp
  config/WebConfig.java              → CORS (CorsConfigurationSource)
  config/SecurityConfig.java         → valida o access token do Auth0 (ver 5.1.1)
  JavaApiApplication.java            → bootstrap (exclui auto-config JDBC por padrão)
java-api/src/main/resources/
  application.yml                    → todas as env vars, com defaults
  db/migration/V1__...sql            → migração Flyway (MySQL, manual)
java-api/src/test/                   → testes unitários (ver seção 5.5)
```
