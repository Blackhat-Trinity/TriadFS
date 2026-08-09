package com.triadfs.metadata.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "file_node_tags")
public class FileNodeTagEntity {
    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "file_node_id", nullable = false)
    private FileNodeEntity fileNode;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tag_id", nullable = false)
    private FileTagEntity tag;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

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

    public FileTagEntity getTag() {
        return tag;
    }

    public void setTag(FileTagEntity tag) {
        this.tag = tag;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
