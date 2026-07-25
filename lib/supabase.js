// lib/supabase.js — cliente único (browser) + modo demo
// Sem env vars, o app roda 100% com dados de demonstração (DEMO_MODE=true).
import { createBrowserClient } from "@supabase/ssr";

export const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client = null;
export function supabase() {
  if (DEMO_MODE) return null;
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _client;
}

// ── Dados de demonstração (usados quando DEMO_MODE) ────────────
export const DEMO = {
  servicos: [
    { id: "passeio_30", nome: "Passeio 30 min", descricao: "Volta pelo quarteirão ou praça mais próxima. Ideal pra rotina diária.", preco_centavos: 3500, ativo: true, icone: "🦮" },
    { id: "passeio_60", nome: "Passeio 60 min", descricao: "Trajeto completo até o Parque Lina e Paulo Raia, com socialização.", preco_centavos: 5500, ativo: true, icone: "🌳" },
    { id: "creche_dia", nome: "Creche (dia)", descricao: "Dia inteiro de brincadeira supervisionada. Leva e traz opcional.", preco_centavos: 9000, ativo: true, icone: "🏡" },
    { id: "hospedagem_pernoite", nome: "Hospedagem", descricao: "Pernoite com câmera ao vivo pra você ver até a soneca. Estamos preparando com todo carinho.", preco_centavos: null, ativo: false, icone: "🌙" },
  ],
  // Planos de assinatura de passeios (cobrança mensal, cartão)
  planos: [
    { id: "leve", nome: "Plano Leve", vezesSemana: 2, descontoPct: 10, frase: "Pra quem trabalha híbrido e precisa de reforço." },
    { id: "rotina", nome: "Plano Rotina", vezesSemana: 3, descontoPct: 15, destaque: true, frase: "O queridinho dos prédios do Jabaquara." },
    { id: "total", nome: "Plano Total", vezesSemana: 5, descontoPct: 20, frase: "Passeio todo dia útil, sempre com o mesmo passeador." },
  ],
  passeadores: [
    { slug: "ana-beatriz", nome_publico: "Ana Beatriz", ini: "AB", nota_media: 4.9, total_passeios: 312, bio: "3 anos passeando pelos quarteirões do Jabaquara. Especialista em cães ansiosos." },
    { slug: "carlos-mendes", nome_publico: "Carlos Mendes", ini: "CM", nota_media: 4.8, total_passeios: 187, bio: "Educador físico, adora cães grandes e trilhas longas até o parque." },
    { slug: "juliana-prado", nome_publico: "Juliana Prado", ini: "JP", nota_media: 5.0, total_passeios: 96, bio: "Veterinária em formação. Atenção redobrada com filhotes e idosos." },
  ],
  avaliacoes: [
    { nome: "Camila R.", pet: "Thor", nota: 5, texto: "Recebo as fotos durante o passeio e vejo o trajeto no mapa. Nunca mais fiquei ansiosa no trabalho." },
    { nome: "Renato F.", pet: "Mel", nota: 5, texto: "A ficha de portaria resolveu minha vida — o porteiro libera sem eu precisar descer." },
    { nome: "Patrícia L.", pet: "Bolinha", nota: 5, texto: "Uso o pacote 3x por semana. Mesmo passeador sempre, a Bolinha já o ama." },
  ],
  coberturaPrefixos: ["043"],
  horarios: ["07:30", "08:30", "12:00", "16:30", "18:00"],
};

export const brl = (centavos) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Preço mensal de um plano: vezes/semana × ~4,33 semanas, com desconto, arredondado p/ R$ inteiro
export const precoPlanoMensal = (precoAvulsoCentavos, vezesSemana, descontoPct) => {
  const bruto = precoAvulsoCentavos * vezesSemana * 4.33;
  return Math.round((bruto * (1 - descontoPct / 100)) / 100) * 100;
};
