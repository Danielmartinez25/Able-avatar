param([string]$BlenderPath = '')
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $BlenderPath) { $BlenderPath = Join-Path $projectRoot '.tools/blender-4.5.15-windows-x64/blender.exe' }
if (-not (Test-Path -LiteralPath $BlenderPath)) { throw 'Blender no encontrado. Indicá -BlenderPath con la ruta de blender.exe.' }
$previousBlenderResources = $env:BLENDER_USER_RESOURCES
Push-Location $projectRoot
try {
  New-Item -ItemType Directory -Force '.tools/blender-profile' | Out-Null
  $env:BLENDER_USER_RESOURCES = Join-Path $projectRoot '.tools/blender-profile'
  node --experimental-strip-types scripts/able-003/export-neutral.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la copia neutral.' }
  & $BlenderPath --background --factory-startup --python-exit-code 1 --python scripts/able-003/build_blender.py
  if ($LASTEXITCODE -ne 0) { throw 'Falló la generación Blender.' }
  & $BlenderPath --background --factory-startup --python-exit-code 1 --python scripts/able-003/validate_fbx.py
  if ($LASTEXITCODE -ne 0) { throw 'Falló la validación FBX local.' }
  & $BlenderPath --background --factory-startup --python-exit-code 1 --python scripts/able-003/validate_blend.py
  if ($LASTEXITCODE -ne 0) { throw 'Falló la validación del .blend.' }
  node scripts/able-003/validate-glb.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la validación GLB.' }
} finally { Pop-Location; $env:BLENDER_USER_RESOURCES = $previousBlenderResources }

