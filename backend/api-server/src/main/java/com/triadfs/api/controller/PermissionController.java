package com.triadfs.api.controller;

import com.triadfs.api.dto.FileRequests;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.service.PermissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files/{fileId}/permissions")
public class PermissionController extends BaseController {
    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    public ApiResponse<?> list(@PathVariable UUID fileId, HttpServletRequest request) {
        return ok(request, permissionService.list(SecurityContextHelper.currentUserId(), fileId));
    }

    @PostMapping("/user")
    public ApiResponse<?> grantUser(@PathVariable UUID fileId,
                                    @Valid @RequestBody FileRequests.GrantUserPermissionRequest payload,
                                    HttpServletRequest request) {
        return ok(request, permissionService.grantUser(
                SecurityContextHelper.currentUserId(),
                fileId,
                payload.granteeUserId(),
                payload.permissionType()
        ));
    }

    @PostMapping("/role")
    public ApiResponse<?> grantRole(@PathVariable UUID fileId,
                                    @Valid @RequestBody FileRequests.GrantRolePermissionRequest payload,
                                    HttpServletRequest request) {
        return ok(request, permissionService.grantRole(
                SecurityContextHelper.currentUserId(),
                fileId,
                payload.roleName(),
                payload.permissionType()
        ));
    }

    @DeleteMapping("/{permissionId}")
    public ApiResponse<?> revoke(@PathVariable UUID fileId,
                                 @PathVariable UUID permissionId,
                                 HttpServletRequest request) {
        permissionService.revoke(SecurityContextHelper.currentUserId(), fileId, permissionId);
        return ok(request, Map.of("revoked", true, "permissionId", permissionId));
    }
}
