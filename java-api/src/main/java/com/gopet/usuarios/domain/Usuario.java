package com.gopet.usuarios.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gopet.reservas.domain.EnderecoRequest;

/**
 * Cadastro do tutor (perfis.id = "sub" do token Auth0, ver com.gopet.config.SecurityConfig).
 * {@code cadastroCompleto} é derivado (nome e endereço preenchidos) — usado pelo front-end pra
 * decidir se mostra o alerta "finalize seu cadastro" (ver ReservaService, que também recusa
 * reservar sem cadastro completo).
 */
public record Usuario(
        String id,
        String nome,
        String email,
        EnderecoRequest endereco,
        @JsonProperty("cadastro_completo") boolean cadastroCompleto
) {
    public static boolean completo(String nome, EnderecoRequest endereco) {
        return nome != null && !nome.isBlank()
                && endereco != null && endereco.numero() != null && !endereco.numero().isBlank()
                && endereco.cep() != null && !endereco.cep().isBlank();
    }
}
