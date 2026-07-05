package com.triadfs.api.dto;

import com.triadfs.common.model.StrategyType;
import com.triadfs.metadata.model.NodeType;
import com.triadfs.metadata.model.PermissionType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public final class FileRequests {
    private FileRequests() {
    }

    public record CreateFolderRequest(UUID parentId, @NotBlank String name) {
    }

    public record InitUploadRequest(UUID parentId, @NotBlank String fileName) {
    }

    public record CreateUploadSessionRequest(@NotNull UUID fileNodeId,
                                             @NotNull StrategyType strategyType,
                                             @Min(1) int totalChunks) {
    }

    public record ChunkUploadRequest(@Min(0) int chunkIndex, @NotBlank String payloadBase64) {
    }

    public record RenameNodeRequest(@NotBlank String name) {
    }

    public record MoveNodeRequest(UUID parentId) {
    }

    public record CreateTagRequest(@NotBlank String name, String colorHex) {
    }

    public record UpdateTagRequest(String name, String colorHex) {
    }

    public record SmartFolderRequest(@NotBlank String name,
                                     String nameContains,
                                     NodeType nodeType,
                                     List<String> extensions,
                                     List<UUID> requiredTagIds,
                                     Integer updatedWithinDays,
                                     boolean includeDeleted) {
    }

    public record GrantUserPermissionRequest(@NotNull UUID granteeUserId, @NotNull PermissionType permissionType) {
    }

    public record GrantRolePermissionRequest(@NotBlank String roleName, @NotNull PermissionType permissionType) {
    }
}
