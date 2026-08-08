package com.gopet.reservas.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gopet.reservas.domain.validation.Telefone;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReservaRequest(
        @NotBlank(message = "Serviço inválido ou indisponível.")
        String servico,

        @NotBlank(message = "Escolha data e horário.")
        String dia,

        @NotBlank(message = "Escolha data e horário.")
        String hora,

        @JsonProperty("dois_pets") boolean doisPets,

        @NotNull(message = "Informe o endereço completo.")
        @Valid
        EnderecoRequest endereco,

        @Telefone
        String whatsapp,

        // Usado só como fallback quando não há token Auth0 autenticado (modo demo/sem Auth0
        // configurado) — com Auth0 ativo, o tutor_id real vem do "sub" do access token validado
        // (ver SecurityConfig e ReservaController), nunca deste campo.
        @JsonProperty("tutor_id") String tutorId
) {
}
