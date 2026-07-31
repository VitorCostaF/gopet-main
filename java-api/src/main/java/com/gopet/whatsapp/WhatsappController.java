package com.gopet.whatsapp;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/whatsapp")
public class WhatsappController {

    private final ReservaConfirmacaoService reservaConfirmacaoService;

    public WhatsappController(ReservaConfirmacaoService reservaConfirmacaoService) {
        this.reservaConfirmacaoService = reservaConfirmacaoService;
    }

    @PostMapping("/reservas/confirmacao")
    public EnvioResponse confirmarReserva(@Valid @RequestBody ConfirmacaoReservaRequest req) {
        return reservaConfirmacaoService.confirmar(req);
    }
}
