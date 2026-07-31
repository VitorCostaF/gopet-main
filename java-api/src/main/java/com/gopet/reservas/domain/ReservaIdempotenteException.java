package com.gopet.reservas.domain;

/** Sinaliza que já existe uma reserva com a mesma Idempotency-Key (idx_reservas_idem). */
public class ReservaIdempotenteException extends RuntimeException {
}
