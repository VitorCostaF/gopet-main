package com.gopet.pets.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PetRequest(
        @NotBlank(message = "Informe o nome do pet.")
        String nome,

        @NotNull(message = "Informe a idade do pet.")
        @Min(value = 0, message = "Idade inválida.")
        @Max(value = 30, message = "Idade inválida.")
        @JsonProperty("idade_anos") Integer idadeAnos,

        @NotNull(message = "Informe o porte do pet.")
        Porte porte,

        @DecimalMin(value = "0.5", message = "Peso inválido.")
        @DecimalMax(value = "90", message = "Peso inválido.")
        @JsonProperty("peso_kg") Double pesoKg,

        @NotNull(message = "Informe se o pet é reativo.")
        Boolean reativo,

        @NotNull(message = "Informe se o pet é agressivo com pessoas.")
        @JsonProperty("agressivo_pessoas") Boolean agressivoComPessoas,

        @NotNull(message = "Informe se as vacinas estão em dia.")
        @JsonProperty("vacinas_em_dia") Boolean vacinasEmDia,

        @JsonProperty("problema_saude") String problemaSaude,

        String observacoes,

        // Usado só como fallback quando não há token Auth0 autenticado (modo demo/sem Auth0
        // configurado) — com Auth0 ativo, o tutor_id real vem do "sub" do access token validado.
        @JsonProperty("tutor_id") String tutorId
) {
}
