-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create table users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    cpf VARCHAR(14) UNIQUE NOT NULL,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'master_operator')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- create table devices
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    category VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    asset_number VARCHAR(50),
    origin VARCHAR(20) CHECK (origin IN ('Locado', 'Próprio')),
    condition VARCHAR(20) CHECK (condition IN ('Novo', 'Usado', 'Avariado')),
    invoice_number VARCHAR(50),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'waiting_acceptance', 'damaged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes for devices
CREATE INDEX IF NOT EXISTS idx_devices_code ON devices(code);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_category ON devices(category);

-- create table assignments
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_ids UUID[] NOT NULL,
    assignment_date DATE NOT NULL,
    term_accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_ip INET,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_term_accepted ON assignments(term_accepted);

-- create table returns
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    return_date DATE NOT NULL,
    inspection_checklist JSONB,
    condition VARCHAR(20) CHECK (condition IN ('Bom', 'Avariado')),
    notes TEXT,
    report_type VARCHAR(20) CHECK (report_type IN ('Devolução', 'Avaria')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes for returns
CREATE INDEX IF NOT EXISTS idx_returns_assignment_id ON returns(assignment_id);
CREATE INDEX IF NOT EXISTS idx_returns_condition ON returns(condition);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON users TO anon;
GRANT ALL ON users TO authenticated;
GRANT SELECT ON devices TO anon;
GRANT ALL ON devices TO authenticated;
GRANT SELECT ON assignments TO anon;
GRANT ALL ON assignments TO authenticated;
GRANT SELECT ON returns TO anon;
GRANT ALL ON returns TO authenticated;

-- Create policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Admins can manage all users" ON users FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "View all devices" ON devices FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage devices" ON devices FOR ALL USING (auth.role() = 'authenticated');
