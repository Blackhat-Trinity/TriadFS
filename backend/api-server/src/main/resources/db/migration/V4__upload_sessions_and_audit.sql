CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    file_node_id UUID NOT NULL REFERENCES file_nodes(id) ON DELETE CASCADE,
    grantee_user_id UUID REFERENCES users(id),
    grantee_role_id UUID REFERENCES roles(id),
    permission_type VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_permissions_file ON permissions(file_node_id);
CREATE INDEX idx_permissions_user ON permissions(grantee_user_id);
CREATE INDEX idx_permissions_role ON permissions(grantee_role_id);

CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY,
    file_node_id UUID NOT NULL REFERENCES file_nodes(id),
    uploader_id UUID NOT NULL REFERENCES users(id),
    strategy_name VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    next_expected_chunk INT NOT NULL,
    total_chunks INT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_upload_sessions_user_status ON upload_sessions(uploader_id, status);
CREATE INDEX idx_upload_sessions_expires ON upload_sessions(expires_at);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_audit_actor_time ON audit_logs(actor_user_id, created_at);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);