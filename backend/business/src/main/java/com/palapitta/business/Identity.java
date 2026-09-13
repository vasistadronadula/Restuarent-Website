package com.palapitta.business;

import java.util.UUID;

public record Identity(UUID id, String email, String fullName, String role) {
    public boolean hasRole(String... roles) {
        return java.util.Arrays.asList(roles).contains(role);
    }
}
