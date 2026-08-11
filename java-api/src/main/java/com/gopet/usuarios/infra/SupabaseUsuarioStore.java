package com.gopet.usuarios.infra;

import com.gopet.usuarios.domain.UsuarioStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Persiste o cadastro do tutor via API REST do Supabase (PostgREST), com a service role key. */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "supabase", matchIfMissing = true)
public class SupabaseUsuarioStore implements UsuarioStore {

    private final RestClient restClient = RestClient.create();
    private final String url;
    private final String serviceRoleKey;

    public SupabaseUsuarioStore(@Value("${supabase.url:}") String url,
                                 @Value("${supabase.service-role-key:}") String serviceRoleKey) {
        this.url = url;
        this.serviceRoleKey = serviceRoleKey;
    }

    @Override
    public boolean configurado() {
        return url != null && !url.isBlank() && serviceRoleKey != null && !serviceRoleKey.isBlank();
    }

    @Override
    public Optional<Map<String, Object>> buscarPorId(String id) {
        List<Map<String, Object>> resultado = restClient.get()
                .uri(url + "/rest/v1/perfis?id=eq.{id}&deleted_at=is.null&select=*", id)
                .headers(this::autenticar)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        return resultado == null || resultado.isEmpty() ? Optional.empty() : Optional.of(resultado.get(0));
    }

    @Override
    public void salvar(Map<String, Object> usuario) {
        restClient.post()
                .uri(url + "/rest/v1/perfis?on_conflict=id")
                .headers(h -> {
                    autenticar(h);
                    h.set("Prefer", "resolution=merge-duplicates,return=minimal");
                    h.setContentType(MediaType.APPLICATION_JSON);
                })
                .body(usuario)
                .retrieve()
                .toBodilessEntity();
    }

    private void autenticar(org.springframework.http.HttpHeaders h) {
        h.set("apikey", serviceRoleKey);
        h.setBearerAuth(serviceRoleKey);
    }
}
