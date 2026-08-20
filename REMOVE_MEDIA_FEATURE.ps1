$ErrorActionPreference = "Stop"
$files = @(
  "src/components/MediaWorkspace.tsx",
  "src/storage/mediaStorage.ts",
  "supabase/20260821_daily_tasks_and_media.sql"
)
foreach ($file in $files) {
  if (Test-Path $file) {
    Remove-Item $file -Force
    Write-Host "Deleted $file"
  }
}
Write-Host "Media feature source files removed. Every day checkbox remains."
