package com.gopet.whatsapp.domain;

import jakarta.validation.constraints.NotBlank;

public record ConfirmacaoReservaRequest(
        @NotBlank String servico,
        @NotBlank String dia,
        @NotBlank String hora,
        @NotBlank String cep,
        @NotBlank String numero,
        @NotBlank String whatsapp
) {
}
