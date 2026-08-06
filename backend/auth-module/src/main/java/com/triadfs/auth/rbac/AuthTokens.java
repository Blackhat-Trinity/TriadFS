package com.triadfs.auth.rbac;

import java.util.List;
import java.util.UUID;

public record AuthTokens(
        String accessToken,
        UUID userId,
        String email,
        String displayName,
        List<String> roles
) {
}