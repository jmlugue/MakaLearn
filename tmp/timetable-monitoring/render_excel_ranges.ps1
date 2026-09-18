$ErrorActionPreference = "Stop"
$workbookPath = "D:\MakaLearn\outputs\timetable-commit-review-20260918\MakaLearn Proposed Timetable Monitoring - Commit Completion.xlsx"
$outputDir = "D:\MakaLearn\tmp\timetable-monitoring\excel-previews"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$excel = $null
$workbook = $null
$worksheet = $null

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($workbookPath, 0, $true)
    $worksheet = $workbook.Worksheets.Item("Progress Table")

    $checks = @(
        @{ Name = "top"; Address = "D1:H12" },
        @{ Name = "model-evidence"; Address = "D54:H60" },
        @{ Name = "content-bottom"; Address = "D121:H136" }
    )

    foreach ($check in $checks) {
        $range = $worksheet.Range($check.Address)
        $range.CopyPicture(1, 2)
        $chartObject = $worksheet.ChartObjects().Add(0, 0, [Math]::Max($range.Width, 480), [Math]::Max($range.Height, 240))
        $chart = $chartObject.Chart
        $chart.Paste() | Out-Null
        $chart.Export((Join-Path $outputDir ($check.Name + ".png")), "PNG") | Out-Null
        $chartObject.Delete()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($range) | Out-Null
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($chart) | Out-Null
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($chartObject) | Out-Null
    }
}
finally {
    if ($workbook) { $workbook.Close($false) }
    if ($excel) { $excel.Quit() }
    if ($worksheet) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet) | Out-Null }
    if ($workbook) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null }
    if ($excel) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Get-ChildItem -Path $outputDir -Filter "*.png" | Select-Object Name, Length
