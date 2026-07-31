package com.gopet.whatsapp.infra;

import com.gopet.whatsapp.domain.WhatsappProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** Envia WhatsApp via Evolution API self-hospedada (https://github.com/EvolutionAPI/evolution-api). */
@Component
@ConditionalOnProperty(prefix = "whatsapp", name = "provider", havingValue = "evolution")
public class EvolutionApiWhatsappProvider implements WhatsappProvider {

    private final RestClient restClient = RestClient.create();
    private final String baseUrl;
    private final String instancia;
    private final String apiKey;

    public EvolutionApiWhatsappProvider(@Value("${evolution.base-url}") String baseUrl,
                                         @Value("${evolution.instance}") String instancia,
                                         @Value("${evolution.api-key}") String apiKey) {
        this.baseUrl = baseUrl;
        this.instancia = instancia;
        this.apiKey = apiKey;
    }

    @Override
    public void enviarTexto(String telefoneE164, String mensagem) {
        if (baseUrl == null || baseUrl.isBlank() || instancia == null || instancia.isBlank()
                || apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "Evolution API não configurada (EVOLUTION_BASE_URL/EVOLUTION_INSTANCE/EVOLUTION_API_KEY ausentes).");
        }
        String url = "%s/message/sendText/%s".formatted(semBarraFinal(baseUrl), instancia);
        restClient.post()
                .uri(url)
                .headers(headers -> {
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.set("apikey", apiKey);
                })
                .body(Map.of("number", telefoneE164, "text", mensagem))
                .retrieve()
                .toBodilessEntity();
    }

    private static String semBarraFinal(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
