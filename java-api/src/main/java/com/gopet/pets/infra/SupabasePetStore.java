package com.gopet.pets.infra;

import com.gopet.pets.domain.PetStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/** Persiste pets via API REST do Supabase (PostgREST), com a service role key. */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "supabase", matchIfMissing = true)
public class SupabasePetStore implements PetStore {

    private final RestClient restClient = RestClient.create();
    private final String url;
    private final String serviceRoleKey;

    public SupabasePetStore(@Value("${supabase.url:}") String url,
                             @Value("${supabase.service-role-key:}") String serviceRoleKey) {
        this.url = url;
        this.serviceRoleKey = serviceRoleKey;
    }

    @Override
    public boolean configurado() {
        return url != null && !url.isBlank() && serviceRoleKey != null && !serviceRoleKey.isBlank();
    }

    @Override
    public List<Map<String, Object>> listarPorTutor(String tutorId) {
        List<Map<String, Object>> resultado = restClient.get()
                .uri(url + "/rest/v1/pets?tutor_id=eq.{tutorId}&deleted_at=is.null&select=*&order=created_at.desc", tutorId)
                .headers(this::autenticar)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        return resultado == null ? List.of() : resultado;
    }

    @Override
    public void inserir(Map<String, Object> pet) {
        restClient.post()
                .uri(url + "/rest/v1/pets")
                .headers(h -> {
                    autenticar(h);
                    h.set("Prefer", "return=minimal");
                    h.setContentType(MediaType.APPLICATION_JSON);
                })
                .body(pet)
                .retrieve()
                .toBodilessEntity();
    }

    private void autenticar(HttpHeaders h) {
        h.set("apikey", serviceRoleKey);
        h.setBearerAuth(serviceRoleKey);
    }
}
