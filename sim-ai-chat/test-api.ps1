# PowerShell script to test Sim AI API

$headers = @{
    'X-API-Key' = 'sk-sim-1r38ygbNyRtwlljVpbHsCv8MEoMTaQiY'
    'Content-Type' = 'application/json'
}

$body = @{
    message = 'what is my assignments'
} | ConvertTo-Json

Write-Host "Testing Sim AI API..."
Write-Host "URL: https://www.sim.ai/api/workflows/7ee65689-7400-4c22-9df9-bb67fac7561f/execute"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri 'https://www.sim.ai/api/workflows/7ee65689-7400-4c22-9df9-bb67fac7561f/execute' -Method POST -Headers $headers -Body $body -ContentType 'application/json'
    
    Write-Host "Response:"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Error occurred:"
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Full error:"
    Write-Host $_.Exception
}


