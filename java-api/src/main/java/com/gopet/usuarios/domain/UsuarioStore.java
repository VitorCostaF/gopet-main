package com.gopet.usuarios.domain;

import java.util.Map;
import java.util.Optional;

/** Porta única de persistência do cadastro do tutor — troque a implementação (infra) quando o backend de dados mudar. */
public interface UsuarioStore {

    boolean configurado();

    Optional<Map<String, Object>> buscarPorId(String id);

    /** Upsert (insere ou atualiza) pela chave primária {@code id}. */
    void salvar(Map<String, Object> usuario);
}
