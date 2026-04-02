param(
    [Parameter(Mandatory = $false)]
    [string]$ApiBase = "http://localhost:8080",

    [Parameter(Mandatory = $false)]
    [string]$Email,

    [Parameter(Mandatory = $false)]
    [string]$UID,

    [Parameter(Mandatory = $false)]
    [string]$Secret
)

$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey('ApiBase') -and $env:API_HOST_PORT) {
    $ApiBase = "http://localhost:$($env:API_HOST_PORT)"
}

if (-not $Email -and -not $UID) {
    throw "Provide either -Email or -UID."
}

if (-not $Secret) {
    $Secret = $env:ADMIN_BOOTSTRAP_SECRET
}

if (-not $Secret) {
    throw "Missing bootstrap secret. Pass -Secret or set ADMIN_BOOTSTRAP_SECRET in environment."
}

$body = @{}
if ($Email) { $body.email = $Email }
if ($UID) { $body.uid = $UID }

$uri = "$ApiBase/api/v1/admin/bootstrap"

Write-Host "Calling $uri ..."
$response = Invoke-RestMethod -Method Post -Uri $uri -Headers @{
    "X-Admin-Bootstrap-Secret" = $Secret
} -ContentType "application/json" -Body ($body | ConvertTo-Json)

Write-Host "Bootstrap successful:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 5
