# Quick smoke test for the Hadiya API surface.
# Usage:  powershell -File .\scripts\smoke-api.ps1 -Port 3111
param(
  [int]$Port = 3111,
  [string]$Base = ""
)

if (-not $Base) { $Base = "http://127.0.0.1:$Port" }

$results = @()

function Hit {
  param([string]$Method, [string]$Path, [string]$Body = $null, [string]$Token = $null)

  $headers = @{ 'Content-Type' = 'application/json' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }

  try {
    if ($Body) {
      $r = Invoke-WebRequest -Uri "$Base$Path" -Method $Method -Headers $headers -Body $Body -UseBasicParsing -TimeoutSec 45
    } else {
      $r = Invoke-WebRequest -Uri "$Base$Path" -Method $Method -Headers $headers -UseBasicParsing -TimeoutSec 45
    }
    $code = [int]$r.StatusCode
    $preview = $r.Content
    if ($preview.Length -gt 220) { $preview = $preview.Substring(0, 220) + '…' }
    return [pscustomobject]@{ Method = $Method; Path = $Path; Status = $code; Body = $preview }
  } catch {
    $response = $_.Exception.Response
    if ($response) {
      $code = [int]$response.StatusCode
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $text = $reader.ReadToEnd()
      $reader.Close()
      if ($text.Length -gt 220) { $text = $text.Substring(0, 220) + '…' }
      return [pscustomobject]@{ Method = $Method; Path = $Path; Status = $code; Body = $text }
    }
    return [pscustomobject]@{ Method = $Method; Path = $Path; Status = -1; Body = $_.Exception.Message }
  }
}

Write-Host "`n== Public ==" -ForegroundColor Cyan
$results += Hit GET '/api/health'
$results += Hit GET '/api/public/templates'
$results += Hit GET '/api/public/stats'
$results += Hit GET '/api/public/gifts?limit=2'

Write-Host "`n== AI ==" -ForegroundColor Cyan
$results += Hit GET  '/api/ai/status'
$results += Hit GET  '/api/ai/gift-finder'
$results += Hit POST '/api/ai/gift-finder' '{"relationship":"friend","occasion":"birthday","interests":"gaming","recipient_name":"أحمد"}'
$results += Hit POST '/api/ai/message' '{"tone":"emotional","length":"short","recipient_name":"منى","context":"صاحبتي من أيام الجامعة"}'
$results += Hit POST '/api/ai/gift-finder' '{"unknown_field":"x"}'
$results += Hit GET  '/api/ai/quota'

Write-Host "`n== Gifts / dashboard (expect 401 signed out) ==" -ForegroundColor Cyan
$results += Hit GET  '/api/gifts'
$results += Hit POST '/api/gifts' '{"title":"تجربة"}'
$results += Hit GET  '/api/dashboard/overview'

Write-Host "`n== Admin (expect 401 signed out) ==" -ForegroundColor Cyan
$results += Hit GET   '/api/admin/stats'
$results += Hit GET   '/api/admin/users'
$results += Hit PATCH '/api/admin/users' '{"action":"set_role","user_id":"00000000-0000-0000-0000-000000000000","role":"ADMIN"}'
$results += Hit POST  '/api/admin/demo/purge' '{"confirm":"WRONG"}'
$results += Hit POST  '/api/admin/bootstrap' '{"token":"wrong-token-wrong-token"}'

Write-Host "`n== Analytics ==" -ForegroundColor Cyan
$results += Hit POST '/api/analytics/events' '{"event_name":"page_view","path":"/"}'
$results += Hit POST '/api/analytics/events' '{"event_name":"not_a_real_event"}'
$results += Hit POST '/api/gift-open' '{"slug":"definitely-not-a-real-slug"}'

$results | Format-Table -AutoSize -Wrap

$ok = ($results | Where-Object { $_.Status -ge 200 -and $_.Status -lt 300 }).Count
$server = ($results | Where-Object { $_.Status -ge 500 }).Count
Write-Host "`n$ok succeeded, $server server errors out of $($results.Count) probes." -ForegroundColor Yellow