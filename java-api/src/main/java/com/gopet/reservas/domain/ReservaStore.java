package com.gopet.reservas.domain;

import java.util.List;
import java.util.Map;

/** Porta única de persistência de reservas — troque a implementação (infra) quando o backend de dados mudar. */
public interface ReservaStore {

    boolean configurado();

    /** @throws ReservaIdempotenteException se já existe reserva com essa idempotency_key. */
    void inserir(Map<String, Object> reserva);

    /** Vincula os pets levados na reserva (tabela `reserva_pets`) — chamar depois de {@link #inserir}. */
    void vincularPets(String reservaId, List<String> petIds);

    /** Reservas do tutor, mais recentes primeiro; cada linha inclui "pet_ids" (List&lt;String&gt;). */
    List<Map<String, Object>> listarPorTutor(String tutorId);
}
