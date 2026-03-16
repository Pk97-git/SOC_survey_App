# Run as Administrator
# Enable proxy in IIS

Import-Module WebAdministration

# Try to set the proxy setting
try {
    Set-WebConfigurationProperty -Filter "/system.webServer/proxy" -Name enabled -Value "True" -PSPath "IIS:\Sites\SOCSurvey" -ErrorAction Stop
    Write-Host "Proxy enabled successfully!"
} catch {
    Write-Host "Error: $_"
    Write-Host "Trying alternate method..."
    
    # Try at root level
    Set-WebConfigurationProperty -Filter "/system.webServer/proxy" -Name enabled -Value "True" -PSPath "IIS:\"
    Write-Host "Proxy enabled at root level!"
}
