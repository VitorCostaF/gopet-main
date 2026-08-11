package com.gopet.usuarios.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gopet.reservas.domain.EnderecoRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UsuarioRequest(
        @NotBlank(message = "Informe seu nome.")
        String nome,

        @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "E-mail inválido.")
        String email,

        @NotNull(message = "Informe o endereço completo.")
        @Valid
        EnderecoRequest endereco,

        // Usado só como fallback quando não há token Auth0 autenticado (modo demo/sem Auth0
        // configurado) — com Auth0 ativo, o id real vem do "sub" do access token validado (ver
        // SecurityConfig e UsuarioController), nunca deste campo.
        @JsonProperty("tutor_id") String tutorId
) {
}
