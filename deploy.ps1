# Script de Deploy Automatico - Missoes da Loja
# Execute: .\deploy.ps1 "mensagem do commit"

param(
    [string]$msg = "Update: $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
)

Write-Host "===============================" -ForegroundColor Cyan
Write-Host "  DEPLOY - Missoes da Loja" -ForegroundColor Cyan  
Write-Host "===============================" -ForegroundColor Cyan

# --- CORRECAO DE PATH AUTOMATICA ---
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $commonGitPaths = @(
        "C:\Program Files\Git\bin\git.exe",
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files\Git\mingw64\libexec\git-core\git.exe",
        "C:\Program Files (x86)\Git\bin\git.exe"
    )
    foreach ($path in $commonGitPaths) {
        if (Test-Path $path) {
            $gitDir = Split-Path $path
            $env:Path += ";$gitDir"
            Write-Host "[INFO] Git localizado em: $path" -ForegroundColor Gray
            break
        }
    }
}
# -----------------------------------

# Verifica se ha mudancas
$status = git status --porcelain
if (-not $status) {
    Write-Host "`n[OK] Nenhuma mudanca para enviar." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n[1/3] Adicionando arquivos..." -ForegroundColor Green
git add -A

Write-Host "[2/3] Fazendo commit: '$msg'" -ForegroundColor Green
git commit -m $msg

Write-Host "[3/3] Enviando para GitHub..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  DEPLOY FEITO COM SUCESSO!" -ForegroundColor Green
    Write-Host "  Site live em ~30 segundos:" -ForegroundColor Green
    Write-Host "  https://palmeirape-atribuicoes.github.io/missoes-da-loja/" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERRO] Falha no push. Verifique as credenciais do GitHub." -ForegroundColor Red
    Write-Host "Dica: O Windows vai pedir login no GitHub na primeira vez." -ForegroundColor Yellow
}

