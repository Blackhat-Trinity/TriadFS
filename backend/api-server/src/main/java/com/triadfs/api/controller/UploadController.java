package com.triadfs.api.controller;

import com.triadfs.api.dto.FileRequests;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.common.model.StrategyType;
import com.triadfs.common.model.TransferResult;
import com.triadfs.metadata.model.UploadSessionEntity;
import com.triadfs.metadata.service.UploadSessionService;
import com.triadfs.metadata.service.dto.CreateUploadSessionCommand;
import com.triadfs.transfer.service.TransferOrchestratorService;
import com.triadfs.transfer.session.UploadBufferService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/uploads/sessions")
public class UploadController extends BaseController {
    private final UploadSessionService uploadSessionService;
    private final UploadBufferService uploadBufferService;
    private final TransferOrchestratorService transferOrchestratorService;

    public UploadController(UploadSessionService uploadSessionService,
                            UploadBufferService uploadBufferService,
                            TransferOrchestratorService transferOrchestratorService) {
        this.uploadSessionService = uploadSessionService;
        this.uploadBufferService = uploadBufferService;
        this.transferOrchestratorService = transferOrchestratorService;
    }

    @PostMapping
    public ApiResponse<?> createSession(@Valid @RequestBody FileRequests.CreateUploadSessionRequest payload,
                                        HttpServletRequest request) {
        UUID actor = SecurityContextHelper.currentUserId();
        return ok(request, uploadSessionService.createSession(new CreateUploadSessionCommand(
                payload.fileNodeId(),
                actor,
                payload.strategyType().name(),
                payload.totalChunks(),
                Duration.ofMinutes(30)
        )));
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<?> getSession(@PathVariable UUID sessionId, HttpServletRequest request) {
        return ok(request, uploadSessionService.getSession(Objects.requireNonNull(sessionId)));
    }

    @PostMapping("/{sessionId}/chunks/{chunkIndex}")
    public ApiResponse<?> uploadChunk(@PathVariable UUID sessionId,
                                      @PathVariable int chunkIndex,
                                      @Valid @RequestBody FileRequests.ChunkUploadRequest payload,
                                      HttpServletRequest request) {
        if (payload.chunkIndex() != chunkIndex) {
            throw new IllegalArgumentException("Chunk path index and payload chunkIndex mismatch");
        }
        uploadBufferService.putChunk(sessionId, chunkIndex, Base64.getDecoder().decode(payload.payloadBase64()));
        return ok(request, uploadSessionService.acknowledgeChunk(sessionId, chunkIndex));
    }

    @PostMapping("/{sessionId}/complete")
    public ApiResponse<?> complete(@PathVariable UUID sessionId, HttpServletRequest request) {
        UUID nonNullSessionId = Objects.requireNonNull(sessionId);
        UploadSessionEntity session = uploadSessionService.findEntity(nonNullSessionId);
        List<byte[]> chunks = uploadBufferService.consumeChunks(nonNullSessionId);
        byte[] merged = concat(chunks);

        TransferResult transferResult = transferOrchestratorService.execute(
                SecurityContextHelper.currentUserId(),
                Objects.requireNonNull(session.getFileNode().getId()),
                merged,
                8192,
                StrategyType.valueOf(session.getStrategyName())
        );

        uploadSessionService.markCompleted(nonNullSessionId);
        return ok(request, transferResult);
    }

    @PostMapping("/{sessionId}/abort")
    public ApiResponse<?> abort(@PathVariable UUID sessionId, HttpServletRequest request) {
        uploadBufferService.clear(sessionId);
        return ok(request, uploadSessionService.abort(sessionId));
    }

    private byte[] concat(List<byte[]> chunks) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (byte[] chunk : chunks) {
                out.write(chunk);
            }
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to merge chunks", e);
        }
    }
}
