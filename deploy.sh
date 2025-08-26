#!/bin/bash

# Bus Tracking System Docker Deployment Script
# Usage: ./deploy.sh [dev|prod]

set -e

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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp backend/env.production .env
        print_warning "Please update .env file with your actual values before deploying."
        exit 1
    fi
    print_success ".env file found"
}

# Build and deploy development environment
deploy_dev() {
    print_status "Deploying development environment..."
    
    # Stop existing containers
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    
    # Build and start containers
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_success "Development environment deployed successfully!"
    print_status "Backend is running on http://localhost:3000"
    print_status "View logs: docker-compose -f docker-compose.dev.yml logs -f backend"
}

# Build and deploy production environment
deploy_prod() {
    print_status "Deploying production environment..."
    
    # Stop existing containers
    docker-compose down --remove-orphans
    
    # Build and start containers
    docker-compose up --build -d
    
    print_success "Production environment deployed successfully!"
    print_status "Backend is running on http://localhost:3000"
    print_status "Nginx proxy is running on http://localhost:80"
    print_status "View logs: docker-compose logs -f backend"
}

# Show logs
show_logs() {
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f backend
    else
        docker-compose logs -f backend
    fi
}

# Stop containers
stop_containers() {
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker-compose down
    fi
    print_success "Containers stopped"
}

# Clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
    print_success "Cleanup completed"
}

# Main script
main() {
    print_status "Bus Tracking System Docker Deployment"
    print_status "======================================"
    
    check_docker
    check_env
    
    case "${1:-prod}" in
        "dev")
            deploy_dev
            ;;
        "prod")
            deploy_prod
            ;;
        "logs")
            show_logs "${2:-prod}"
            ;;
        "stop")
            stop_containers "${2:-prod}"
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [dev|prod|logs|stop|cleanup]"
            echo ""
            echo "Commands:"
            echo "  dev     - Deploy development environment"
            echo "  prod    - Deploy production environment (default)"
            echo "  logs    - Show container logs"
            echo "  stop    - Stop containers"
            echo "  cleanup - Clean up Docker resources"
            echo "  help    - Show this help message"
            ;;
        *)
            print_error "Invalid option: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
