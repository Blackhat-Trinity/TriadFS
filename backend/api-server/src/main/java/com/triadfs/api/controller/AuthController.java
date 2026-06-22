package com.triadfs.api.controller;

import com.triadfs.api.dto.AuthRequests;
import com.triadfs.auth.rbac.AuthService;
import com.triadfs.auth.rbac.AuthTokens;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.model.UserEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController extends BaseController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<AuthTokens> register(@Valid @RequestBody AuthRequests.RegisterRequest request,
                                            HttpServletRequest servletRequest) {
        return ok(servletRequest, authService.register(request.email(), request.password(), request.displayName()));
    }

    @PostMapping("/login")
    public ApiResponse<AuthTokens> login(@Valid @RequestBody AuthRequests.LoginRequest request,
                                         HttpServletRequest servletRequest) {
        return ok(servletRequest, authService.login(request.email(), request.password()));
    }

    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(HttpServletRequest servletRequest) {
        return ok(servletRequest, Map.of("message", "Use /login for now. Refresh token flow planned."));
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(HttpServletRequest servletRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalArgumentException("Unauthenticated");
        }
        UserEntity me = authService.me(authentication.getPrincipal().toString());
        return ok(servletRequest, Map.of(
                "userId", me.getId(),
                "email", me.getEmail(),
                "displayName", me.getDisplayName(),
                "roles", me.getRoles().stream().map(role -> role.getName()).toList()
        ));
    }
}