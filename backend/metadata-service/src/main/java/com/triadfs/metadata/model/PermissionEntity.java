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
@Table(name = "permissions")
public class PermissionEntity {
    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "file_node_id", nullable = false)
    private FileNodeEntity fileNode;

    @ManyToOne
    @JoinColumn(name = "grantee_user_id")
    private UserEntity granteeUser;

    @ManyToOne
    @JoinColumn(name = "grantee_role_id")
    private RoleEntity granteeRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_type", nullable = false)
    private PermissionType permissionType;

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

    public UserEntity getGranteeUser() {
        return granteeUser;
    }

    public void setGranteeUser(UserEntity granteeUser) {
        this.granteeUser = granteeUser;
    }

    public RoleEntity getGranteeRole() {
        return granteeRole;
    }

    public void setGranteeRole(RoleEntity granteeRole) {
        this.granteeRole = granteeRole;
    }

    public PermissionType getPermissionType() {
        return permissionType;
    }

    public void setPermissionType(PermissionType permissionType) {
        this.permissionType = permissionType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}