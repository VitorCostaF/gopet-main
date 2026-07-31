package com.gopet.reservas.domain.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TelefoneValidator implements ConstraintValidator<Telefone, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        int digitos = value.replaceAll("\\D", "").length();
        return digitos >= 10 && digitos <= 11;
    }
}
