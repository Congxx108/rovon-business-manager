# 外贸单据模板资源

`pi.json`、`ci.json`、`packing.json` 是用户提供的三份 XLSX 的行列几何、合并单元格、样式和打印配置，不含客户、商品示例或银行账号。对应 PNG 是原表头部的 ROVON Logo。

`*-base.pdf` 是原表在 WPS 中只读打开、仅在内存清空动态资料后导出的矢量底版，保留原 Logo、标题、固定字体、色块与边框。打印区域排除辅助计算列，PI 正文与签字限定同页。JSON 的 `printX` / `printY` 为与底版网格核对后的 PDF 坐标，不能直接使用 Excel 列宽字符数代替。

Noto Sans SC 来自 [Google Fonts 官方仓库](https://github.com/google/fonts/tree/main/ofl/notosanssc)，由 FontTools 转为常规字重，许可见 `NotoSansSC-LICENSE.txt`。动态英文使用 PDF 标准 Helvetica/Times 字体，中文完整嵌入 Noto Sans SC，避免 fontkit 子集嵌入漏字。无中文动态内容时省略该字体。动态字体与原表字体存在细微字形差异；固定版式直接使用原表矢量底版。

提取工具：`scripts/extract-trade-templates.py` 和 `scripts/export-trade-reference.ps1`。重新提取或改变底版后必须重新校准 `printX` / `printY` 并渲染比对三种单据，不能直接覆盖现有已校准 JSON。银行配置必须输出到工作区之外的私有临时文件并单独初始化数据库，不能加入 Git。原 XLSX 不修改。
