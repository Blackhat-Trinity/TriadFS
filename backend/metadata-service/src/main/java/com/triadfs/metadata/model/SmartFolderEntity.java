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
@Table(name = "smart_folders")
public class SmartFolderEntity {
    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserEntity owner;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_contains")
    private String nameContains;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type")
    private NodeType nodeType;

    @Column(name = "extensions_csv")
    private String extensionsCsv;

    @Column(name = "required_tag_ids_csv")
    private String requiredTagIdsCsv;

    @Column(name = "updated_within_days")
    private Integer updatedWithinDays;

    @Column(name = "include_deleted", nullable = false)
    private boolean includeDeleted;

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

    public UserEntity getOwner() {
        return owner;
    }

    public void setOwner(UserEntity owner) {
        this.owner = owner;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameContains() {
        return nameContains;
    }

    public void setNameContains(String nameContains) {
        this.nameContains = nameContains;
    }

    public NodeType getNodeType() {
        return nodeType;
    }

    public void setNodeType(NodeType nodeType) {
        this.nodeType = nodeType;
    }

    public String getExtensionsCsv() {
        return extensionsCsv;
    }

    public void setExtensionsCsv(String extensionsCsv) {
        this.extensionsCsv = extensionsCsv;
    }

    public String getRequiredTagIdsCsv() {
        return requiredTagIdsCsv;
    }

    public void setRequiredTagIdsCsv(String requiredTagIdsCsv) {
        this.requiredTagIdsCsv = requiredTagIdsCsv;
    }

    public Integer getUpdatedWithinDays() {
        return updatedWithinDays;
    }

    public void setUpdatedWithinDays(Integer updatedWithinDays) {
        this.updatedWithinDays = updatedWithinDays;
    }

    public boolean isIncludeDeleted() {
        return includeDeleted;
    }

    public void setIncludeDeleted(boolean includeDeleted) {
        this.includeDeleted = includeDeleted;
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
