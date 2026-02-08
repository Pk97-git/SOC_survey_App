#!/bin/bash

# Database Setup Script for Facility Survey Backend

echo "🗄️  Setting up Facility Survey Database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL and try again."
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    else
        echo "Skipping database creation"
        exit 0
    fi
fi

# Create database
echo "📦 Creating database '$DB_NAME'..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database created successfully"
else
    echo "❌ Failed to create database"
    exit 1
fi

# Run schema
echo "📋 Running schema.sql..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully"
else
    echo "❌ Failed to create schema"
    exit 1
fi

# Create default admin user
echo "👤 Creating default admin user..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@example.com',
    '\$2a\$10\$YourHashedPasswordHere',
    'System Administrator',
    'admin'
) ON CONFLICT (email) DO NOTHING;
EOF

echo "✅ Default admin user created (email: admin@example.com, password: admin123)"
echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the admin password: npm run change-password"
echo "2. Start the server: npm run dev"
