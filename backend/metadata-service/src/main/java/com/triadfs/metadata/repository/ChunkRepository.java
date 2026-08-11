package com.triadfs.metadata.repository;

import com.triadfs.metadata.model.ChunkEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChunkRepository extends JpaRepository<ChunkEntity, UUID> {
    Optional<ChunkEntity> findBySha256Hash(String sha256Hash);
}