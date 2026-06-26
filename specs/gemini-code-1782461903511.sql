CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants (Cafes/Restaurants)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    currency_symbol VARCHAR(8) DEFAULT '₹',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Physical Dining Tables
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    label VARCHAR(16) NOT NULL,
    qr_shortcode VARCHAR(12) UNIQUE NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_table_label_per_tenant UNIQUE (tenant_id, label)
);

-- 3. Active Dining Sessions
CREATE TYPE session_status AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE dining_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    status session_status DEFAULT 'ACTIVE',
    opened_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);

-- 4. Menu Categories
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- 5. Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT
);

-- 6. Orders
CREATE TYPE order_status AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'SERVED');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES dining_sessions(id) ON DELETE CASCADE,
    order_number INTEGER NOT NULL,
    status order_status DEFAULT 'RECEIVED',
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    item_notes TEXT
);

-- Performance Indexes
CREATE INDEX idx_tables_shortcode ON tables(qr_shortcode);
CREATE INDEX idx_active_sessions ON dining_sessions(table_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_orders_session ON orders(session_id);