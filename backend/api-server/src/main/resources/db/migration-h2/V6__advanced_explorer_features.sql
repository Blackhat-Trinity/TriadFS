CREATE TABLE file_tags (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    color_hex VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_file_tags_owner_name UNIQUE (owner_id, name)
);

CREATE INDEX idx_file_tags_owner ON file_tags(owner_id);

CREATE TABLE file_node_tags (
    id UUID PRIMARY KEY,
    file_node_id UUID NOT NULL REFERENCES file_nodes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_file_node_tag UNIQUE (file_node_id, tag_id)
);

CREATE INDEX idx_file_node_tags_file ON file_node_tags(file_node_id);
CREATE INDEX idx_file_node_tags_tag ON file_node_tags(tag_id);

CREATE TABLE smart_folders (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    name_contains VARCHAR(255),
    node_type VARCHAR(16),
    extensions_csv CLOB,
    required_tag_ids_csv CLOB,
    updated_within_days INT,
    include_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_smart_folders_owner_name UNIQUE (owner_id, name)
);

CREATE INDEX idx_smart_folders_owner ON smart_folders(owner_id);
