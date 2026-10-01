# BizTrack
Simple inventory and sales management for small businesses.

cd C:\Users\jubil\Projects\BizTrack\biztrack\backend
.\venv\Scripts\Activate.ps1
python manage.py runserver

function Write-PyFile {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText(
        (Join-Path (Get-Location) $Path),
        $Content,
        (New-Object System.Text.UTF8Encoding($false))
    )
    Write-Host "Wrote $Path"
}

Get-Command Write-PyFile | Select-Object Name, CommandType