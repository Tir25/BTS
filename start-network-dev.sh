#!/bin/bash

echo "🌐 Starting Cross-Laptop Development Environment"
echo "================================================"

echo ""
echo "📡 Detecting network configuration..."
if command -v ip &> /dev/null; then
    ip addr show | grep "inet " | grep -v "127.0.0.1"
elif command -v ifconfig &> /dev/null; then
    ifconfig | grep "inet " | grep -v "127.0.0.1"
else
    echo "Network configuration not detected"
fi

echo ""
echo "🚀 Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "🎨 Starting Frontend Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "⏳ Waiting for frontend to start..."
sleep 3

echo ""
echo "🌐 Opening Network Test Client..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://192.168.1.2:5173/network-test-client.html
elif command -v open &> /dev/null; then
    open http://192.168.1.2:5173/network-test-client.html
else
    echo "Please open http://192.168.1.2:5173/network-test-client.html in your browser"
fi

echo ""
echo "🎉 Cross-Laptop Development Environment Started!"
echo ""
echo "📱 Access URLs:"
echo "   Main App: http://192.168.1.2:5173/"
echo "   Network Test: http://192.168.1.2:5173/network-test-client.html"
echo "   Backend API: http://192.168.1.2:3000/"
echo "   Health Check: http://192.168.1.2:3000/health"
echo ""
echo "💡 Share these URLs with other laptops on your network!"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
