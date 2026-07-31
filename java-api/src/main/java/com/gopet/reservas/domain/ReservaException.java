package com.gopet.reservas.domain;

import org.springframework.http.HttpStatus;

public class ReservaException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ReservaException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
