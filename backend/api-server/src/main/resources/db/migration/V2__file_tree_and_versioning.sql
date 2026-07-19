CREATE TABLE file_nodes (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES file_nodes(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    node_type VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    path_cache TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_file_nodes_parent_name ON file_nodes(parent_id, name);
CREATE INDEX idx_file_nodes_owner_deleted ON file_nodes(owner_id, is_deleted);
CREATE INDEX idx_file_nodes_path ON file_nodes(path_cache);

CREATE TABLE file_versions (
    id UUID PRIMARY KEY,
    file_node_id UUID NOT NULL REFERENCES file_nodes(id),
    version_no INT NOT NULL,
    total_size_bytes BIGINT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    compression_algorithm VARCHAR(64),
    encryption_algorithm VARCHAR(64),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_file_version UNIQUE (file_node_id, version_no)
);

CREATE INDEX idx_file_versions_hash ON file_versions(content_hash);