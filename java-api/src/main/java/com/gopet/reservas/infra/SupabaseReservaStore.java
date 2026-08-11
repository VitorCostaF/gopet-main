package com.gopet.reservas.infra;

import com.gopet.reservas.domain.ReservaIdempotenteException;
import com.gopet.reservas.domain.ReservaStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Override
    public void vincularPets(String reservaId, List<String> petIds) {
        List<Map<String, String>> vinculos = petIds.stream()
                .map(petId -> Map.of("reserva_id", reservaId, "pet_id", petId))
                .collect(Collectors.toList());

        restClient.post()
                .uri(url + "/rest/v1/reserva_pets")
                .headers(h -> {
                    autenticar(h);
                    h.set("Prefer", "return=minimal");
                    h.setContentType(MediaType.APPLICATION_JSON);
                })
                .body(vinculos)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listarPorTutor(String tutorId) {
        List<Map<String, Object>> resultado = restClient.get()
                .uri(url + "/rest/v1/reservas?tutor_id=eq.{tutorId}&deleted_at=is.null"
                        + "&select=id,servico,inicio,endereco,status,preco_total_centavos,whatsapp,reserva_pets(pet_id)"
                        + "&order=inicio.desc", tutorId)
                .headers(this::autenticar)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        if (resultado == null) return List.of();

        for (Map<String, Object> reserva : resultado) {
            Object vinculosRaw = reserva.remove("reserva_pets");
            List<String> petIds = new ArrayList<>();
            if (vinculosRaw instanceof List<?> vinculos) {
                for (Object v : vinculos) {
                    if (v instanceof Map<?, ?> m) petIds.add(String.valueOf(((Map<String, Object>) m).get("pet_id")));
                }
            }
            reserva.put("pet_ids", petIds);
        }
        return resultado;
    }

    private void autenticar(HttpHeaders h) {
        h.set("apikey", serviceRoleKey);
        h.setBearerAuth(serviceRoleKey);
    }
}
