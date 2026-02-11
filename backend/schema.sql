-- Facility Survey App - Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'surveyor')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    deactivated_by UUID REFERENCES users(id),
    deactivated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    ref_code VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    service_line VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    asset_tag VARCHAR(100),
    building VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id),
    surveyor_id UUID REFERENCES users(id),
    trade VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'under_review', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP
);

-- Asset Inspections table
CREATE TABLE IF NOT EXISTS asset_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id),
    condition_rating VARCHAR(10),
    overall_condition VARCHAR(100),
    quantity_installed INTEGER,
    quantity_working INTEGER,
    remarks TEXT,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_inspection_id UUID REFERENCES asset_inspections(id) ON DELETE CASCADE,
    survey_id UUID REFERENCES surveys(id),
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    caption TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Review Comments table (Phase 2)
CREATE TABLE IF NOT EXISTS review_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_inspection_id UUID REFERENCES asset_inspections(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    reviewer_type VARCHAR(50) CHECK (reviewer_type IN ('MAG', 'CIT', 'DGDA')),
    comments TEXT,
    photos JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Survey Assignments table (Phase 2)
CREATE TABLE IF NOT EXISTS survey_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    reviewer_type VARCHAR(50) CHECK (reviewer_type IN ('MAG', 'CIT', 'DGDA')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Sync Log table (Phase 2)
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    device_id VARCHAR(255),
    sync_type VARCHAR(50) CHECK (sync_type IN ('upload', 'download')),
    entity_type VARCHAR(50),
    entity_id UUID,
    status VARCHAR(50) CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    synced_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log table for security and compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(site_id);
CREATE INDEX IF NOT EXISTS idx_surveys_surveyor_id ON surveys(surveyor_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_inspections_survey_id ON asset_inspections(survey_id);
CREATE INDEX IF NOT EXISTS idx_photos_inspection_id ON photos(asset_inspection_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_inspection_id ON review_comments(asset_inspection_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)

