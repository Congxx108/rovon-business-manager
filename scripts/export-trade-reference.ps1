param([Parameter(Mandatory=$true)][string]$Pi,[Parameter(Mandatory=$true)][string]$Ci,[Parameter(Mandatory=$true)][string]$Packing,[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
$taskApp=$null
try {
  $taskApp=New-Object -ComObject ket.Application
  foreach($taskSpec in @(@($Pi,'pi',42),@($Ci,'ci',40),@($Packing,'packing',30))) {
    $taskBook=$null
    try {
      $taskBook=$taskApp.Workbooks.Open($taskSpec[0],0,$true)
      $taskSheet=$taskBook.Worksheets.Item(1)
      $taskKind=$taskSpec[1]
      if($taskKind -eq 'packing') {
        $taskRanges=@('C3','A8:P9','C11','I11','O11','C12','I12','O12','A17:P21','G22','H22','J22','L22','N22','D23','D25')
        $taskSheet.PageSetup.PrintArea='$A$1:$P$30'
      } else {
        $taskFooter=if($taskKind -eq 'pi'){26}else{24}
        $taskLast=if($taskKind -eq 'pi'){22}else{20}
        $taskRanges=@('I3','A4','I4','I5','A10:K13','A16:K16','J18','K18',('A19:K'+$taskLast),('I'+($taskFooter-2)),('K'+($taskFooter-2)),('I'+($taskFooter-1)),('K'+($taskFooter-1)),('A'+($taskFooter+1)+':K'+($taskFooter+4)),('D'+($taskFooter+5)),('A'+($taskFooter+7)+':K'+($taskFooter+11)),('A'+($taskFooter+16)),('G'+($taskFooter+16)))
        $taskSheet.PageSetup.PrintArea=('$A$1:$K$'+$taskSpec[2])
      }
      foreach($taskRange in $taskRanges) {
        if($taskRange.Contains(':')){$taskSheet.Range($taskRange).ClearContents() | Out-Null}
        else{$taskSheet.Range($taskRange).MergeArea.ClearContents() | Out-Null}
      }
      for($taskI=$taskSheet.Shapes.Count;$taskI -ge 1;$taskI--){$taskShape=$taskSheet.Shapes.Item($taskI);if($taskShape.TopLeftCell.Row -gt 7){$taskShape.Delete()}}
      if($taskKind -eq 'pi'){$taskSheet.PageSetup.Zoom=$false;$taskSheet.PageSetup.FitToPagesWide=1;$taskSheet.PageSetup.FitToPagesTall=1}
      $taskSheet.ExportAsFixedFormat(0,(Join-Path $Output ($taskKind+'-base.pdf')))
      $taskGeometry=Get-Content -LiteralPath (Join-Path $Output ($taskKind+'.json')) -Raw | ConvertFrom-Json
      $taskCols=if($taskKind -eq 'packing'){16}else{11}
      $taskGeometry.cols=@(for($taskCol=1;$taskCol -le $taskCols;$taskCol++){[double]$taskSheet.Columns.Item($taskCol).Width})
      $taskGeometry.rows=@(for($taskRow=1;$taskRow -le $taskSpec[2];$taskRow++){[double]$taskSheet.Rows.Item($taskRow).Height})
      $taskGeometry | ConvertTo-Json -Depth 30 -Compress | Set-Content -LiteralPath (Join-Path $Output ($taskKind+'.json')) -Encoding utf8
      Write-Output ('Exported sanitized '+$taskKind+' base')
    } finally {if($taskBook){$taskBook.Close($false)}}
  }
} finally {if($taskApp){[System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskApp) | Out-Null}}
