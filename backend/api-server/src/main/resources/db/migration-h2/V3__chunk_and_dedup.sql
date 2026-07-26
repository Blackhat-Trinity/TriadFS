CREATE TABLE chunks (
    id UUID PRIMARY KEY,
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    chunk_size_bytes INT NOT NULL,
    storage_uri CLOB NOT NULL,
    ref_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_chunks_ref ON chunks(ref_count);

CREATE TABLE version_chunks (
    version_id UUID NOT NULL REFERENCES file_versions(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES chunks(id),
    chunk_order INT NOT NULL,
    offset_bytes BIGINT NOT NULL,
    PRIMARY KEY (version_id, chunk_order)
);

CREATE INDEX idx_version_chunks_chunk ON version_chunks(chunk_id);
