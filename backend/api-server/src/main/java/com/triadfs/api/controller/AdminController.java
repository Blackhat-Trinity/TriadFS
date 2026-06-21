package com.triadfs.api.controller;

import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.service.AuditService;
import com.triadfs.metadata.service.UserAccountService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController extends BaseController {
    private final AuditService auditService;
    private final UserAccountService userAccountService;

    public AdminController(AuditService auditService, UserAccountService userAccountService) {
        this.auditService = auditService;
        this.userAccountService = userAccountService;
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<?> auditLogs(HttpServletRequest request) {
        return ok(request, auditService.recent());
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<?> users(HttpServletRequest request) {
        return ok(request, userAccountService.listUsers());
    }
}
