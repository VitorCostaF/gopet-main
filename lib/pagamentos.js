// lib/pagamentos.js — adaptador de pagamento (server-side)
// Interface única; troque o provider quando as credenciais do gateway chegarem.
// Providers previstos: 'mock' (agora) | 'asaas' | 'pagarme' | 'stripe'
// Segredos SEMPRE via variáveis de ambiente — nunca no código.

const PROVIDER = process.env.PAGAMENTO_PROVIDER || "mock";

/**
 * Cria uma cobrança.
 * @param {{ valorCentavos:number, metodo:'pix'|'cartao', tokenCartao?:string, referencia:string, descricao:string }} p
 * @returns {Promise<{ id:string, status:'aprovado'|'pendente'|'recusado', pix?:{qr_code:string, copia_cola:string, expira_em:string} }>}
 */
export async function criarCobranca(p) {
  switch (PROVIDER) {
    case "mock":
      if (p.metodo === "pix") {
        return {
          id: "mockpix_" + p.referencia,
          status: "pendente",
          pix: {
            qr_code: "MOCK-QR",
            copia_cola: "00020126MOCKPIXCOPIAECOLA" + p.referencia,
            expira_em: new Date(Date.now() + 30 * 60000).toISOString(),
          },
        };
      }
      // cartão mock: aprova tudo, recusa se token terminar em '0' (p/ testar erro)
      return {
        id: "mockcard_" + p.referencia,
        status: p.tokenCartao?.endsWith("0") ? "recusado" : "aprovado",
      };

    // case "asaas": { /* implementar com process.env.ASAAS_API_KEY */ }
    // case "pagarme": { /* implementar com process.env.PAGARME_SECRET */ }
    default:
      throw new Error(`Provider de pagamento não implementado: ${PROVIDER}`);
  }
}

/**
 * Valida a assinatura de um webhook do gateway.
 * No mock, aceita o header 'x-mock-signature: ok'.
 */
export function validarWebhook(headers, _rawBody) {
  if (PROVIDER === "mock") return headers.get("x-mock-signature") === "ok";
  // Implementar HMAC do gateway real aqui.
  return false;
}

/** Estorna uma cobrança (janela de cancelamento ≥12h). */
export async function estornar(cobrancaId, valorCentavos) {
  if (PROVIDER === "mock") return { id: cobrancaId, estornado: valorCentavos };
  throw new Error("Estorno não implementado para " + PROVIDER);
}
