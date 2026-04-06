$files = @(
    "src\components\AnomalyDetector.tsx",
    "src\components\CohortAnalysis.tsx",
    "src\components\CustomDashboard.tsx",
    "src\components\Dashboard.tsx",
    "src\components\DataCleaner.tsx",
    "src\components\ExportButton.tsx",
    "src\components\GlobalSearch.tsx",
    "src\components\MappingModule.tsx",
    "src\components\MergeModule.tsx",
    "src\components\OptimizedTable.tsx",
    "src\components\PivotBuilder.tsx",
    "src\components\WaterfallChart.tsx"
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $content = $content -replace "fetch\('http://localhost:3001/api/", "fetch(`\`${API_URL}/api/"
    $content = $content -replace "fetch\(`http://localhost:3001/api/", "fetch(`\`${API_URL}/api/"
    $content = $content -replace "href=\{`http://localhost:3001/api/", "href={\``\`${API_URL}/api/"
    
    if ($content -notmatch "import.*API_URL.*from.*@/lib/config") {
        $content = $content -replace "(import.*from 'react')", "`$1`nimport { API_URL } from '@/lib/config'"
    }
    
    Set-Content $file -Value $content -NoNewline
}

Write-Host "Remplacement termine!"
