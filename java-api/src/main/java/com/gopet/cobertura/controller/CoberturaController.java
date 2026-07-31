package com.gopet.cobertura.controller;

import com.gopet.cobertura.domain.DistanciaCepService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cobertura")
public class CoberturaController {

    private final DistanciaCepService distanciaCepService;

    public CoberturaController(DistanciaCepService distanciaCepService) {
        this.distanciaCepService = distanciaCepService;
    }

    @GetMapping
    public CoberturaResponse verificar(@RequestParam String cep) {
        return CoberturaResponse.de(distanciaCepService.verificar(cep));
    }
}
