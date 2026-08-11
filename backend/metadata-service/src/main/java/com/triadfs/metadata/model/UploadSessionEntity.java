package com.triadfs.metadata.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "upload_sessions")
public class UploadSessionEntity {
    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "file_node_id", nullable = false)
    private FileNodeEntity fileNode;

    @ManyToOne(optional = false)
    @JoinColumn(name = "uploader_id", nullable = false)
    private UserEntity uploader;

    @Column(name = "strategy_name", nullable = false)
    private String strategyName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UploadStatus status;

    @Column(name = "next_expected_chunk", nullable = false)
    private int nextExpectedChunk;

    @Column(name = "total_chunks", nullable = false)
    private int totalChunks;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public FileNodeEntity getFileNode() {
        return fileNode;
    }

    public void setFileNode(FileNodeEntity fileNode) {
        this.fileNode = fileNode;
    }

    public UserEntity getUploader() {
        return uploader;
    }

    public void setUploader(UserEntity uploader) {
        this.uploader = uploader;
    }

    public String getStrategyName() {
        return strategyName;
    }

    public void setStrategyName(String strategyName) {
        this.strategyName = strategyName;
    }

    public UploadStatus getStatus() {
        return status;
    }

    public void setStatus(UploadStatus status) {
        this.status = status;
    }

    public int getNextExpectedChunk() {
        return nextExpectedChunk;
    }

    public void setNextExpectedChunk(int nextExpectedChunk) {
        this.nextExpectedChunk = nextExpectedChunk;
    }

    public int getTotalChunks() {
        return totalChunks;
    }

    public void setTotalChunks(int totalChunks) {
        this.totalChunks = totalChunks;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}