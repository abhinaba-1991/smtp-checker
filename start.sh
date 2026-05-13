#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MailProbe — SMTP & Email Validator     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org (v16+)${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo -e "${RED}✗ Node.js v16+ required. Current: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Install backend deps
echo ""
echo -e "${YELLOW}▶ Installing backend dependencies...${NC}"
cd backend
npm install --silent
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install frontend deps
echo ""
echo -e "${YELLOW}▶ Installing frontend dependencies...${NC}"
cd frontend
npm install --silent
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo -e "${BLUE}▶ Starting servers...${NC}"
echo ""

# Start backend in background
cd backend
node server.js &
BACKEND_PID=$!
cd ..

sleep 1

# Verify backend is up
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${GREEN}✓ Backend API running  →  http://localhost:5000${NC}"
else
  echo -e "${RED}✗ Backend failed to start. Check for port 5000 conflicts.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Starting frontend    →  http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Open ${GREEN}http://localhost:3000${NC} in your browser"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both servers"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping servers...${NC}"
  kill $BACKEND_PID 2>/dev/null
  echo -e "${GREEN}Done. Goodbye!${NC}"
  exit 0
}
trap cleanup INT

# Start frontend (foreground)
cd frontend
BROWSER=true npm start

wait $BACKEND_PID
