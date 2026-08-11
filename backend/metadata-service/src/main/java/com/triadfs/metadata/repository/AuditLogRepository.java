package com.triadfs.metadata.repository;

import com.triadfs.metadata.model.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {
    List<AuditLogEntity> findTop200ByOrderByCreatedAtDesc();
}