package com.triadfs.metadata.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "version_chunks")
@IdClass(VersionChunkEntity.VersionChunkId.class)
public class VersionChunkEntity {
    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "version_id", nullable = false)
    private FileVersionEntity version;

    @Id
    @Column(name = "chunk_order", nullable = false)
    private int chunkOrder;

    @ManyToOne(optional = false)
    @JoinColumn(name = "chunk_id", nullable = false)
    private ChunkEntity chunk;

    @Column(name = "offset_bytes", nullable = false)
    private long offsetBytes;

    public FileVersionEntity getVersion() {
        return version;
    }

    public void setVersion(FileVersionEntity version) {
        this.version = version;
    }

    public int getChunkOrder() {
        return chunkOrder;
    }

    public void setChunkOrder(int chunkOrder) {
        this.chunkOrder = chunkOrder;
    }

    public ChunkEntity getChunk() {
        return chunk;
    }

    public void setChunk(ChunkEntity chunk) {
        this.chunk = chunk;
    }

    public long getOffsetBytes() {
        return offsetBytes;
    }

    public void setOffsetBytes(long offsetBytes) {
        this.offsetBytes = offsetBytes;
    }

    public static class VersionChunkId implements Serializable {
        private UUID version;
        private int chunkOrder;

        public VersionChunkId() {
        }

        public VersionChunkId(UUID version, int chunkOrder) {
            this.version = version;
            this.chunkOrder = chunkOrder;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof VersionChunkId that)) {
                return false;
            }
            return chunkOrder == that.chunkOrder && Objects.equals(version, that.version);
        }

        @Override
        public int hashCode() {
            return Objects.hash(version, chunkOrder);
        }
    }
}