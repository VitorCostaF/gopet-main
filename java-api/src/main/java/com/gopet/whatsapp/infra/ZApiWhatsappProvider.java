package com.gopet.whatsapp.infra;

import com.gopet.whatsapp.domain.WhatsappProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
@ConditionalOnProperty(prefix = "whatsapp", name = "provider", havingValue = "zapi", matchIfMissing = true)
public class ZApiWhatsappProvider implements WhatsappProvider {

    private final RestClient restClient = RestClient.create();
    private final String instanceId;
    private final String token;
    private final String clientToken;

    public ZApiWhatsappProvider(@Value("${zapi.instance-id}") String instanceId,
                                @Value("${zapi.token}") String token,
                                @Value("${zapi.client-token}") String clientToken) {
        this.instanceId = instanceId;
        this.token = token;
        this.clientToken = clientToken;
    }

    @Override
    public void enviarTexto(String telefoneE164, String mensagem) {
        if (instanceId == null || instanceId.isBlank() || token == null || token.isBlank()) {
            throw new IllegalStateException("Z-API não configurada (ZAPI_INSTANCE_ID/ZAPI_TOKEN ausentes).");
        }
        String url = "https://api.z-api.io/instances/%s/token/%s/send-text".formatted(instanceId, token);
        restClient.post()
                .uri(url)
                .headers(headers -> {
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    if (clientToken != null && !clientToken.isBlank()) {
                        headers.set("Client-Token", clientToken);
                    }
                })
                .body(Map.of("phone", telefoneE164, "message", mensagem))
                .retrieve()
                .toBodilessEntity();
    }
}
