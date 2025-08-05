#!/bin/bash
echo "Starting dev server..."
npm run dev &
PID=$!
echo "Server PID: $PID"

sleep 5

echo "Checking if server is running..."
if ps -p $PID > /dev/null; then
    echo "Server process is running"
    
    echo "Checking port 3000..."
    if ss -tln | grep -q ":3000"; then
        echo "Port 3000 is listening"
        
        echo "Testing health endpoint..."
        curl -s http://localhost:3000/api/health && echo "" || echo "Health endpoint failed"
    else
        echo "Port 3000 is NOT listening"
    fi
else
    echo "Server process died"
fi

echo "Checking for any error logs..."
tail -20 npm-debug.log 2>/dev/null || echo "No npm debug log"

# Keep the server running
wait $PID