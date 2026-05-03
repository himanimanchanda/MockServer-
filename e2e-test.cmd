@echo off
setlocal

echo === Creating mock via /api/mocks ===
curl -s -X POST "http://localhost:8080/api/mocks" ^
  -H "Content-Type: application/json" ^
  -d "{\"endpoint\":\"/users/{id}\",\"method\":\"GET\",\"responseBody\":\"{\\\"message\\\":\\\"ok\\\",\\\"id\\\":123}\",\"statusCode\":200,\"headers\":{\"X-Mocked\":\"true\"},\"delayMs\":0,\"environment\":\"DEV\"}"
echo.

echo === Hitting mock engine endpoint (/users/123) ===
curl -i -s -X GET "http://localhost:8080/users/123" -H "X-Environment: DEV"
echo.

echo === Fetching logs (/api/logs) ===
curl -s "http://localhost:8080/api/logs?limit=50"
echo.

endlocal
