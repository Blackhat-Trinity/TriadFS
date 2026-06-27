package com.triadfs.api.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityContextHelper {
    private SecurityContextHelper() {
    }

    public static UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalStateException("Unauthenticated");
        }
        return UUID.fromString(authentication.getPrincipal().toString());
    }
}