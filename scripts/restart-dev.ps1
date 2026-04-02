param(
  [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $root 'backend'
$venvPython = Join-Path $root '.venv\Scripts\python.exe'

if (Test-Path $venvPython) {
  $pythonCommand = $venvPython
} else {
  $pythonCommand = 'python'
}

function Write-Step {
  param([string]$Message)
  Write-Host "[明彩] $Message" -ForegroundColor Cyan
}

function Stop-MatchingProcesses {
  param(
    [string[]]$Patterns,
    [string]$Label
  )

  $processes = Get-CimInstance Win32_Process | Where-Object {
    $commandLine = $_.CommandLine
    if (-not $commandLine) {
      return $false
    }

    $normalized = $commandLine.ToLowerInvariant()
    foreach ($pattern in $Patterns) {
      if ($normalized -like "*$pattern*") {
        return $true
      }
    }

    return $false
  }

  if (-not $processes) {
    Write-Step "未发现需要停止的$Label进程"
    return
  }

  foreach ($process in $processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
      Write-Step "已停止$Label进程 PID=$($process.ProcessId)"
    } catch {
      Write-Warning "停止$Label进程 PID=$($process.ProcessId) 失败：$($_.Exception.Message)"
    }
  }
}

$rootPattern = $root.ToLowerInvariant().Replace('/', '\\')
$backendPattern = $backendRoot.ToLowerInvariant().Replace('/', '\\')

Write-Step '开始重启前后端开发环境'

Stop-MatchingProcesses -Label '前端' -Patterns @(
  "$rootPattern\\node_modules",
  "$rootPattern\\wxt.config.ts",
  "$rootPattern\\package.json"
)

Stop-MatchingProcesses -Label '后端' -Patterns @(
  "$backendPattern\\run.py",
  'app.main:app',
  "$backendPattern\\alembic.ini"
)

if (-not $SkipMigrate) {
  Write-Step '执行后端数据库迁移'
  Push-Location $backendRoot
  try {
    & $pythonCommand -m alembic upgrade head
  } finally {
    Pop-Location
  }
}

$frontendCommand = "Set-Location -LiteralPath '$root'; npm run dev"
$backendCommand = "Set-Location -LiteralPath '$backendRoot'; & '$pythonCommand' '.\run.py'"

Write-Step '启动前端开发进程'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', $frontendCommand) -WorkingDirectory $root | Out-Null

Write-Step '启动后端开发进程'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', $backendCommand) -WorkingDirectory $backendRoot | Out-Null

Write-Step '前后端已重新启动'
Write-Host "前端目录: $root"
Write-Host "后端目录: $backendRoot"
Write-Host "Python: $pythonCommand"
if ($SkipMigrate) {
  Write-Host '本次跳过了 alembic migration'
}