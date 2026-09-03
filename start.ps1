<#
.SYNOPSIS
    Starts the Flood Report backend and frontend together.

.DESCRIPTION
    Creates a Python virtual environment if needed, installs backend and
    frontend dependencies, then runs uvicorn and the Vite dev server in this
    one console. Ctrl+C stops both.

    Ports are fixed on purpose. The frontend hardcodes http://127.0.0.1:8000
    and the backend's CORS config only allows :5173, so both sides have to
    land where the other expects them. Vite is launched with --strictPort:
    without it, a busy 5173 makes Vite quietly move to 5174, and every API
    call then fails as a CORS error with nothing obvious pointing at the port.

.PARAMETER SkipInstall
    Skip dependency installation. Useful once everything is already set up.

.PARAMETER SmsProvider
    "console" (default) logs messages to this terminal and sends nothing.
    "messagebird" sends real, paid SMS and needs MESSAGEBIRD_API_KEY set.

.EXAMPLE
    .\start.ps1

.EXAMPLE
    .\start.ps1 -SkipInstall
#>

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [ValidateSet("console", "messagebird")]
    [string]$SmsProvider = "console",
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root "Backend"
$FrontendDir = Join-Path $Root "Frontend"
$VenvDir     = Join-Path $BackendDir ".venv"

# Windows puts executables in Scripts\, everything else in bin/.
$VenvBin = if ($IsWindows -or $null -eq $IsWindows) { "Scripts" } else { "bin" }
$VenvPython = Join-Path $VenvDir (Join-Path $VenvBin "python.exe")
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $VenvDir (Join-Path $VenvBin "python")
}

$Processes = @()

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Problem {
    param([string]$Message)
    Write-Host "!!! $Message" -ForegroundColor Red
}

function Resolve-Executable {
    param([string[]]$Names, [string]$Hint)
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    throw "Could not find $($Names -join ' or ') on PATH. $Hint"
}

function Test-PortFree {
    param([int]$Port)
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

function Stop-Children {
    foreach ($process in $Processes) {
        if ($process -and -not $process.HasExited) {
            try {
                # Kill the whole tree: uvicorn --reload spawns a child, and
                # npm spawns node. Killing only the parent orphans them and
                # leaves the ports occupied for the next run.
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)" -ErrorAction SilentlyContinue |
                    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            } catch {
                # Already gone. Nothing to do.
            }
        }
    }
}

try {
    # ----------------------------------------------------------------------
    # Sanity checks
    # ----------------------------------------------------------------------
    if (-not (Test-Path $BackendDir))  { throw "Backend folder not found at $BackendDir" }
    if (-not (Test-Path $FrontendDir)) { throw "Frontend folder not found at $FrontendDir" }

    foreach ($port in @($BackendPort, $FrontendPort)) {
        if (-not (Test-PortFree $port)) {
            Write-Problem "Port $port is already in use."
            Write-Host "    Something else is running there, probably an earlier run of this script."
            Write-Host "    Find it with:  Get-NetTCPConnection -LocalPort $port | Select-Object OwningProcess"
            Write-Host "    Then stop it:  Stop-Process -Id <id> -Force"
            exit 1
        }
    }

    $SystemPython = Resolve-Executable -Names @("python", "python3", "py") `
        -Hint "Install Python 3.10+ and tick 'Add python.exe to PATH'."
    $Npm = Resolve-Executable -Names @("npm.cmd", "npm") `
        -Hint "Install Node.js 18+ from https://nodejs.org."

    # ----------------------------------------------------------------------
    # Dependencies
    # ----------------------------------------------------------------------
    if (-not $SkipInstall) {
        if (-not (Test-Path $VenvDir)) {
            Write-Step "Creating virtual environment in Backend\.venv"
            & $SystemPython -m venv $VenvDir
            if ($LASTEXITCODE -ne 0) { throw "Failed to create the virtual environment." }

            $VenvPython = Join-Path $VenvDir (Join-Path $VenvBin "python.exe")
            if (-not (Test-Path $VenvPython)) {
                $VenvPython = Join-Path $VenvDir (Join-Path $VenvBin "python")
            }
        }

        Write-Step "Installing Python dependencies"
        & $VenvPython -m pip install --quiet --upgrade pip
        & $VenvPython -m pip install --quiet -r (Join-Path $BackendDir "requirements.txt")
        if ($LASTEXITCODE -ne 0) { throw "pip install failed." }

        if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
            Write-Step "Installing frontend dependencies (first run, this takes a minute)"
            Push-Location $FrontendDir
            try {
                & $Npm install
                if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
            } finally {
                Pop-Location
            }
        }
    }

    if (-not (Test-Path $VenvPython)) {
        throw "No Python found at $VenvPython. Delete Backend\.venv and run again without -SkipInstall."
    }

    # ----------------------------------------------------------------------
    # Launch
    # ----------------------------------------------------------------------
    $env:SMS_PROVIDER = $SmsProvider
    if ($SmsProvider -eq "messagebird") {
        if (-not $env:MESSAGEBIRD_API_KEY) {
            throw "SmsProvider is messagebird but MESSAGEBIRD_API_KEY is not set."
        }
        Write-Problem "SMS provider is messagebird. Messages will really send and really cost money."
    }

    Write-Step "Starting backend on http://127.0.0.1:$BackendPort"
    $Processes += Start-Process -FilePath $VenvPython `
        -ArgumentList @("-m", "uvicorn", "main:app", "--reload", "--port", "$BackendPort") `
        -WorkingDirectory $BackendDir -NoNewWindow -PassThru

    Write-Step "Starting frontend on http://localhost:$FrontendPort"
    $Processes += Start-Process -FilePath $Npm `
        -ArgumentList @("run", "dev", "--", "--port", "$FrontendPort", "--strictPort") `
        -WorkingDirectory $FrontendDir -NoNewWindow -PassThru

    Start-Sleep -Seconds 2
    Write-Host ""
    Write-Host "  Report  http://localhost:$FrontendPort/public/" -ForegroundColor Green
    Write-Host "  Admin   http://localhost:$FrontendPort/admin.html" -ForegroundColor Green
    Write-Host "  Docs    http://127.0.0.1:$BackendPort/docs"     -ForegroundColor Green
    Write-Host ""
    Write-Host "  SMS provider: $SmsProvider" -ForegroundColor DarkGray
    if ($SmsProvider -eq "console") {
        Write-Host "  Outgoing messages appear here as [SMS -> +31...] lines." -ForegroundColor DarkGray
    }
    Write-Host "  Ctrl+C stops both." -ForegroundColor DarkGray
    Write-Host ""

    # Wait for either to exit. If one dies, take the other down with it,
    # rather than leaving half the stack running and looking healthy.
    while ($true) {
        Start-Sleep -Milliseconds 500
        foreach ($process in $Processes) {
            if ($process.HasExited) {
                Write-Problem "A process exited (code $($process.ExitCode)). Shutting the other one down."
                exit $process.ExitCode
            }
        }
    }
} finally {
    Stop-Children
}
