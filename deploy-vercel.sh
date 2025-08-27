#!/bin/bash

# 🚀 Vercel Deployment Script for Bus Tracking System
# This script automates the deployment process to Vercel

set -e  # Exit on any error

echo "🚀 Starting Vercel Deployment for Bus Tracking System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
check_vercel_cli() {
    print_status "Checking Vercel CLI installation..."
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
        print_success "Vercel CLI installed successfully"
    else
        print_success "Vercel CLI is already installed"
    fi
}

# Check if user is logged in to Vercel
check_vercel_login() {
    print_status "Checking Vercel login status..."
    if ! vercel whoami &> /dev/null; then
        print_warning "Not logged in to Vercel. Please login..."
        vercel login
    else
        print_success "Already logged in to Vercel"
    fi
}

# Build the frontend
build_frontend() {
    print_status "Building frontend application..."
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Run optimized build
    print_status "Running optimized build..."
    npm run build:optimized
    
    if [ $? -eq 0 ]; then
        print_success "Frontend build completed successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
}

# Set environment variables
set_environment_variables() {
    print_status "Setting environment variables..."
    
    # Check if environment variables are already set
    if vercel env ls | grep -q "VITE_SUPABASE_URL"; then
        print_warning "Environment variables already exist. Skipping..."
        return
    fi
    
    # Set environment variables
    echo "Setting VITE_SUPABASE_URL..."
    echo "https://gthwmwfwvhyriygpcdlr.supabase.co" | vercel env add VITE_SUPABASE_URL production
    
    echo "Setting VITE_SUPABASE_ANON_KEY..."
    echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI" | vercel env add VITE_SUPABASE_ANON_KEY production
    
    echo "Setting VITE_API_URL..."
    echo "https://bus-tracking-backend-sxh8.onrender.com" | vercel env add VITE_API_URL production
    
    echo "Setting VITE_WEBSOCKET_URL..."
    echo "wss://bus-tracking-backend-sxh8.onrender.com" | vercel env add VITE_WEBSOCKET_URL production
    
    print_success "Environment variables set successfully"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Deploy with production flag
    vercel --prod --yes
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
        print_status "Your app is now live on Vercel"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# Post-deployment verification
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Get the deployment URL
    DEPLOYMENT_URL=$(vercel ls | grep -o 'https://[^[:space:]]*' | head -1)
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        print_success "Deployment URL: $DEPLOYMENT_URL"
        print_status "Testing deployment..."
        
        # Simple health check
        if curl -s -f "$DEPLOYMENT_URL" > /dev/null; then
            print_success "Deployment is accessible"
        else
            print_warning "Deployment might still be building. Please check manually."
        fi
    else
        print_warning "Could not retrieve deployment URL. Please check Vercel dashboard."
    fi
}

# Main deployment process
main() {
    echo "Starting deployment process..."
    echo ""
    
    # Step 1: Check prerequisites
    check_vercel_cli
    check_vercel_login
    
    # Step 2: Build frontend
    build_frontend
    
    # Step 3: Set environment variables
    set_environment_variables
    
    # Step 4: Deploy
    deploy_to_vercel
    
    # Step 5: Verify
    verify_deployment
    
    echo ""
    echo "🎉 Deployment process completed!"
    echo "=================================================="
    echo "Next steps:"
    echo "1. Check your Vercel dashboard for the deployment"
    echo "2. Test all functionality on the live site"
    echo "3. Set up custom domain if needed"
    echo "4. Configure monitoring and analytics"
    echo ""
    echo "For troubleshooting, see: VERCEL_DEPLOYMENT_GUIDE.md"
}

# Run the main function
main "$@"
