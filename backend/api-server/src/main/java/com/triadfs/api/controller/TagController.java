package com.triadfs.api.controller;

import com.triadfs.api.dto.FileRequests;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.service.TagService;
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
@RequestMapping("/api/v1")
public class TagController extends BaseController {
    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping("/tags")
    public ApiResponse<?> listTags(HttpServletRequest request) {
        return ok(request, tagService.listTags(SecurityContextHelper.currentUserId()));
    }

    @PostMapping("/tags")
    public ApiResponse<?> createTag(@Valid @RequestBody FileRequests.CreateTagRequest payload,
                                    HttpServletRequest request) {
        return ok(request, tagService.createTag(SecurityContextHelper.currentUserId(), payload.name(), payload.colorHex()));
    }

    @PutMapping("/tags/{tagId}")
    public ApiResponse<?> updateTag(@PathVariable UUID tagId,
                                    @RequestBody FileRequests.UpdateTagRequest payload,
                                    HttpServletRequest request) {
        return ok(request, tagService.updateTag(SecurityContextHelper.currentUserId(), tagId, payload.name(), payload.colorHex()));
    }

    @DeleteMapping("/tags/{tagId}")
    public ApiResponse<?> deleteTag(@PathVariable UUID tagId, HttpServletRequest request) {
        tagService.deleteTag(SecurityContextHelper.currentUserId(), tagId);
        return ok(request, Map.of("deleted", true, "tagId", tagId));
    }

    @GetMapping("/files/{fileId}/tags")
    public ApiResponse<?> listTagsForFile(@PathVariable UUID fileId, HttpServletRequest request) {
        return ok(request, tagService.listTagsForNode(SecurityContextHelper.currentUserId(), fileId));
    }

    @PostMapping("/files/{fileId}/tags/{tagId}")
    public ApiResponse<?> assignTag(@PathVariable UUID fileId,
                                    @PathVariable UUID tagId,
                                    HttpServletRequest request) {
        tagService.assignTag(SecurityContextHelper.currentUserId(), fileId, tagId);
        return ok(request, Map.of("assigned", true, "fileId", fileId, "tagId", tagId));
    }

    @DeleteMapping("/files/{fileId}/tags/{tagId}")
    public ApiResponse<?> unassignTag(@PathVariable UUID fileId,
                                      @PathVariable UUID tagId,
                                      HttpServletRequest request) {
        tagService.unassignTag(SecurityContextHelper.currentUserId(), fileId, tagId);
        return ok(request, Map.of("unassigned", true, "fileId", fileId, "tagId", tagId));
    }
}
