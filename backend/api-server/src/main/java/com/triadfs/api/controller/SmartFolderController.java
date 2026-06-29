package com.triadfs.api.controller;

import com.triadfs.api.dto.FileRequests;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.service.SmartFolderService;
import com.triadfs.metadata.service.dto.SmartFolderCommand;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/smart-folders")
public class SmartFolderController extends BaseController {
    private final SmartFolderService smartFolderService;

    public SmartFolderController(SmartFolderService smartFolderService) {
        this.smartFolderService = smartFolderService;
    }

    @GetMapping
    public ApiResponse<?> list(HttpServletRequest request) {
        return ok(request, smartFolderService.list(SecurityContextHelper.currentUserId()));
    }

    @PostMapping
    public ApiResponse<?> create(@Valid @RequestBody FileRequests.SmartFolderRequest payload,
                                 HttpServletRequest request) {
        return ok(request, smartFolderService.create(SecurityContextHelper.currentUserId(), toCommand(payload)));
    }

    @PutMapping("/{smartFolderId}")
    public ApiResponse<?> update(@PathVariable UUID smartFolderId,
                                 @Valid @RequestBody FileRequests.SmartFolderRequest payload,
                                 HttpServletRequest request) {
        return ok(request, smartFolderService.update(SecurityContextHelper.currentUserId(), smartFolderId, toCommand(payload)));
    }

    @DeleteMapping("/{smartFolderId}")
    public ApiResponse<?> delete(@PathVariable UUID smartFolderId, HttpServletRequest request) {
        smartFolderService.delete(SecurityContextHelper.currentUserId(), smartFolderId);
        return ok(request, Map.of("deleted", true, "smartFolderId", smartFolderId));
    }

    @GetMapping("/{smartFolderId}/resolve")
    public ApiResponse<?> resolve(@PathVariable UUID smartFolderId, HttpServletRequest request) {
        return ok(request, smartFolderService.resolve(SecurityContextHelper.currentUserId(), smartFolderId));
    }

    private SmartFolderCommand toCommand(FileRequests.SmartFolderRequest payload) {
        return new SmartFolderCommand(
                payload.name(),
                payload.nameContains(),
                payload.nodeType(),
                payload.extensions(),
                payload.requiredTagIds(),
                payload.updatedWithinDays(),
                payload.includeDeleted()
        );
    }
}
