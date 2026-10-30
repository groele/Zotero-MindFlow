param([string]$PackageName, [string]$PreviewMap, [string]$RegressionScript)
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$testRoot = Join-Path $workspace ('tests\native-test-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$profile = Join-Path $testRoot 'profile'
$dataDir = Join-Path $testRoot 'data'
$addon = Join-Path $profile 'extensions\mindflow@groele.org'
New-Item -ItemType Directory -Path $addon,$dataDir -Force | Out-Null
# Prune old native-test runs (disk-heavy, git-ignored). Keep the newest runs; archive small evidence first.
$keepRuns = 3
$evidenceRoot = Join-Path $workspace 'output\native-test-evidence'
Get-ChildItem -LiteralPath (Join-Path $workspace 'tests') -Directory -Filter 'native-test-*' |
  Where-Object { $_.FullName -ne $testRoot } | Sort-Object Name -Descending | Select-Object -Skip ($keepRuns - 1) | ForEach-Object {
    try {
      $evidence = Join-Path $evidenceRoot $_.Name
      foreach ($name in 'native-regression-results.json', 'native-ui.png') {
        $src = Join-Path $_.FullName "data\$name"
        if (Test-Path -LiteralPath $src) { New-Item -ItemType Directory -Path $evidence -Force | Out-Null; Copy-Item -LiteralPath $src -Destination $evidence -Force }
      }
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
    } catch { Write-Warning ("Could not prune " + $_.FullName + ": " + $_.Exception.Message) }
  }
$version = (Get-Content -LiteralPath (Join-Path $workspace 'manifest.json') -Raw | ConvertFrom-Json).version
$packagePath = Join-Path $workspace $(if ($PackageName) { $PackageName } else { "zotero-mindflow-$version.xpi" })
if (!(Test-Path -LiteralPath $packagePath)) { throw 'Build and package the XPI before native tests.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($packagePath, $addon)
if (!$PreviewMap) {
  # Stub only the dialog choice in the extracted test profile; product byte
  # validation, ownership checks, native writes and read-back remain unchanged.
  $runtimePath = Join-Path $addon 'chrome/content/scripts/index.js'
  $runtime = [IO.File]::ReadAllText($runtimePath)
  $runtime = $runtime.Replace('const picker = new FilePicker(); // mindflow-export-picker', @'
const picker = new FilePicker();
if (Zotero._mindflowExportTestChoice) {
  const choice = Zotero._mindflowExportTestChoice;
  Object.defineProperty(picker, 'show', { value: async () => choice.cancel ? picker.returnCancel : picker.returnOK });
  Object.defineProperty(picker, 'file', { get: () => choice.path });
}
'@)
  [IO.File]::WriteAllText($runtimePath, $runtime)
  # Probe cold-start file imports before React mounts. This instrumentation
  # exists only in the extracted temporary profile, never in the output XPI.
  $testIndexPath = Join-Path $addon 'chrome\content\index.html'
  $testIndex = [IO.File]::ReadAllText($testIndexPath)
  $importProbe = @'
<script>
if (window._mindflowInitialAction?.mode === 'import_file') {
  window._mindflowNativeImportRequests = [];
  const originalClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.hasAttribute('data-mindflow-workspace-import')) {
      window._mindflowNativeImportRequests.push({ mounted: this.isConnected });
      return;
    }
    return originalClick.call(this);
  };
}
</script>
'@
  [IO.File]::WriteAllText($testIndexPath, $testIndex.Replace('</head>', $importProbe + '</head>'))
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot $(if ($RegressionScript) { $RegressionScript } elseif ($PreviewMap) { 'native-preview-map.js' } else { 'native-regression.js' })) -Destination (Join-Path $addon 'native-regression.js')
if (!$PreviewMap -and !$RegressionScript) {
  & node (Join-Path $PSScriptRoot 'build-modal-test.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Modal test fixture build failed.' }
  Copy-Item -LiteralPath (Join-Path $workspace 'tests/modal-fixture/modal-test.html') -Destination (Join-Path $addon 'chrome/content/modal-test.html')
  Copy-Item -LiteralPath (Join-Path $workspace 'tests/modal-fixture/modal-test.iife.js') -Destination (Join-Path $addon 'chrome/content/assets/modal-test.iife.js')
  Copy-Item -LiteralPath (Join-Path $workspace 'tests/modal-fixture/integrity-test.html') -Destination (Join-Path $addon 'chrome/content/integrity-test.html')
  Copy-Item -LiteralPath (Join-Path $workspace 'tests/modal-fixture/integrity-test.iife.js') -Destination (Join-Path $addon 'chrome/content/assets/integrity-test.iife.js')
}
if ($PreviewMap) { Copy-Item -LiteralPath (Resolve-Path -LiteralPath $PreviewMap).Path -Destination (Join-Path $dataDir 'preview-input.mindflow') }
$bootstrapPath = Join-Path $addon 'bootstrap.js'
$bootstrap = [IO.File]::ReadAllText($bootstrapPath)
$bootstrap = $bootstrap.Replace('Services.scriptloader.loadSubScript(`${rootURI}chrome/content/scripts/index.js`, ctx);', 'Services.scriptloader.loadSubScript(`${rootURI}chrome/content/scripts/index.js`, ctx); Services.scriptloader.loadSubScript(`${rootURI}native-regression.js`, ctx);')
[IO.File]::WriteAllText($bootstrapPath, $bootstrap)
$dataJson = ConvertTo-Json $dataDir -Compress
$prefs = @"
user_pref("extensions.zotero.useDataDir", true);
user_pref("extensions.zotero.dataDir", $dataJson);
user_pref("extensions.zotero.firstRun2", false);
user_pref("extensions.zotero.firstRunGuidance", false);
user_pref("extensions.zotero.warnOnUnsafeDataDir", false);
user_pref("extensions.zotero.automaticScraperUpdates", false);
user_pref("extensions.zotero.httpServer.enabled", false);
user_pref("extensions.zotero.showPostUpgradeBanner", false);
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 1);
user_pref("extensions.zoteroWinWordIntegration.skipInstallation", true);
user_pref("extensions.zoteroOpenOfficeIntegration.skipInstallation", true);
user_pref("extensions.mindflow.showWelcomeOnStartup", false);
user_pref("extensions.mindflow.windowMode", "tab");
user_pref("extensions.zotero.panes.mindflow\\@groele\\.org-mindflow-item-pane.open", false);
user_pref("app.update.auto", false);
user_pref("extensions.update.enabled", false);
user_pref("extensions.update.autoUpdateDefault", false);
"@
[IO.File]::WriteAllText((Join-Path $profile 'user.js'), $prefs)
$arguments = '-no-remote -profile "' + $profile + '" -ZoteroDebugText'
$process = Start-Process -FilePath 'C:\Program Files\Zotero\zotero.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $testRoot 'stdout.log') -RedirectStandardError (Join-Path $testRoot 'stderr.log')
[PSCustomObject]@{ TestRoot=$testRoot; ProcessId=$process.Id } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workspace 'tests\current-native-test.json')
[PSCustomObject]@{ TestRoot=$testRoot; ProcessId=$process.Id }
