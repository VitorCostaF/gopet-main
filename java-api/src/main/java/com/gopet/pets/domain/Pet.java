package com.gopet.pets.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Pet(
        String id,
        String nome,
        @JsonProperty("idade_anos") int idadeAnos,
        Porte porte,
        @JsonProperty("peso_kg") Double pesoKg,
        boolean reativo,
        @JsonProperty("agressivo_pessoas") boolean agressivoComPessoas,
        @JsonProperty("vacinas_em_dia") boolean vacinasEmDia,
        @JsonProperty("problema_saude") String problemaSaude,
        String observacoes
) {
}
