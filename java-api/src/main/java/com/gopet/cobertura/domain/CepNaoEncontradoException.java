package com.gopet.cobertura.domain;

public class CepNaoEncontradoException extends RuntimeException {
    public CepNaoEncontradoException(String cep) {
        super("Não foi possível localizar coordenadas para o CEP " + cep);
    }
}
