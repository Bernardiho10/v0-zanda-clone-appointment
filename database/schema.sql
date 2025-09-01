-- =====================================================
-- ZANDA HEALTH CLONE - COMPLETE POSTGRESQL DATABASE SCHEMA
-- Multi-tenant Practice Management System
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";


-- =====================================================
-- MULTI-TENANCY SCHEMA SETUP
-- =====================================================

-- Create schemas for multi-tenancy
CREATE SCHEMA IF NOT EXISTS tenants;
CREATE SCHEMA IF NOT EXISTS shared;

-- Set default search path
SET search_path = tenants, shared, public;


-- Create comprehensive custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'practitioner', 'receptionist', 'client');
CREATE TYPE appointment_status AS ENUM ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show', 'Rescheduled', 'In Progress');
CREATE TYPE payment_method AS ENUM ('Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Cheque', 'Online', 'EFTPOS', 'PayPal', 'Stripe', 'Square');
CREATE TYPE service_type AS ENUM ('Service', 'Product', 'Package', 'Consultation', 'Treatment', 'Assessment');
CREATE TYPE client_status AS ENUM ('Active', 'Inactive', 'Archived', 'Suspended', 'Deceased');
CREATE TYPE referrer_status AS ENUM ('Active', 'Inactive', 'Suspended');
CREATE TYPE invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled', 'Refunded');
CREATE TYPE communication_type AS ENUM ('SMS', 'Email', 'Phone Call', 'Letter', 'In Person', 'Video Call');
CREATE TYPE communication_direction AS ENUM ('Inbound', 'Outbound');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other', 'Prefer not to say');
CREATE TYPE title_type AS ENUM ('Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev', 'Sir', 'Dame', 'Lord', 'Lady');
CREATE TYPE marital_status AS ENUM ('Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'De facto');
CREATE TYPE insurance_type AS ENUM ('Private Health', 'Medicare', 'WorkCover', 'CTP', 'DVA', 'Other');
CREATE TYPE pack_status AS ENUM ('Active', 'Expired', 'Suspended', 'Completed', 'Cancelled');
CREATE TYPE note_status AS ENUM ('Draft', 'Locked', 'Signed', 'Archived');
CREATE TYPE priority_level AS ENUM ('Low', 'Normal', 'High', 'Urgent');


-- =====================================================
-- SHARED TABLES (Cross-tenant)
-- =====================================================

-- Tenant management table
CREATE TABLE IF NOT EXISTS shared.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_subscription_id UUID REFERENCES shared.tenant_subscriptions(id),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) UNIQUE NOT NULL, -- BUSINESS NAME
    database_name VARCHAR(63) NOT NULL, -- DATABASE NAME
    email VARCHAR(255) UNIQUE NOT NULL, -- EMAIL
    password_hash VARCHAR(255) NOT NULL, -- PASSWORD HASH
    is_super_admin BOOLEAN DEFAULT FALSE, -- IS SUPER ADMIN
    is_practitioner BOOLEAN DEFAULT FALSE, -- IS PRACTITIONER
    deleted_at TIMESTAMP WITH TIME ZONE, -- DELETED AT
    is_deleted BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    country VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    max_users INTEGER DEFAULT 10,
    max_clients INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS shared.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- e.g., 'Starter', 'Growth_Solo', 'Growth_Group'
    base_price DECIMAL(10,2) NOT NULL, -- Monthly base price (USD)
    appointment_limit INTEGER, -- NULL for unlimited (Growth Plan)
    user_limit INTEGER, -- NULL for unlimited (Growth Plan)
    practitioner_limit INTEGER, -- NULL for unlimited or specific number
    file_storage_limit BIGINT, -- In bytes, e.g., 100GB for Starter
    features JSONB NOT NULL, -- JSON object of available features
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    subscription_plan_id UUID NOT NULL REFERENCES shared.subscription_plans(id),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE, -- NULL if active
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Trial', 'Cancelled', 'Expired')),
    trial_start_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    is_trial BOOLEAN DEFAULT FALSE,
    practitioner_count INTEGER DEFAULT 1, -- Number of active practitioners
    appointment_count INTEGER DEFAULT 0, -- Tracks appointments for Starter Plan
    sms_credits INTEGER DEFAULT 35, -- Free SMS credits (US only)
    sms_dedicated_number BOOLEAN DEFAULT FALSE, -- Whether tenant has dedicated SMS number
    telehealth_minutes INTEGER DEFAULT 100, -- Free monthly telehealth minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared.subscription_change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    old_subscription_plan_id UUID REFERENCES shared.subscription_plans(id),
    new_subscription_plan_id UUID REFERENCES shared.subscription_plans(id),
    change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('Upgrade', 'Downgrade', 'Initial', 'Renewal', 'Termination')),
    details JSONB, -- Additional details (e.g., reason, practitioner count changes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CORE BUSINESS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS practice_operations_manual (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    created_by UUID REFERENCES shared.tenants(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_manual_tenant_id ON practice_operations_manual(tenant_id);
ALTER TABLE practice_operations_manual ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_manual ON practice_operations_manual;
CREATE POLICY tenant_isolation_manual ON practice_operations_manual
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);


CREATE TABLE IF NOT EXISTS telehealth_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    appointment_id INTEGER NOT NULL REFERENCES client_appointments(appointment_id) ON DELETE CASCADE,
    room_name VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telehealth_tenant_id ON telehealth_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_appointment_id ON telehealth_sessions(appointment_id);
ALTER TABLE telehealth_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_telehealth ON telehealth_sessions;
CREATE POLICY tenant_isolation_telehealth ON telehealth_sessions
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);



-- Suppliers/Practices table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    abn VARCHAR(20),
    address TEXT,
    suburb VARCHAR(100),
    postcode VARCHAR(10),
    state VARCHAR(50),
    country VARCHAR(3) DEFAULT 'AUS',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Services and Products
CREATE TABLE IF NOT EXISTS services_and_products (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Product', 'Service')),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10,2),
    tax VARCHAR(10) DEFAULT 'GST',
    tax_rate DECIMAL(6,5) DEFAULT 0.10000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- Referrers
CREATE TABLE IF NOT EXISTS referrers (
    number SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    salutation VARCHAR(10),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    preferred_name VARCHAR(100),
    company_name VARCHAR(255),
    provider_number VARCHAR(50),
    referrer_type VARCHAR(100),
    address TEXT,
    suburb VARCHAR(100),
    postcode VARCHAR(10),
    state VARCHAR(50),
    email VARCHAR(255),
    work_phone VARCHAR(20),
    fax VARCHAR(20),
    status VARCHAR(50) DEFAULT 'Active',
    roles TEXT,
    subscribe_to_marketing BOOLEAN DEFAULT FALSE,
    personal_data_consent BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
    client_number SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255),
    client_type VARCHAR(100),
    salutation VARCHAR(10),
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    mobile_number VARCHAR(20),
    email VARCHAR(255),
    schedule_reminders BOOLEAN DEFAULT TRUE,
    date_of_birth DATE,
    sex VARCHAR(20),
    gender_identity VARCHAR(50),
    pronouns VARCHAR(20),
    identity VARCHAR(100),
    address TEXT,
    suburb VARCHAR(100),
    postcode VARCHAR(10),
    state VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'Australia/Sydney',
    work_phone VARCHAR(20),
    home_phone VARCHAR(20),
    fax VARCHAR(20),
    warn_supplier BOOLEAN DEFAULT FALSE,
    file_under VARCHAR(100),
    subscribe_to_marketing BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(255),
    country VARCHAR(3) DEFAULT 'AUS',
    preferred_service VARCHAR(255),
    pack_service VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    client_notes TEXT,
    allow_clinic_app_new_appointment BOOLEAN DEFAULT TRUE,
    allow_client_portal_new_appointment BOOLEAN DEFAULT TRUE,
    client_alert_notes TEXT,
    company_name VARCHAR(255),
    billing_client VARCHAR(255),
    extra_invoice_info TEXT,
    discount DECIMAL(10,4) DEFAULT 0.0000,
    how_heard VARCHAR(255),
    insurer_number VARCHAR(100),
    irn VARCHAR(100),
    insurer_expiry DATE,
    membership_type VARCHAR(100),
    membership_start DATE,
    membership_finish DATE,
    membership_number VARCHAR(100),
    membership_rate VARCHAR(50),
    import_id VARCHAR(100),
    roles VARCHAR(255) DEFAULT 'Customer',
    is_archived BOOLEAN DEFAULT FALSE,
    classifications VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Third Party (similar to clients but for third-party billing)
CREATE TABLE IF NOT EXISTS third_party (
    client_number SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255),
    salutation VARCHAR(10),
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    mobile_number VARCHAR(20),
    email VARCHAR(255),
    date_of_birth DATE,
    address TEXT,
    suburb VARCHAR(100),
    postcode VARCHAR(10),
    state VARCHAR(50),
    work_phone VARCHAR(20),
    home_phone VARCHAR(20),
    fax VARCHAR(20),
    file_under VARCHAR(100),
    subscribe_to_marketing BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(255),
    preferred_service VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    client_notes TEXT,
    allow_clinic_app_new_appointment BOOLEAN DEFAULT TRUE,
    allow_client_portal_new_appointment BOOLEAN DEFAULT TRUE,
    client_alert_notes TEXT,
    company_name VARCHAR(255),
    billing_client VARCHAR(255),
    extra_invoice_info TEXT,
    discount DECIMAL(10,4) DEFAULT 0.0000,
    how_heard VARCHAR(255),
    insurer_number VARCHAR(100),
    irn VARCHAR(100),
    insurer_expiry DATE,
    membership_type VARCHAR(100),
    membership_start DATE,
    membership_finish DATE,
    membership_number VARCHAR(100),
    membership_rate VARCHAR(50),
    import_id VARCHAR(100),
    roles VARCHAR(255) DEFAULT 'Customer',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Create client_documents table
CREATE TABLE IF NOT EXISTS client_documents (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    form_id INTEGER REFERENCES client_forms(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON client_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_number ON client_documents(client_number);
CREATE INDEX IF NOT EXISTS idx_documents_form_id ON client_documents(form_id);
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_documents ON client_documents;
CREATE POLICY tenant_isolation_documents ON client_documents
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Add documents field to client_forms
ALTER TABLE client_forms
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}';


-- Referrals (linking clients to referrers)
CREATE TABLE IF NOT EXISTS referrals (
    referral_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_name VARCHAR(255),
    referrer_number INTEGER NOT NULL REFERENCES referrers(number) ON DELETE CASCADE,
    referrer_name VARCHAR(255),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    show_on_invoice_print BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Insurance
CREATE TABLE IF NOT EXISTS client_insurance (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_first_name VARCHAR(100),
    client_last_name VARCHAR(100),
    date_of_birth DATE,
    insurance_name VARCHAR(255) NOT NULL,
    insurer_number VARCHAR(100),
    ref VARCHAR(100),
    expiry DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default_for_new_invoices BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Contacts (emergency contacts, family, etc.)
CREATE TABLE IF NOT EXISTS client_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_name VARCHAR(255),
    contact_number VARCHAR(100),
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_mobile VARCHAR(20),
    contact_address TEXT,
    contact_suburb VARCHAR(100),
    contact_postcode VARCHAR(10),
    contact_region VARCHAR(50),
    contact_country VARCHAR(3),
    relation VARCHAR(100),
    disclosure VARCHAR(255),
    notes TEXT,
    contact_types VARCHAR(255),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Diagnoses
CREATE TABLE IF NOT EXISTS client_diagnoses (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_name VARCHAR(255),
    diagnosis_code VARCHAR(20) NOT NULL,
    diagnosis_description TEXT NOT NULL,
    diagnosis_code_type VARCHAR(50),
    notes TEXT,
    date_diagnosed DATE NOT NULL,
    date_resolved DATE,
    is_default BOOLEAN DEFAULT FALSE,
    practitioner VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE IF NOT EXISTS client_appointments (
    appointment_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    full_name VARCHAR(255),
    diary VARCHAR(255),
    recurrence_rule VARCHAR(255),
    cancellation_reason TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    appointment_status_id VARCHAR(50) DEFAULT 'Pending',
    appointment_type_id VARCHAR(50) DEFAULT 'Client Appointment',
    client_appointment_group_id INTEGER,
    location VARCHAR(255),
    schedule_reminder BOOLEAN DEFAULT TRUE,
    recurring_appointment_id INTEGER,
    notes TEXT,
    warning BOOLEAN DEFAULT FALSE,
    invoice_id INTEGER,
    created_on_client_portal BOOLEAN DEFAULT FALSE,
    appointment_title VARCHAR(255),
    appointment_flag VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session Notes
CREATE TABLE IF NOT EXISTS client_notes (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    session_note_reference SERIAL,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    full_name VARCHAR(255),
    appointment_id INTEGER REFERENCES client_appointments(appointment_id),
    activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
    name VARCHAR(255) NOT NULL,
    notes TEXT NOT NULL,
    created_by_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'AutoDraft',
    log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Forms
CREATE TABLE IF NOT EXISTS client_forms (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    form_reference SERIAL,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    full_name VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    forms TEXT NOT NULL,
    created_by_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'AutoDraft',
    log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Communication
CREATE TABLE IF NOT EXISTS client_communication (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_name VARCHAR(255),
    send_status VARCHAR(50) DEFAULT 'Pending',
    protocol_type VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Packs (service packages)
CREATE TABLE IF NOT EXISTS packs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10,2),
    code VARCHAR(50) NOT NULL,
    tax VARCHAR(10) DEFAULT 'GST',
    tax_rate DECIMAL(6,5) DEFAULT 0.10000,
    saleable_category_id INTEGER,
    saleable_id INTEGER,
    sale_service_name VARCHAR(255),
    maximum_units_in_pack DECIMAL(6,2) NOT NULL,
    first_session TEXT,
    additional_sessions TEXT,
    auto_create_new_pack BOOLEAN DEFAULT FALSE,
    auto_expire_after INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- Pack Instances (purchased packs for clients)
CREATE TABLE IF NOT EXISTS pack_instances (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    sale_pack_id INTEGER NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
    saleable_id INTEGER,
    client_id INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_number INTEGER,
    client_name VARCHAR(255),
    maximum_units_in_pack DECIMAL(6,2) NOT NULL,
    units_used DECIMAL(6,2) DEFAULT 0.00,
    name VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    first_session TEXT,
    additional_sessions TEXT,
    auto_create_new_pack BOOLEAN DEFAULT FALSE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    pack_is_open BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pack Sessions (individual sessions within pack instances)
CREATE TABLE IF NOT EXISTS pack_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    sale_pack_instance_id INTEGER NOT NULL REFERENCES pack_instances(id) ON DELETE CASCADE,
    saleable_id INTEGER,
    appointment_id INTEGER REFERENCES client_appointments(appointment_id),
    invoice_item_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    invoice_number SERIAL,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    full_name VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    dt_invoice_paid TIMESTAMP WITH TIME ZONE,
    payable_by VARCHAR(100) DEFAULT 'Self',
    summary VARCHAR(500),
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid DECIMAL(10,2) DEFAULT 0.00,
    total_tax DECIMAL(10,4) DEFAULT 0.0000,
    supplier_name VARCHAR(255),
    location_name VARCHAR(255),
    dt_exported TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    invoice_item_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    full_name VARCHAR(255),
    saleable_name VARCHAR(255) NOT NULL,
    duration VARCHAR(50),
    item_qty DECIMAL(6,3) DEFAULT 1.000,
    description VARCHAR(500),
    amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,4) DEFAULT 0.0000,
    tax VARCHAR(10),
    tax_rate DECIMAL(6,5) DEFAULT 0.10000,
    cost DECIMAL(10,2),
    product_id INTEGER,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    notes TEXT,
    amount DECIMAL(10,2) NOT NULL,
    dt_received TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Payments (linking payments to invoices)
CREATE TABLE IF NOT EXISTS invoice_payments (
    invoice_payment_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    dt_exported TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Statements
CREATE TABLE IF NOT EXISTS statements (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    statement_number SERIAL,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    client_name VARCHAR(255),
    title VARCHAR(255),
    custom_text TEXT,
    type VARCHAR(100) DEFAULT 'Activity Statement',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price DECIMAL(10,2) DEFAULT 0.00,
    total_payments DECIMAL(10,2) DEFAULT 0.00,
    total_owing DECIMAL(10,2) DEFAULT 0.00,
    data JSONB,
    show_referrer BOOLEAN DEFAULT TRUE,
    include_provided_by BOOLEAN DEFAULT TRUE,
    include_supplied_to BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Create recurring_appointments table
CREATE TABLE IF NOT EXISTS recurring_appointments (
    series_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    recurrence_rule VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    diary VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    notes TEXT,
    appointment_type VARCHAR(50) DEFAULT 'Client Appointment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recurring_tenant_id ON recurring_appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_client_number ON recurring_appointments(client_number);
ALTER TABLE recurring_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_recurring ON recurring_appointments;
CREATE POLICY tenant_isolation_recurring ON recurring_appointments
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create function to check for appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_tenant_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_diary VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM client_appointments
        WHERE tenant_id = p_tenant_id
        AND diary = p_diary
        AND start_time < p_end_time
        AND end_time > p_start_time
        AND cancellation_reason IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate recurring appointments
CREATE OR REPLACE FUNCTION generate_recurring_appointments(
    p_series_id INTEGER,
    p_tenant_id UUID,
    p_client_number INTEGER,
    p_recurrence_rule VARCHAR,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_diary VARCHAR,
    p_location VARCHAR,
    p_notes TEXT,
    p_appointment_type VARCHAR
) RETURNS VOID AS $$
DECLARE
    rrule JSONB;
    instance_time TIMESTAMP WITH TIME ZONE;
    instance_end_time TIMESTAMP WITH TIME ZONE;
    freq VARCHAR;
    interval INTEGER;
    count INTEGER;
    until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Parse RRULE (simplified, assumes FREQ, INTERVAL, COUNT/UNTIL)
    rrule := p_recurrence_rule::JSONB;
    freq := rrule->>'FREQ';
    interval := COALESCE((rrule->>'INTERVAL')::INTEGER, 1);
    count := (rrule->>'COUNT')::INTEGER;
    until := (rrule->>'UNTIL')::TIMESTAMP WITH TIME ZONE;

    instance_time := p_start_time;
    instance_end_time := p_end_time;

    FOR i IN 1..COALESCE(count, 10) LOOP
        EXIT WHEN until IS NOT NULL AND instance_time > until;
        
        IF NOT check_appointment_conflict(p_tenant_id, instance_time, instance_end_time, p_diary) THEN
            INSERT INTO client_appointments (
                tenant_id, client_number, start_time, end_time, diary, location, notes, appointment_type, series_id
            ) VALUES (
                p_tenant_id, p_client_number, instance_time, instance_end_time, p_diary, p_location, p_notes, p_appointment_type, p_series_id
            );
        END IF;

        -- Increment based on frequency
        IF freq = 'DAILY' THEN
            instance_time := instance_time + (interval * INTERVAL '1 day');
            instance_end_time := instance_end_time + (interval * INTERVAL '1 day');
        ELSIF freq = 'WEEKLY' THEN
            instance_time := instance_time + (interval * INTERVAL '1 week');
            instance_end_time := instance_end_time + (interval * INTERVAL '1 week');
        ELSIF freq = 'MONTHLY' THEN
            instance_time := instance_time + (interval * INTERVAL '1 month');
            instance_end_time := instance_end_time + (interval * INTERVAL '1 month');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Create appointment_reminders table
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    appointment_id INTEGER NOT NULL REFERENCES client_appointments(appointment_id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    protocol_type VARCHAR(50) NOT NULL CHECK (protocol_type IN ('Email', 'SMS')),
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('24h', '1h')),
    status VARCHAR(50) DEFAULT 'Pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant_id ON appointment_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_appointment_id ON appointment_reminders(appointment_id);
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_reminders ON appointment_reminders;
CREATE POLICY tenant_isolation_reminders ON appointment_reminders
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id) ON DELETE CASCADE,
    client_number INTEGER NOT NULL REFERENCES clients(client_number) ON DELETE CASCADE,
    diary VARCHAR(255) NOT NULL,
    preferred_time TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_id ON waitlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_client_number ON waitlist(client_number);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_waitlist ON waitlist;
CREATE POLICY tenant_isolation_waitlist ON waitlist
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Add status to client_appointments
ALTER TABLE client_appointments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Completed', 'No Show', 'Cancelled'));

-- Create function to mark no-shows
CREATE OR REPLACE FUNCTION mark_no_shows() RETURNS VOID AS $$
BEGIN
    UPDATE client_appointments
    SET status = 'No Show', updated_at = CURRENT_TIMESTAMP
    WHERE start_time < NOW() - INTERVAL '15 minutes'
    AND status = 'Confirmed'
    AND cancellation_reason IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tenant indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_products_tenant_id ON services_and_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrers_tenant_id ON referrers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_third_party_tenant_id ON third_party(tenant_id);
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON shared.subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON shared.tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan_id ON shared.tenant_subscriptions(subscription_plan_id);


-- Client-related indexes
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON clients(full_name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON clients(mobile_number);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_client ON client_appointments(client_number);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON client_appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON client_appointments(appointment_status_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON client_appointments(start_time, end_time);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(dt_invoice_paid);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(dt_received);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment ON invoice_payments(payment_id);

-- Pack indexes
CREATE INDEX IF NOT EXISTS idx_pack_instances_client ON pack_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_pack_sessions_instance ON pack_sessions(sale_pack_instance_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_client_communication_client ON client_communication(client_number);
CREATE INDEX IF NOT EXISTS idx_client_communication_date ON client_communication(created_at);

-- Multi-column indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON clients(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_date ON invoices(client_number, date);
CREATE INDEX IF NOT EXISTS idx_appointments_client_date ON client_appointments(client_number, start_time);
CREATE INDEX IF NOT EXISTS idx_subscription_change_log_tenant_id ON shared.subscription_change_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_change_log_change_date ON shared.subscription_change_log(change_date);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update trigger for tenant_subscriptions
CREATE TRIGGER update_tenant_subscriptions_updated_at
    BEFORE UPDATE ON shared.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger for subscription_change_log
CREATE TRIGGER audit_subscription_change_log
    AFTER INSERT OR UPDATE OR DELETE ON shared.subscription_change_log
    FOR EACH ROW EXECUTE FUNCTION shared.audit_trigger();

-- Function to initialize a free trial
CREATE OR REPLACE FUNCTION initialize_free_trial(
    p_tenant_id UUID,
    p_subscription_plan_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_subscription_id UUID;
BEGIN
    INSERT INTO shared.tenant_subscriptions (
        tenant_id,
        subscription_plan_id,
        start_date,
        trial_start_date,
        trial_end_date,
        is_trial,
        status
    ) VALUES (
        p_tenant_id,
        p_subscription_plan_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '14 days',
        TRUE,
        'Trial'
    ) RETURNING id INTO new_subscription_id;

    -- Log the initial subscription
    INSERT INTO shared.subscription_change_log (
        tenant_id,
        new_subscription_plan_id,
        change_type,
        details
    ) VALUES (
        p_tenant_id,
        p_subscription_plan_id,
        'Initial',
        jsonb_build_object('reason', 'Free trial started')
    );

    -- Update tenants table
    UPDATE shared.tenants
    SET current_subscription_id = new_subscription_id
    WHERE id = p_tenant_id;

    RETURN new_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Function to change subscription plan
CREATE OR REPLACE FUNCTION change_subscription_plan(
    p_tenant_id UUID,
    p_new_plan_id UUID,
    p_reason TEXT DEFAULT 'Plan change requested by user'
)
RETURNS VOID AS $$
DECLARE
    current_subscription RECORD;
    new_plan RECORD;
    change_type VARCHAR(50);
BEGIN
    -- Get current subscription
    SELECT ts.*, sp.name as current_plan_name, sp.appointment_limit, sp.practitioner_limit
    INTO current_subscription
    FROM shared.tenant_subscriptions ts
    JOIN shared.subscription_plans sp ON ts.subscription_plan_id = sp.id
    WHERE ts.tenant_id = p_tenant_id AND ts.status IN ('Active', 'Trial');

    -- Get new plan details
    SELECT * INTO new_plan
    FROM shared.subscription_plans
    WHERE id = p_new_plan_id;

    -- Determine change type (Upgrade or Downgrade)
    change_type := CASE
        WHEN new_plan.base_price > current_subscription.base_price THEN 'Upgrade'
        WHEN new_plan.base_price < current_subscription.base_price THEN 'Downgrade'
        ELSE 'Renewal'
    END;

    -- Validate downgrade constraints
    IF change_type = 'Downgrade' THEN
        IF new_plan.appointment_limit IS NOT NULL THEN
            IF current_subscription.appointment_count > new_plan.appointment_limit THEN
                RAISE EXCEPTION 'Cannot downgrade: Current appointment count (%) exceeds new plan limit (%)',
                    current_subscription.appointment_count, new_plan.appointment_limit;
            END IF;
        END IF;
        IF new_plan.practitioner_limit IS NOT NULL THEN
            IF current_subscription.practitioner_count > new_plan.practitioner_limit THEN
                RAISE EXCEPTION 'Cannot downgrade: Current practitioner count (%) exceeds new plan limit (%)',
                    current_subscription.practitioner_count, new_plan.practitioner_limit;
            END IF;
        END IF;
    END IF;

    -- End current subscription
    UPDATE shared.tenant_subscriptions
    SET end_date = CURRENT_TIMESTAMP,
        status = 'Expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = current_subscription.id;

    -- Create new subscription
    INSERT INTO shared.tenant_subscriptions (
        tenant_id,
        subscription_plan_id,
        start_date,
        practitioner_count,
        appointment_count,
        sms_credits,
        telehealth_minutes,
        status
    ) VALUES (
        p_tenant_id,
        p_new_plan_id,
        CURRENT_TIMESTAMP,
        current_subscription.practitioner_count,
        current_subscription.appointment_count,
        current_subscription.sms_credits,
        current_subscription.telehealth_minutes,
        'Active'
    );

    -- Log the change
    INSERT INTO shared.subscription_change_log (
        tenant_id,
        old_subscription_plan_id,
        new_subscription_plan_id,
        change_type,
        details
    ) VALUES (
        p_tenant_id,
        current_subscription.subscription_plan_id,
        p_new_plan_id,
        change_type,
        jsonb_build_object('reason', p_reason)
    );

    -- Update tenants table
    UPDATE shared.tenants
    SET current_subscription_id = (
        SELECT id FROM shared.tenant_subscriptions
        WHERE tenant_id = p_tenant_id AND status = 'Active'
        ORDER BY start_date DESC LIMIT 1
    )
    WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to terminate expired trials
CREATE OR REPLACE FUNCTION terminate_expired_trials()
RETURNS INTEGER AS $$
DECLARE
    terminated_count INTEGER;
BEGIN
    UPDATE shared.tenant_subscriptions
    SET status = 'Expired',
        end_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE is_trial = TRUE
    AND trial_end_date < CURRENT_TIMESTAMP
    AND status = 'Trial';

    GET DIAGNOSTICS terminated_count = ROW_COUNT;

    -- Log terminations
    INSERT INTO shared.subscription_change_log (
        tenant_id,
        old_subscription_plan_id,
        change_type,
        details
    )
    SELECT 
        ts.tenant_id,
        ts.subscription_plan_id,
        'Termination',
        jsonb_build_object('reason', 'Free trial expired')
    FROM shared.tenant_subscriptions ts
    WHERE ts.is_trial = TRUE
    AND ts.trial_end_date < CURRENT_TIMESTAMP
    AND ts.status = 'Expired';

    RETURN terminated_count;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON shared.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
    BEFORE UPDATE ON shared.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger for tenant_subscriptions
CREATE TRIGGER audit_tenant_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON shared.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION shared.audit_trigger();

-- Function to check appointment limit for Starter Plan
CREATE OR REPLACE FUNCTION check_appointment_limit()
RETURNS TRIGGER AS $$
DECLARE
    subscription_record RECORD;
    current_count INTEGER;
BEGIN
    -- Get tenant's subscription
    SELECT sp.appointment_limit, ts.appointment_count
    INTO subscription_record
    FROM shared.tenant_subscriptions ts
    JOIN shared.subscription_plans sp ON ts.subscription_plan_id = sp.id
    WHERE ts.tenant_id = NEW.tenant_id AND ts.status = 'Active';

    IF subscription_record.appointment_limit IS NOT NULL THEN
        -- Count existing appointments
        SELECT COUNT(*) INTO current_count
        FROM client_appointments
        WHERE tenant_id = NEW.tenant_id
        AND cancellation_reason IS NULL;

        IF current_count >= subscription_record.appointment_limit THEN
            RAISE EXCEPTION 'Appointment limit of % reached for tenant %', 
                subscription_record.appointment_limit, NEW.tenant_id;
        END IF;

        -- Update appointment count
        UPDATE shared.tenant_subscriptions
        SET appointment_count = appointment_count + 1
        WHERE tenant_id = NEW.tenant_id AND status = 'Active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_appointment_limit_trigger
    BEFORE INSERT ON client_appointments
    FOR EACH ROW EXECUTE FUNCTION check_appointment_limit();

-- Function to soft delete users
CREATE OR REPLACE FUNCTION soft_delete_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE shared.tenants
    SET is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup soft-deleted users after retention period
CREATE OR REPLACE FUNCTION cleanup_deleted_users(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM shared.tenants
    WHERE is_deleted = TRUE
    AND deleted_at < CURRENT_DATE - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables (drop first to allow re-creation)
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_products_updated_at ON services_and_products;
CREATE TRIGGER update_services_products_updated_at BEFORE UPDATE ON services_and_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrers_updated_at ON referrers;
CREATE TRIGGER update_referrers_updated_at BEFORE UPDATE ON referrers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_third_party_updated_at ON third_party;
CREATE TRIGGER update_third_party_updated_at BEFORE UPDATE ON third_party 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_insurance_updated_at ON client_insurance;
CREATE TRIGGER update_client_insurance_updated_at BEFORE UPDATE ON client_insurance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_contacts_updated_at ON client_contacts;
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_diagnoses_updated_at ON client_diagnoses;
CREATE TRIGGER update_client_diagnoses_updated_at BEFORE UPDATE ON client_diagnoses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON client_appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON client_appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_notes_updated_at ON client_notes;
CREATE TRIGGER update_client_notes_updated_at BEFORE UPDATE ON client_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_forms_updated_at ON client_forms;
CREATE TRIGGER update_client_forms_updated_at BEFORE UPDATE ON client_forms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_communication_updated_at ON client_communication;
CREATE TRIGGER update_client_communication_updated_at BEFORE UPDATE ON client_communication 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packs_updated_at ON packs;
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pack_instances_updated_at ON pack_instances;
CREATE TRIGGER update_pack_instances_updated_at BEFORE UPDATE ON pack_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pack_sessions_updated_at ON pack_sessions;
CREATE TRIGGER update_pack_sessions_updated_at BEFORE UPDATE ON pack_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoice_items_updated_at ON invoice_items;
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoice_payments_updated_at ON invoice_payments;
CREATE TRIGGER update_invoice_payments_updated_at BEFORE UPDATE ON invoice_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_statements_updated_at ON statements;
CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON statements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set client_name in related tables
CREATE OR REPLACE FUNCTION set_client_name()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'referrals' THEN
        SELECT full_name INTO NEW.client_name FROM clients WHERE client_number = NEW.client_number;
    ELSIF TG_TABLE_NAME = 'client_insurance' THEN
        SELECT first_name, last_name INTO NEW.client_first_name, NEW.client_last_name 
        FROM clients WHERE client_number = NEW.client_number;
    ELSIF TG_TABLE_NAME = 'client_contacts' THEN
        SELECT full_name INTO NEW.client_name FROM clients WHERE client_number = NEW.client_number;
    ELSIF TG_TABLE_NAME = 'client_diagnoses' THEN
        SELECT full_name INTO NEW.client_name FROM clients WHERE client_number = NEW.client_number;
    ELSIF TG_TABLE_NAME = 'client_communication' THEN
        SELECT full_name INTO NEW.client_name FROM clients WHERE client_number = NEW.client_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply client name triggers
DROP TRIGGER IF EXISTS set_referrals_client_name ON referrals;
CREATE TRIGGER set_referrals_client_name BEFORE INSERT OR UPDATE ON referrals 
    FOR EACH ROW EXECUTE FUNCTION set_client_name();

DROP TRIGGER IF EXISTS set_insurance_client_name ON client_insurance;
CREATE TRIGGER set_insurance_client_name BEFORE INSERT OR UPDATE ON client_insurance 
    FOR EACH ROW EXECUTE FUNCTION set_client_name();

DROP TRIGGER IF EXISTS set_contacts_client_name ON client_contacts;
CREATE TRIGGER set_contacts_client_name BEFORE INSERT OR UPDATE ON client_contacts 
    FOR EACH ROW EXECUTE FUNCTION set_client_name();

DROP TRIGGER IF EXISTS set_diagnoses_client_name ON client_diagnoses;
CREATE TRIGGER set_diagnoses_client_name BEFORE INSERT OR UPDATE ON client_diagnoses 
    FOR EACH ROW EXECUTE FUNCTION set_client_name();

DROP TRIGGER IF EXISTS set_communication_client_name ON client_communication;
CREATE TRIGGER set_communication_client_name BEFORE INSERT OR UPDATE ON client_communication 
    FOR EACH ROW EXECUTE FUNCTION set_client_name();

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(10,2) := 0;
    invoice_tax DECIMAL(10,4) := 0;
BEGIN
    -- Calculate totals for the invoice
    SELECT 
        COALESCE(SUM(amount - discount), 0),
        COALESCE(SUM((amount - discount) * tax_rate), 0)
    INTO invoice_total, invoice_tax
    FROM invoice_items 
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Update the invoice
    UPDATE invoices 
    SET 
        total = invoice_total,
        total_tax = invoice_tax,
        updated_at = CURRENT_TIMESTAMP
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply invoice calculation triggers
DROP TRIGGER IF EXISTS calculate_invoice_totals_insert ON invoice_items;
CREATE TRIGGER calculate_invoice_totals_insert AFTER INSERT ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

DROP TRIGGER IF EXISTS calculate_invoice_totals_update ON invoice_items;
CREATE TRIGGER calculate_invoice_totals_update AFTER UPDATE ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

DROP TRIGGER IF EXISTS calculate_invoice_totals_delete ON invoice_items;
CREATE TRIGGER calculate_invoice_totals_delete AFTER DELETE ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

-- Function to update pack usage
CREATE OR REPLACE FUNCTION update_pack_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pack_instances 
        SET 
            units_used = units_used + 1,
            updated_at = CURRENT_TIMESTAMP,
            pack_is_open = CASE 
                WHEN units_used + 1 >= maximum_units_in_pack THEN FALSE 
                ELSE TRUE 
            END
        WHERE id = NEW.sale_pack_instance_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pack_instances 
        SET 
            units_used = GREATEST(units_used - 1, 0),
            updated_at = CURRENT_TIMESTAMP,
            pack_is_open = TRUE
        WHERE id = OLD.sale_pack_instance_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply pack usage triggers
DROP TRIGGER IF EXISTS update_pack_usage_insert ON pack_sessions;
CREATE TRIGGER update_pack_usage_insert AFTER INSERT ON pack_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_pack_usage();

DROP TRIGGER IF EXISTS update_pack_usage_delete ON pack_sessions;
CREATE TRIGGER update_pack_usage_delete AFTER DELETE ON pack_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_pack_usage();

-- Function to calculate statement totals
CREATE OR REPLACE FUNCTION calculate_statement_totals()
RETURNS TRIGGER AS $$
DECLARE
    statement_record RECORD;
    total_price_calc DECIMAL(10,2) := 0;
    total_payments_calc DECIMAL(10,2) := 0;
    total_owing_calc DECIMAL(10,2) := 0;
BEGIN
    -- Get statement details
    SELECT * INTO statement_record FROM statements WHERE id = NEW.id;
    
    -- Calculate total price from invoices in the period
    SELECT COALESCE(SUM(total), 0) INTO total_price_calc
    FROM invoices 
    WHERE client_number = statement_record.client_number 
    AND date >= statement_record.start_date 
    AND date <= statement_record.end_date;
    
    -- Calculate total payments in the period
    SELECT COALESCE(SUM(amount), 0) INTO total_payments_calc
    FROM payments p
    WHERE p.client_id = statement_record.client_number 
    AND p.dt_received >= statement_record.start_date 
    AND p.dt_received <= statement_record.end_date;
    
    -- Calculate total owing
    total_owing_calc := total_price_calc - total_payments_calc;
    
    -- Update the statement
    UPDATE statements 
    SET 
        total_price = total_price_calc,
        total_payments = total_payments_calc,
        total_owing = total_owing_calc,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply statement calculation trigger
DROP TRIGGER IF EXISTS calculate_statement_totals_trigger ON statements;
CREATE TRIGGER calculate_statement_totals_trigger AFTER INSERT ON statements 
    FOR EACH ROW EXECUTE FUNCTION calculate_statement_totals();

-- Function to validate appointment times
CREATE OR REPLACE FUNCTION validate_appointment_times()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure end time is after start time
    IF NEW.end_time <= NEW.start_time THEN
        RAISE EXCEPTION 'Appointment end time must be after start time';
    END IF;
    
    -- Set last_modified timestamp
    NEW.last_modified = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply appointment validation trigger
DROP TRIGGER IF EXISTS validate_appointment_times_trigger ON client_appointments;
CREATE TRIGGER validate_appointment_times_trigger BEFORE INSERT OR UPDATE ON client_appointments 
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_times();

-- Function to ensure only one default referral per client
CREATE OR REPLACE FUNCTION enforce_single_default_referral()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        -- Set all other referrals for this client to non-default
        UPDATE referrals 
        SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE client_number = NEW.client_number 
        AND referral_id != NEW.referral_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply default referral trigger
DROP TRIGGER IF EXISTS enforce_single_default_referral_trigger ON referrals;
CREATE TRIGGER enforce_single_default_referral_trigger BEFORE INSERT OR UPDATE ON referrals 
    FOR EACH ROW EXECUTE FUNCTION enforce_single_default_referral();

-- Function to ensure only one default insurance per client
CREATE OR REPLACE FUNCTION enforce_single_default_insurance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default_for_new_invoices = TRUE THEN
        -- Set all other insurance records for this client to non-default
        UPDATE client_insurance 
        SET is_default_for_new_invoices = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE client_number = NEW.client_number 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply default insurance trigger
DROP TRIGGER IF EXISTS enforce_single_default_insurance_trigger ON client_insurance;
CREATE TRIGGER enforce_single_default_insurance_trigger BEFORE INSERT OR UPDATE ON client_insurance 
    FOR EACH ROW EXECUTE FUNCTION enforce_single_default_insurance();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Client summary view
DROP VIEW IF EXISTS client_summary;
CREATE VIEW client_summary AS
SELECT 
    c.client_number,
    c.tenant_id,
    c.full_name,
    c.email,
    c.mobile_number,
    c.status,
    c.created_at,
    COUNT(DISTINCT ca.appointment_id) as total_appointments,
    COUNT(DISTINCT i.invoice_id) as total_invoices,
    COALESCE(SUM(i.total), 0) as total_invoiced,
    COALESCE(SUM(i.paid), 0) as total_paid,
    COALESCE(SUM(i.total - i.paid), 0) as total_owing,
    MAX(ca.start_time) as last_appointment_date,
    MAX(i.date) as last_invoice_date
FROM clients c
LEFT JOIN client_appointments ca ON c.client_number = ca.client_number
LEFT JOIN invoices i ON c.client_number = i.client_number
GROUP BY c.client_number, c.tenant_id, c.full_name, c.email, c.mobile_number, c.status, c.created_at;

-- Invoice summary view
DROP VIEW IF EXISTS invoice_summary;
CREATE VIEW invoice_summary AS
SELECT 
    i.invoice_id,
    i.tenant_id,
    i.invoice_number,
    i.client_number,
    i.full_name,
    i.date,
    i.due_date,
    i.total,
    i.paid,
    (i.total - i.paid) as balance,
    i.total_tax,
    CASE 
        WHEN i.dt_invoice_paid IS NOT NULL THEN 'Paid'
        WHEN i.due_date < CURRENT_DATE THEN 'Overdue'
        ELSE 'Pending'
    END as status,
    COUNT(ii.invoice_item_id) as item_count
FROM invoices i
LEFT JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
GROUP BY i.invoice_id, i.tenant_id, i.invoice_number, i.client_number, i.full_name, 
         i.date, i.due_date, i.total, i.paid, i.total_tax, i.dt_invoice_paid;

-- Appointment schedule view
DROP VIEW IF EXISTS appointment_schedule;
CREATE VIEW appointment_schedule AS
SELECT 
    ca.appointment_id,
    ca.tenant_id,
    ca.client_number,
    ca.full_name,
    ca.start_time,
    ca.end_time,
    ca.appointment_status_id,
    ca.appointment_type_id,
    ca.diary,
    ca.location,
    ca.notes,
    EXTRACT(EPOCH FROM (ca.end_time - ca.start_time))/60 as duration_minutes,
    c.mobile_number,
    c.email
FROM client_appointments ca
JOIN clients c ON ca.client_number = c.client_number;

-- Pack utilization view
DROP VIEW IF EXISTS pack_utilization;
CREATE VIEW pack_utilization AS
SELECT 
    pi.id,
    pi.tenant_id,
    pi.client_id,
    pi.client_name,
    pi.name,
    pi.maximum_units_in_pack,
    pi.units_used,
    (pi.maximum_units_in_pack - pi.units_used) as units_remaining,
    ROUND((pi.units_used / pi.maximum_units_in_pack) * 100, 2) as utilization_percentage,
    pi.expiry_date,
    pi.pack_is_open,
    pi.status,
    pi.created_at
FROM pack_instances pi;

-- Financial summary view
DROP VIEW IF EXISTS financial_summary;
CREATE VIEW financial_summary AS
SELECT 
    tenant_id,
    DATE_TRUNC('month', date) as month,
    COUNT(DISTINCT invoice_id) as total_invoices,
    SUM(total) as total_invoiced,
    SUM(paid) as total_collected,
    SUM(total - paid) as total_outstanding,
    AVG(total) as average_invoice_value
FROM invoices
GROUP BY tenant_id, DATE_TRUNC('month', date);

-- =====================================================
-- STORED PROCEDURES FOR BUSINESS LOGIC
-- =====================================================

-- Procedure to create a new appointment with validations
CREATE OR REPLACE FUNCTION create_appointment(
    p_tenant_id UUID,
    p_client_number INTEGER,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_diary VARCHAR(255),
    p_location VARCHAR(255) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_appointment_type VARCHAR(50) DEFAULT 'Client Appointment'
)
RETURNS INTEGER AS $$
DECLARE
    new_appointment_id INTEGER;
    client_name VARCHAR(255);
BEGIN
    -- Get client name
    SELECT full_name INTO client_name FROM clients WHERE client_number = p_client_number;
    
    IF client_name IS NULL THEN
        RAISE EXCEPTION 'Client not found with number: %', p_client_number;
    END IF;
    
    -- Validate appointment times
    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'Appointment end time must be after start time';
    END IF;
    
    -- Insert the appointment
    INSERT INTO client_appointments (
        tenant_id, client_number, full_name, start_time, end_time, 
        diary, location, notes, appointment_type_id
    ) VALUES (
        p_tenant_id, p_client_number, client_name, p_start_time, p_end_time,
        p_diary, p_location, p_notes, p_appointment_type
    ) RETURNING appointment_id INTO new_appointment_id;
    
    RETURN new_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to process payment and update invoices
CREATE OR REPLACE FUNCTION process_payment(
    p_tenant_id UUID,
    p_client_number INTEGER,
    p_amount DECIMAL(10,2),
    p_payment_method VARCHAR(50),
    p_notes TEXT DEFAULT NULL,
    p_invoice_ids INTEGER[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_payment_id INTEGER;
    client_name VARCHAR(255);
    remaining_amount DECIMAL(10,2);
    invoice_id INTEGER;
    invoice_balance DECIMAL(10,2);
    payment_amount DECIMAL(10,2);
BEGIN
    -- Get client name
    SELECT full_name INTO client_name FROM clients WHERE client_number = p_client_number;
    
    IF client_name IS NULL THEN
        RAISE EXCEPTION 'Client not found with number: %', p_client_number;
    END IF;
    
    -- Insert the payment
    INSERT INTO payments (
        tenant_id, client_id, payment_method, notes, amount, full_name
    ) VALUES (
        p_tenant_id, p_client_number, p_payment_method, p_notes, p_amount, client_name
    ) RETURNING payment_id INTO new_payment_id;
    
    -- If specific invoices are provided, allocate payment to them
    IF p_invoice_ids IS NOT NULL THEN
        remaining_amount := p_amount;
        
        FOREACH invoice_id IN ARRAY p_invoice_ids
        LOOP
            EXIT WHEN remaining_amount <= 0;
            
            -- Get invoice balance
            SELECT (total - paid) INTO invoice_balance 
            FROM invoices 
            WHERE invoice_id = invoice_id AND client_number = p_client_number;
            
            IF invoice_balance > 0 THEN
                -- Calculate payment amount for this invoice
                payment_amount := LEAST(remaining_amount, invoice_balance);
                
                -- Insert invoice payment record
                INSERT INTO invoice_payments (
                    tenant_id, invoice_id, payment_id, amount
                ) VALUES (
                    p_tenant_id, invoice_id, new_payment_id, payment_amount
                );
                
                -- Update invoice paid amount
                UPDATE invoices 
                SET 
                    paid = paid + payment_amount,
                    dt_invoice_paid = CASE 
                        WHEN (paid + payment_amount) >= total THEN CURRENT_TIMESTAMP 
                        ELSE dt_invoice_paid 
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE invoice_id = invoice_id;
                
                remaining_amount := remaining_amount - payment_amount;
            END IF;
        END LOOP;
    END IF;
    
    RETURN new_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to create invoice with items
CREATE OR REPLACE FUNCTION create_invoice(
    p_tenant_id UUID,
    p_client_number INTEGER,
    p_summary VARCHAR(500) DEFAULT NULL,
    p_items JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_invoice_id INTEGER;
    client_name VARCHAR(255);
    item JSONB;
BEGIN
    -- Get client name
    SELECT full_name INTO client_name FROM clients WHERE client_number = p_client_number;
    
    IF client_name IS NULL THEN
        RAISE EXCEPTION 'Client not found with number: %', p_client_number;
    END IF;
    
    -- Insert the invoice
    INSERT INTO invoices (
        tenant_id, client_number, full_name, summary
    ) VALUES (
        p_tenant_id, p_client_number, client_name, p_summary
    ) RETURNING invoice_id INTO new_invoice_id;
    
    -- Insert invoice items if provided
    IF p_items IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO invoice_items (
                tenant_id,
                invoice_id,
                client_number,
                full_name,
                saleable_name,
                description,
                item_qty,
                amount,
                discount,
                tax_rate,
                code
            ) VALUES (
                p_tenant_id,
                new_invoice_id,
                p_client_number,
                client_name,
                item->>'saleable_name',
                item->>'description',
                COALESCE((item->>'item_qty')::DECIMAL(6,3), 1.000),
                (item->>'amount')::DECIMAL(10,2),
                COALESCE((item->>'discount')::DECIMAL(10,4), 0.0000),
                COALESCE((item->>'tax_rate')::DECIMAL(6,5), 0.10000),
                item->>'code'
            );
        END LOOP;
    END IF;
    
    RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) FOR MULTI-TENANCY
-- =====================================================

-- Enable RLS on all tenant tables (idempotent, as ENABLE is safe to repeat)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_and_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_party ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first for idempotency)
DROP POLICY IF EXISTS tenant_isolation_clients ON clients;
CREATE POLICY tenant_isolation_clients ON clients
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUDIT LOG SYSTEM
-- =====================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS shared.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES shared.tenants(id),
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit log index
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_table ON shared.audit_log(tenant_id, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON shared.audit_log(created_at);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION shared.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO shared.audit_log (
            tenant_id, table_name, record_id, operation, old_values
        ) VALUES (
            OLD.tenant_id, TG_TABLE_NAME, 
            CASE TG_TABLE_NAME
                WHEN 'clients' THEN OLD.client_number
                WHEN 'referrers' THEN OLD.number
                ELSE OLD.id
            END,
            TG_OP, to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO shared.audit_log (
            tenant_id, table_name, record_id, operation, new_values
        ) VALUES (
            NEW.tenant_id, TG_TABLE_NAME,
            CASE TG_TABLE_NAME
                WHEN 'clients' THEN NEW.client_number
                WHEN 'referrers' THEN NEW.number
                ELSE NEW.id
            END,
            TG_OP, to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO shared.audit_log (
            tenant_id, table_name, record_id, operation, old_values, new_values
        ) VALUES (
            NEW.tenant_id, TG_TABLE_NAME,
            CASE TG_TABLE_NAME
                WHEN 'clients' THEN NEW.client_number
                WHEN 'referrers' THEN NEW.number
                ELSE NEW.id
            END,
            TG_OP, to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA INSERTION (FOR TESTING)
-- =====================================================

-- Insert sample tenant (skip if exists via ON CONFLICT)
-- INSERT INTO shared.tenants (id, name, domain, database_name) 
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'Demo Practice', 'demo.zandahealth.com', 'demo_practice')
-- ON CONFLICT (domain) DO NOTHING;

-- -- Set tenant context for sample data
-- SELECT set_tenant_context('123e4567-e89b-12d3-a456-426614174000');

-- -- Insert sample data (using the tenant_id, skip if exists)
-- INSERT INTO suppliers (tenant_id, name) 
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'Demo Physiotherapy Clinic')
-- ON CONFLICT DO NOTHING;

-- INSERT INTO services_and_products (tenant_id, type, code, name, price) VALUES
-- ('123e4567-e89b-12d3-a456-426614174000', 'Service', 'PHYSIO', 'Physiotherapy Session', 120.00),
-- ('123e4567-e89b-12d3-a456-426614174000', 'Service', 'MASSAGE', 'Massage Therapy', 100.00),
-- ('123e4567-e89b-12d3-a456-426614174000', 'Product', 'SUPPORT', 'Back Support', 45.00)

-- Insert sample subscription plans
-- INSERT INTO shared.subscription_plans (id, name, base_price, appointment_limit, user_limit, practitioner_limit, file_storage_limit, features)
-- VALUES
--     ('550e8400-e29b-41d4-a716-446655440001', 'Starter', 19.00, 1000, 1, 1, 100000000000, 
--      '{
--         "telehealth": true,
--         "billing": true,
--         "client_portal": true,
--         "appointment_reminders": true,
--         "paperless_forms": true,
--         "progress_notes": true,
--         "basic_data_import": true,
--         "support": ["chat", "email"]
--      }'),
--     ('550e8400-e29b-41d4-a716-446655440002', 'Growth_Solo', 49.00, NULL, NULL, 1, NULL,
--      '{
--         "telehealth": true,
--         "billing": true,
--         "client_portal": true,
--         "appointment_reminders": true,
--         "paperless_forms": true,
--         "progress_notes": true,
--         "custom_notes": true,
--         "practice_manual": true,
--         "multiple_locations": true,
--         "room_management": true,
--         "comprehensive_import": true,
--         "support": ["chat", "email", "video"]
--      }'),
--     ('550e8400-e29b-41d4-a716-446655440003', 'Growth_Group', 49.00, NULL, NULL, NULL, NULL,
--      '{
--         "telehealth": true,
--         "billing": true,
--         "client_portal": true,
--         "appointment_reminders": true,
--         "paperless_forms": true,
--         "progress_notes": true,
--         "custom_notes": true,
--         "practice_manual": true,
--         "multiple_locations": true,
--         "room_management": true,
--         "bulk_communication": true,
--         "comprehensive_reports": true,
--         "comprehensive_import": true,
--         "support": ["chat", "email", "video"]
--      }')
-- ON CONFLICT (tenant_id, code) DO NOTHING;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- View for monitoring table sizes
DROP VIEW IF EXISTS shared.table_sizes;
CREATE VIEW shared.table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
    pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_tables 
WHERE schemaname IN ('tenants', 'shared')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- View for monitoring index usage
-- View for monitoring index usage
DROP VIEW IF EXISTS shared.index_usage;
CREATE VIEW shared.index_usage AS
SELECT 
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname IN ('tenants', 'shared')
ORDER BY idx_scan DESC;
-- =====================================================
-- BACKUP AND MAINTENANCE PROCEDURES
-- =====================================================

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION shared.archive_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM shared.audit_log 
    WHERE created_at < CURRENT_DATE - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired pack instances
CREATE OR REPLACE FUNCTION cleanup_expired_packs()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE pack_instances 
    SET 
        status = 'Expired',
        pack_is_open = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE expiry_date < CURRENT_DATE 
    AND status != 'Expired';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- FINAL NOTES
-- =====================================================
-- Schema creation complete. For production, add constraints, foreign keys checks, and backups.
