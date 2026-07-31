package com.gopet.reservas.domain;

import java.util.Map;

/** Porta única de persistência de reservas — troque a implementação (infra) quando o backend de dados mudar. */
public interface ReservaStore {

    boolean configurado();

    /** @throws ReservaIdempotenteException se já existe reserva com essa idempotency_key. */
    void inserir(Map<String, Object> reserva);
}
