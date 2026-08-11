package com.gopet.pets.domain;

/** Porte do pet — mapeia pro enum {@code porte_pet} ('P'/'M'/'G') do Postgres, ver supabase/schema.sql. */
public enum Porte {
    PEQUENO("P"),
    MEDIO("M"),
    GRANDE("G");

    private final String codigo;

    Porte(String codigo) {
        this.codigo = codigo;
    }

    public String codigo() {
        return codigo;
    }

    public static Porte deCodigo(String codigo) {
        for (Porte p : values()) {
            if (p.codigo.equals(codigo)) return p;
        }
        throw new IllegalArgumentException("Porte inválido: " + codigo);
    }
}
