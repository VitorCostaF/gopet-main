package com.gopet.reservas.controller;

import com.gopet.reservas.domain.ReservaRequest;
import com.gopet.reservas.domain.ReservaResultado;
import com.gopet.reservas.application.ReservaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/reservas")
public class ReservaController {

    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@Valid @RequestBody ReservaRequest req,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        ReservaResultado resultado = reservaService.criar(req, idempotencyKey);
        HttpStatus status = resultado.novo() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(Map.of("reserva", resultado.reserva()));
    }
}
