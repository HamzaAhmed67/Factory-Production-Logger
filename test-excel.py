/**
 * Test Excel generator logic in Python to verify structure
 */
html_excel = """<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>تقرير الإنتاج</x:Name>
    <x:WorksheetOptions>
     <x:DisplayRightToLeft/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
  .title-table { margin-bottom: 20px; }
  .header-cell { background-color: #26276b; color: #ffffff; font-weight: bold; font-size: 13px; text-align: center; border: 1px solid #1a1b50; padding: 10px; }
  .data-cell { font-size: 12px; border: 1px solid #d1d5db; padding: 8px; text-align: center; }
  .qty-cell { font-size: 13px; font-weight: bold; color: #15803d; border: 1px solid #d1d5db; padding: 8px; text-align: center; }
  .even-row { background-color: #fbf9f6; }
  .odd-row { background-color: #ffffff; }
  .summary-cell { background-color: #f3ede6; font-weight: bold; border: 1px solid #d1d5db; padding: 10px; font-size: 13px; }
</style>
</head>
<body dir="rtl">
<table>
  <tr><th colspan="6" style="background-color:#26276b; color:#c89b53; font-size:18px; padding:15px; text-align:center;">مصنع VG - تقرير الإنتاج اليومي</th></tr>
</table>
</body>
</html>"""
print("Length:", len(html_excel))
