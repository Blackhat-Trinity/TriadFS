package com.triadfs.api.controller;

import com.triadfs.api.dto.FileRequests;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.model.FileVersionEntity;
import com.triadfs.metadata.model.NodeType;
import com.triadfs.metadata.service.FileNodeService;
import com.triadfs.metadata.service.FileVersionService;
import com.triadfs.metadata.service.dto.CreateNodeCommand;
import com.triadfs.storage.dedup.StorageEngineService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
public class FileController extends BaseController {
    private final FileNodeService fileNodeService;
    private final FileVersionService fileVersionService;
    private final StorageEngineService storageEngineService;

    public FileController(FileNodeService fileNodeService,
                          FileVersionService fileVersionService,
                          StorageEngineService storageEngineService) {
        this.fileNodeService = fileNodeService;
        this.fileVersionService = fileVersionService;
        this.storageEngineService = storageEngineService;
    }

    @GetMapping("/tree")
    public ApiResponse<?> tree(HttpServletRequest request) {
        return ok(request, fileNodeService.getTree(SecurityContextHelper.currentUserId()));
    }

    @PostMapping("/folders")
    public ApiResponse<?> createFolder(@Valid @RequestBody FileRequests.CreateFolderRequest payload,
                                       HttpServletRequest request) {
        UUID actor = SecurityContextHelper.currentUserId();
        return ok(request, fileNodeService.createNode(new CreateNodeCommand(payload.parentId(), actor, NodeType.FOLDER, payload.name())));
    }

    @PostMapping("/init-upload")
    public ApiResponse<?> initUpload(@Valid @RequestBody FileRequests.InitUploadRequest payload,
                                     HttpServletRequest request) {
        UUID actor = SecurityContextHelper.currentUserId();
        return ok(request, fileNodeService.createFileNode(payload.parentId(), actor, payload.fileName()));
    }

    @DeleteMapping("/{fileId}")
    public ApiResponse<?> softDelete(@PathVariable UUID fileId, HttpServletRequest request) {
        fileNodeService.softDelete(SecurityContextHelper.currentUserId(), fileId);
        return ok(request, Map.of("deleted", true, "fileId", fileId));
    }

    @DeleteMapping("/{fileId}/hard")
    public ApiResponse<?> hardDelete(@PathVariable UUID fileId, HttpServletRequest request) {
        fileNodeService.hardDelete(SecurityContextHelper.currentUserId(), fileId);
        return ok(request, Map.of("hardDeleted", true, "fileId", fileId));
    }

    @PostMapping("/{fileId}/restore")
    public ApiResponse<?> restore(@PathVariable UUID fileId, HttpServletRequest request) {
        fileNodeService.restore(SecurityContextHelper.currentUserId(), fileId);
        return ok(request, Map.of("restored", true, "fileId", fileId));
    }

    @PatchMapping("/{fileId}/rename")
    public ApiResponse<?> rename(@PathVariable UUID fileId,
                                 @Valid @RequestBody FileRequests.RenameNodeRequest payload,
                                 HttpServletRequest request) {
        return ok(request, fileNodeService.rename(SecurityContextHelper.currentUserId(), fileId, payload.name()));
    }

    @PatchMapping("/{fileId}/move")
    public ApiResponse<?> move(@PathVariable UUID fileId,
                               @RequestBody FileRequests.MoveNodeRequest payload,
                               HttpServletRequest request) {
        return ok(request, fileNodeService.move(SecurityContextHelper.currentUserId(), fileId, payload.parentId()));
    }

    @GetMapping("/trash")
    public ApiResponse<?> trash(HttpServletRequest request) {
        return ok(request, fileNodeService.getTrash(SecurityContextHelper.currentUserId()));
    }

    @GetMapping("/{fileId}/versions")
    public ApiResponse<?> versions(@PathVariable UUID fileId, HttpServletRequest request) {
        return ok(request, fileVersionService.getVersions(Objects.requireNonNull(fileId)));
    }

    @GetMapping("/{fileId}/download")
    public ApiResponse<?> download(@PathVariable UUID fileId,
                                   @RequestParam UUID version,
                                   HttpServletRequest request) {
        FileVersionEntity versionEntity = fileVersionService.getVersion(Objects.requireNonNull(version));
        byte[] bytes = storageEngineService.rebuildFile(versionEntity);
        return ok(request, Map.of(
                "fileId", fileId,
                "versionId", version,
                "payloadBase64", Base64.getEncoder().encodeToString(bytes),
                "bytes", bytes.length
        ));
    }
}
