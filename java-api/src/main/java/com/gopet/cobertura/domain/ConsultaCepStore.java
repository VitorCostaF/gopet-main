package com.gopet.cobertura.domain;

/** Porta única de persistência do histórico de consultas de CEP — troque a implementação (infra) quando o backend de dados mudar. */
public interface ConsultaCepStore {

    boolean configurado();

    void salvar(ConsultaCepRegistro registro);
}
