#!/bin/bash
RES=$(curl -s -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"garvit","password":"password"}')
TOKEN=$(echo $RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  # Try registering
  RES=$(curl -s -X POST http://localhost:8080/auth/register -H "Content-Type: application/json" -d '{"username":"garvit","password":"password"}')
  TOKEN=$(echo $RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi
echo "Token: $TOKEN"
curl -s -X POST http://localhost:8080/projects -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"hello"}'
