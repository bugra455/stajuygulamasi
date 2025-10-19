#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting StajKontrol for Local Network Access${NC}"
echo "=================================================="

# Get local IP address
LOCAL_IP=$(hostname -i | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ip route get 1 | awk '{print $7; exit}')
fi

echo -e "${YELLOW}📍 Your local IP address: ${LOCAL_IP}${NC}"
echo -e "${YELLOW}🌐 Frontend will be accessible at: http://${LOCAL_IP}:5173${NC}"
echo -e "${YELLOW}🔗 Backend will be accessible at: http://${LOCAL_IP}:3000${NC}"
echo ""

# Function to start backend
start_backend() {
    echo -e "${BLUE}🔧 Starting Backend Server...${NC}"
    cd backend
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
        npm install
    fi
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
    cd ..
}

# Start servers
start_backend
sleep 3
start_frontend

echo ""
echo -e "${GREEN}🎉 Both servers are starting up!${NC}"
echo ""
echo -e "${BLUE}📱 Access from other devices on your network:${NC}"
echo -e "   Frontend: ${GREEN}http://${LOCAL_IP}:5173${NC}"
echo -e "   Backend:  ${GREEN}http://${LOCAL_IP}:3000${NC}"
echo ""
echo -e "${YELLOW}💡 Make sure your firewall allows connections on ports 3000 and 5173${NC}"
echo -e "${YELLOW}🔥 To stop servers, press Ctrl+C${NC}"
echo ""

# Wait for user to stop
trap 'echo -e "\n${RED}🛑 Stopping servers...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Keep script running
wait
