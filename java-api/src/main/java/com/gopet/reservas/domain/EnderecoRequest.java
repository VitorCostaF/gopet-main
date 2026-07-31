package com.gopet.reservas.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EnderecoRequest(
        @NotBlank(message = "CEP inválido.")
        @Pattern(regexp = "\\d{5}-?\\d{3}", message = "CEP inválido.")
        String cep,

        @NotBlank(message = "Informe o número do endereço.")
        String numero,

        String instrucoes
) {
}
