package com.gopet.reservas.controller;

import com.gopet.reservas.domain.Reserva;
import com.gopet.reservas.domain.ReservaRequest;
import com.gopet.reservas.domain.ReservaResultado;
import com.gopet.reservas.application.ReservaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal Jwt jwt) {
        // Com Auth0 configurado (ver SecurityConfig), o tutor_id real vem do "sub" do token —
        // o valor enviado no corpo (req.tutorId()) só serve de fallback em modo demo/sem Auth0,
        // pra manter o fluxo funcionando sem exigir um tenant configurado. `jwt` é null nesse
        // modo (sem token exigido) e quando não há Authorization válido.
        String tutorIdAutenticado = jwt != null ? jwt.getSubject() : null;
        ReservaResultado resultado = reservaService.criar(req, idempotencyKey, tutorIdAutenticado);
        HttpStatus status = resultado.novo() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(Map.of("reserva", resultado.reserva()));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(@RequestParam(value = "tutor_id", required = false) String tutorIdFallback,
                                                        @AuthenticationPrincipal Jwt jwt) {
        String tutorId = jwt != null ? jwt.getSubject() : tutorIdFallback;
        List<Reserva> reservas = reservaService.listar(tutorId);
        return ResponseEntity.ok(Map.of("reservas", reservas));
    }
}
