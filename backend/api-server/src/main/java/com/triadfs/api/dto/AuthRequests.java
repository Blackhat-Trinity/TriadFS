package com.triadfs.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class AuthRequests {
    private AuthRequests() {
    }

    public record RegisterRequest(@Email @NotBlank String email, @NotBlank String password, @NotBlank String displayName) {
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }
}