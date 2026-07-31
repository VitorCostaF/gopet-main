package com.gopet.reservas.infra;

import com.gopet.reservas.domain.ReservaIdempotenteException;
import com.gopet.reservas.domain.ReservaStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** Persiste a reserva via API REST do Supabase (PostgREST), com a service role key. */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "supabase", matchIfMissing = true)
public class SupabaseReservaStore implements ReservaStore {

    private final RestClient restClient = RestClient.create();
    private final String url;
    private final String serviceRoleKey;

    public SupabaseReservaStore(@Value("${supabase.url:}") String url,
                                 @Value("${supabase.service-role-key:}") String serviceRoleKey) {
        this.url = url;
        this.serviceRoleKey = serviceRoleKey;
    }

    @Override
    public boolean configurado() {
        return url != null && !url.isBlank() && serviceRoleKey != null && !serviceRoleKey.isBlank();
    }

    @Override
    public void inserir(Map<String, Object> reserva) {
        try {
            restClient.post()
                    .uri(url + "/rest/v1/reservas")
                    .headers(h -> {
                        h.set("apikey", serviceRoleKey);
                        h.setBearerAuth(serviceRoleKey);
                        h.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .body(reserva)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.Conflict e) {
            throw new ReservaIdempotenteException();
        }
    }
}
