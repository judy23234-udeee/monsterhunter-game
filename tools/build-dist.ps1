# 배포 빌드: dist/ 에 게임 파일만 복사한다. 테스트 봇(src/autotest.js)과 index.html 의 AUTOTEST 블록은 뺀다.
#   실행: powershell -ExecutionPolicy Bypass -File tools/build-dist.ps1
#   원본은 건드리지 않고 dist/ 를 새로 만든다. 끝나면 'autotest' 흔적이 남았는지 검사한다.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$exclude = @('autotest.js')                       # src/ 에서 뺄 파일 (개발 전용)
$utf8 = New-Object System.Text.UTF8Encoding($false)   # BOM 없는 UTF-8 (한글 보존)

if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Force $dist | Out-Null

# 폴더 복사 (data, src, 변환된 에셋)
foreach ($d in @('data', 'src', 'assets\build')) {
  $from = Join-Path $root $d
  if (-not (Test-Path $from)) { continue }
  $to = Join-Path $dist $d
  New-Item -ItemType Directory -Force $to | Out-Null
  Copy-Item -Recurse -Force (Join-Path $from '*') $to
}
foreach ($f in $exclude) { $p = Join-Path $dist "src\$f"; if (Test-Path $p) { Remove-Item -Force $p } }
foreach ($f in @('CREDITS.md')) { $p = Join-Path $root $f; if (Test-Path $p) { Copy-Item $p $dist } }

# index.html 과 모든 .js: /* AUTOTEST:BEGIN ... AUTOTEST:END */ 블록 제거 (여러 줄 포함)
Copy-Item (Join-Path $root 'index.html') $dist
Get-ChildItem -Recurse -File $dist | Where-Object { $_.Extension -in '.html', '.js' } | ForEach-Object {
  $t = [IO.File]::ReadAllText($_.FullName, $utf8)
  $s = [regex]::Replace($t, '/\* AUTOTEST:BEGIN[\s\S]*?AUTOTEST:END \*/\s?', '')
  if ($s -ne $t) { [IO.File]::WriteAllText($_.FullName, $s, $utf8) }
}

# 검사: 봇 흔적이 남았으면 실패
$left = Get-ChildItem -Recurse -File $dist | Where-Object { $_.Extension -in '.html', '.js' } |
  Where-Object { [IO.File]::ReadAllText($_.FullName, $utf8) -match 'autotest|AUTOTEST|__AT\b' }
if ($left) { $left | ForEach-Object { Write-Host "  남은 흔적: $($_.FullName)" }; throw 'dist 에 autotest 코드가 남아 있음' }
$n = (Get-ChildItem -Recurse -File $dist).Count
Write-Host "dist 빌드 완료: 파일 $n 개, 테스트 봇 제외 확인"
