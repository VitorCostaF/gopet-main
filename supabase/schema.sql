-- ═══════════════════════════════════════════════════════════════
-- GO PET · Schema Fase 1 (MVP) · PostgreSQL / Supabase
-- Rodar no SQL Editor do Supabase. Idempotente onde possível.
-- Convenções da spec: dinheiro em centavos (int), UTC, soft delete.
-- ═══════════════════════════════════════════════════════════════

-- ── Tipos ──────────────────────────────────────────────────────
do $$ begin
  create type papel as enum ('tutor','passeador','admin');
  create type porte_pet as enum ('P','M','G');
  create type convivio as enum ('sim','nao','nao_sei');
  create type tipo_servico as enum ('passeio_30','passeio_60','creche_dia','hospedagem_pernoite');
  create type status_reserva as enum ('pendente_pagamento','confirmada','em_execucao','concluida','cancelada_tutor','cancelada_operacao','expirada');
  create type status_passeador as enum ('em_analise','pendente_documentos','aprovado','suspenso','desligado');
exception when duplicate_object then null; end $$;

-- ── Perfis (espelha auth.users) ────────────────────────────────
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  role papel not null default 'tutor',
  nome text not null default '',
  telefone text,
  cep_padrao text,
  endereco_padrao jsonb,
  indicado_por uuid references perfis(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- trigger: cria perfil ao registrar usuário
create or replace function criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome',''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function criar_perfil();

-- ── Pets ───────────────────────────────────────────────────────
create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references perfis(id),
  nome text not null check (char_length(nome) between 1 and 40),
  raca text,
  porte porte_pet not null,
  peso_kg numeric check (peso_kg between 0.5 and 90),
  convive_com_caes convivio not null default 'nao_sei',
  temperamento text,
  restricoes_saude text,
  alimentacao text,
  instrucoes_acesso text check (char_length(instrucoes_acesso) <= 500),
  veterinario_ref jsonb,           -- { nome, telefone }
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_pets_tutor on pets(tutor_id) where deleted_at is null;

-- ── Passeadores ────────────────────────────────────────────────
create table if not exists passeadores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid unique references perfis(id),
  slug text unique not null,
  nome_publico text not null,
  bio text,
  foto_url text,
  video_url text,
  status status_passeador not null default 'em_analise',
  disponibilidade jsonb not null default '{}',  -- { "1": ["07:30","08:30"], ... } dia_semana -> janelas
  nota_media numeric not null default 0,
  total_passeios int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ── Catálogo de serviços/preços (editável pelo admin) ─────────
create table if not exists servicos (
  id tipo_servico primary key,
  nome text not null,
  descricao text,
  preco_centavos int not null check (preco_centavos > 0),
  preco_segundo_pet_pct int not null default 60,  -- % do preço p/ 2º pet
  ativo boolean not null default true
);
insert into servicos (id, nome, descricao, preco_centavos) values
  ('passeio_30','Passeio 30 min','Volta pelo quarteirão ou praça mais próxima.',3500),
  ('passeio_60','Passeio 60 min','Trajeto completo até o parque, com socialização.',5500),
  ('creche_dia','Creche (dia)','Dia inteiro de brincadeira supervisionada.',9000),
  ('hospedagem_pernoite','Hospedagem','EM PROJETO — diária ainda a definir.',1)  -- placeholder: inativo, preço a definir pelo admin
on conflict (id) do nothing;
update servicos set ativo = false where id = 'hospedagem_pernoite';

-- ── Área de cobertura (prefixos de CEP atendidos) ─────────────
create table if not exists cobertura_ceps (
  prefixo text primary key,          -- ex.: '043'
  rotulo text
);
insert into cobertura_ceps values ('043','Jabaquara e entorno') on conflict do nothing;

-- ── Reservas ───────────────────────────────────────────────────
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references perfis(id),
  passeador_id uuid references passeadores(id),
  recorrencia_id uuid,
  servico tipo_servico not null references servicos(id),
  inicio timestamptz not null,
  fim timestamptz,
  endereco jsonb not null,           -- snapshot { cep, numero, complemento, instrucoes }
  status status_reserva not null default 'pendente_pagamento',
  preco_total_centavos int not null check (preco_total_centavos >= 0),
  taxa_cancelamento_centavos int not null default 0,
  pagamento_id text,
  pagamento_metodo text,             -- 'pix' | 'cartao'
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists idx_reservas_idem on reservas(idempotency_key) where idempotency_key is not null;
create index if not exists idx_reservas_tutor on reservas(tutor_id, inicio desc);
create index if not exists idx_reservas_passeador_dia on reservas(passeador_id, inicio);

create table if not exists reserva_pets (
  reserva_id uuid references reservas(id) on delete cascade,
  pet_id uuid references pets(id),
  primary key (reserva_id, pet_id)
);

-- ── Execução do passeio (Fase 1: relatório simplificado) ──────
create table if not exists passeios (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid unique not null references reservas(id),
  checkin_em timestamptz,
  checkout_em timestamptz,
  distancia_m int,
  eventos jsonb not null default '[]',   -- [{tipo:'xixi'|'coco'|'agua', em:ts}]
  observacoes text,
  fotos text[] not null default '{}',    -- paths no storage
  created_at timestamptz not null default now()
);

-- ── Avaliações ─────────────────────────────────────────────────
create table if not exists avaliacoes (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid unique not null references reservas(id),
  tutor_id uuid not null references perfis(id),
  passeador_id uuid not null references passeadores(id),
  nota int not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 500),
  publica boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function atualizar_nota_passeador() returns trigger
language plpgsql as $$
begin
  update passeadores p set
    nota_media = (select round(avg(nota)::numeric,1) from avaliacoes a where a.passeador_id = p.id),
    total_passeios = (select count(*) from reservas r where r.passeador_id = p.id and r.status = 'concluida')
  where p.id = new.passeador_id;
  return new;
end $$;
drop trigger if exists trg_nota on avaliacoes;
create trigger trg_nota after insert on avaliacoes for each row execute function atualizar_nota_passeador();

-- ── Indicações / cupons ────────────────────────────────────────
create table if not exists indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references perfis(id),
  codigo text unique not null,
  credito_centavos int not null default 1500,
  usos int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Webhooks (idempotência do gateway) ─────────────────────────
create table if not exists webhook_events (
  event_id text primary key,
  tipo text not null,
  payload jsonb not null,
  processado_em timestamptz not null default now()
);

-- ── Recorrências (planos de assinatura de passeios) ────────────
do $$ begin
  create type status_recorrencia as enum ('ativa','pausada','suspensa','cancelada');
exception when duplicate_object then null; end $$;

create table if not exists recorrencias (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid references perfis(id),
  passeador_fixo_id uuid references passeadores(id),
  servico tipo_servico not null,
  dias_semana int[] not null check (array_length(dias_semana,1) between 1 and 5),
  horario time not null,
  valor_mensal_centavos int not null check (valor_mensal_centavos > 0),
  status status_recorrencia not null default 'ativa',
  pausa_inicio date,
  pausa_fim date,
  assinatura_gateway_id text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists idx_recorrencias_idem on recorrencias(idempotency_key) where idempotency_key is not null;
create index if not exists idx_recorrencias_tutor on recorrencias(tutor_id) where deleted_at is null;

alter table recorrencias enable row level security;
create policy recorrencias_sel on recorrencias for select using (auth.uid() = tutor_id);

-- ── Auditoria de status ────────────────────────────────────────
create table if not exists historico_status (
  id bigint generated always as identity primary key,
  reserva_id uuid not null references reservas(id),
  de text, para text not null,
  por uuid, motivo text,
  em timestamptz not null default now()
);

-- ═══ ROW LEVEL SECURITY ════════════════════════════════════════
alter table perfis enable row level security;
alter table pets enable row level security;
alter table reservas enable row level security;
alter table reserva_pets enable row level security;
alter table passeios enable row level security;
alter table avaliacoes enable row level security;
alter table passeadores enable row level security;
alter table servicos enable row level security;
alter table cobertura_ceps enable row level security;

-- perfis: dono lê/edita o próprio
create policy perfil_proprio on perfis for select using (auth.uid() = id);
create policy perfil_editar on perfis for update using (auth.uid() = id);

-- pets: tutor gerencia os próprios
create policy pets_sel on pets for select using (auth.uid() = tutor_id);
create policy pets_ins on pets for insert with check (auth.uid() = tutor_id);
create policy pets_upd on pets for update using (auth.uid() = tutor_id);

-- reservas: tutor vê as próprias; escrita via API (service role)
create policy reservas_sel on reservas for select using (auth.uid() = tutor_id);
create policy rpets_sel on reserva_pets for select
  using (exists (select 1 from reservas r where r.id = reserva_id and r.tutor_id = auth.uid()));
create policy passeios_sel on passeios for select
  using (exists (select 1 from reservas r where r.id = reserva_id and r.tutor_id = auth.uid()));

-- avaliações: tutor cria a da própria reserva concluída
create policy aval_ins on avaliacoes for insert with check (
  auth.uid() = tutor_id and exists (
    select 1 from reservas r where r.id = reserva_id and r.tutor_id = auth.uid() and r.status = 'concluida')
);
create policy aval_sel on avaliacoes for select using (publica or auth.uid() = tutor_id);

-- leitura pública: catálogo, cobertura e passeadores aprovados
create policy servicos_pub on servicos for select using (true);
create policy cobertura_pub on cobertura_ceps for select using (true);
create policy passeadores_pub on passeadores for select using (status = 'aprovado' and deleted_at is null);

-- ═══ STORAGE (rodar depois de criar os buckets no painel) ══════
-- Buckets sugeridos: fotos-pets (público-leitura), fotos-passeios (público-leitura)
-- Política exemplo (fotos-pets): upload apenas pelo dono, leitura pública.
