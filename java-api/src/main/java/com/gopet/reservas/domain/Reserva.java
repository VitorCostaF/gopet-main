package com.gopet.reservas.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Reserva(
        String id,
        String servico,
        String dia,
        String hora,
        @JsonProperty("dois_pets") boolean doisPets,
        EnderecoRequest endereco,
        String status,
        @JsonProperty("preco_total_centavos") int precoTotalCentavos,
        String whatsapp
) {
}
