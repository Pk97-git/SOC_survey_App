# Download and install nginx for Windows
$nginxUrl = "https://nginx.org/download/nginx-1.24.0.zip"
$nginxZip = "$env:TEMP\nginx-1.24.0.zip"
$nginxFolder = "C:\nginx"

Write-Host "Downloading nginx..."
Invoke-WebRequest -Uri $nginxUrl -OutFile $nginxZip -UseBasicParsing

Write-Host "Extracting nginx..."
Expand-Archive -Path $nginxZip -DestinationPath $nginxFolder -Force

Write-Host "nginx installed to $nginxFolder"
Write-Host "To start nginx: $nginxFolder\nginx.exe"
