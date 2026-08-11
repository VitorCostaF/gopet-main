package com.gopet.pets.domain;

import java.util.List;
import java.util.Map;

/** Porta única de persistência de pets — troque a implementação (infra) quando o backend de dados mudar. */
public interface PetStore {

    boolean configurado();

    List<Map<String, Object>> listarPorTutor(String tutorId);

    void inserir(Map<String, Object> pet);
}
