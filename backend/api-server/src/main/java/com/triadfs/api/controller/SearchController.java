package com.triadfs.api.controller;

import com.triadfs.common.model.ApiResponse;
import com.triadfs.metadata.service.FileNodeService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController extends BaseController {
    private final FileNodeService fileNodeService;

    public SearchController(FileNodeService fileNodeService) {
        this.fileNodeService = fileNodeService;
    }

    @GetMapping
    public ApiResponse<?> search(@RequestParam String query, HttpServletRequest request) {
        return ok(request, fileNodeService.searchPrefix(SecurityContextHelper.currentUserId(), query));
    }
}