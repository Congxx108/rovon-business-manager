# AGENT.md — ROVON 经营管理系统交接说明

> 适用对象：新对话中的 ChatGPT / Codex / 任何接手维护本项目的 Agent
> 目的：在不阅读完整历史聊天的情况下，快速理解项目背景、核心业务逻辑、技术约束、已经踩过的坑，以及后续修改原则。
> 重要：`README.md` 是项目运行与部署说明；本文件补充聊天过程中形成的业务原则、实现约束、设计偏好和维护注意事项。
> 最近更新：2026-07-07。

---

## 1. 项目定位

ROVON 经营管理系统是一个轻量级外贸经营管理后台，用于替代 Excel / Airtable 中已经验证过的核心流程。

当前系统不是库存系统，也不是完整 ERP。它的核心目标是：

1. 记录已经成交或至少已付定金的订单。
2. 管理客户历史订单、复购、跟进优先级。
3. 管理每日潜客数据，包括 Facebook 后台潜客、WhatsApp 对话、WhatsApp 群增长。
4. 清晰追踪订单是否发货，避免重复发货或漏发货。
5. 提供 Dashboard、数据检查、CSV 导入导出和登录保护。
6. 给老板本人和助理日常使用。

项目使用：

- Next.js + TypeScript
- Supabase Database
- Supabase Auth
- Supabase service role 服务端读写
- Vercel 部署
- GitHub 仓库：`Congxx108/rovon-business-manager`

---

## 2. 绝对不要随便扩展的范围

除非用户明确开启新阶段，否则不要主动加入以下模块：

- 库存管理
- 配货流程
- PI 附件上传
- 客户公开订单查看页
- 微信小程序
- 复杂角色权限系统
- 物流 API 轨迹查询
- WhatsApp 群满员提醒
- 复杂审批流程
- 自动化营销系统

当前项目重点是：**订单、客户、每日潜客、发货状态、数据检查、导入导出、登录保护、易用性和美观度**。

---

## 3. 用户业务背景

用户是中国白沟的包类外贸从业者，主要经营：

- 女包
- 书包
- 混合包类
- 后续可能有男包、其他包类

主要市场：

- 非洲
- 中东
- 部分东南亚 / 其他地区

常见国家和地区：

- 尼日利亚
- 加纳
- 坦桑尼亚
- 肯尼亚
- 乌干达
- 喀麦隆
- 利比里亚
- 塞拉利昂
- 安哥拉
- 科特迪瓦
- 阿联酋
- 沙特
- 美国/加拿大
- 台湾微信
- 微信订单

客户来源和沟通渠道：

- Facebook 广告
- TikTok
- WhatsApp
- WhatsApp 群
- 微信

用户的业务习惯：

- 只有客户付款后才录入订单。
- 因此订单一旦录入，至少代表客户已付定金。
- 订单金额统一换算成人民币录入，用于统计销售额。
- 仍需要记录客户实际支付货币，例如 Naira、Cedis、TZS、USD、RMB 等。
- 如果支付货币是 RMB，需要记录收款方式：支付宝、微信、银行转账、现金、其他。
- 一笔订单可能包含多个品类，例如女包 + 书包 + 男包。
- 发货状态非常关键，必须避免漏发货和重复发货。

---

## 4. 核心业务逻辑

### 4.1 订单录入逻辑

订单录入代表已经成交或至少已付定金。

新增订单页面应支持：

- 订单日期，默认今天
- 订单编号，可为空，系统可生成
- 客户名
- 联系方式 / WhatsApp
- 国家/渠道
- 多产品明细行：
  - 产品类目
  - 数量
  - 销售额 RMB
- 付款状态：
  - 已付全款，默认
  - 定金
- 定金金额 RMB，仅付款状态为定金时使用
- 客户支付货币
- RMB 收款方式，仅客户支付货币为 RMB 时显示
- 付款备注
- 是否取消/退款
- 备注

当前代码现状：

- 新增订单页不显示发货信息模块，新增订单默认进入“未发货”状态。
- 编辑订单页保留发货信息模块，用于修正历史订单发货资料。
- 日常发货维护主要通过 Dashboard 待发货模块或订单管理页的“标记已发货”Modal 完成。

### 4.2 多产品明细逻辑

一笔订单可以有多个产品类目。推荐结构：

- `orders` 保留汇总字段：
  - `product_line`
  - `quantity`
  - `sales_amount_rmb`
  - `sales_amount_effective_rmb`
- `order_items` 保存明细：
  - `order_id`
  - `product_line`
  - `quantity`
  - `sales_amount_rmb`
  - `sort_order`

汇总规则：

- `orders.quantity` = 所有明细行数量合计
- `orders.sales_amount_rmb` = 所有明细行销售额合计
- 如果只有一个产品类目，`orders.product_line` = 该类目
- 如果多个不同类目，`orders.product_line` = `混合`
- 历史订单如果没有 `order_items`，编辑时应用 `orders` 汇总字段生成一条默认明细

Dashboard、客户统计、数据检查继续基于 `orders` 的汇总字段，不要直接依赖 `order_items` 做核心汇总，除非专门开发品类分析。

### 4.3 取消/退款逻辑

不要物理删除真实订单。

真实订单取消/退款时：

- `is_refund_or_cancelled = true`
- 该订单销售额统计为 0
- 不计入客户销售额、订单数、销售数量等有效统计
- 数据仍保留，便于追溯

测试数据可以物理删除，但真实业务数据不要物理删除。

### 4.4 发货状态逻辑

发货状态是核心功能。

字段包括：

- `shipping_status`
  - 未发货，默认
  - 备货中
  - 部分发货
  - 已发货
  - 无需发货
- `shipping_method`
  - 快运
  - 物流
  - 自提/其他
  - 未填写
- `shipping_company`
- `tracking_no`
- `shipping_date`
- `shipping_remark`

待发货订单定义：

- 非取消/退款
- `shipping_status` 为：
  - 未发货
  - 备货中
  - 部分发货

Dashboard 必须醒目显示待发货订单：

- 待发货数量
- 待发货金额
- 待发货总数量
- 待发货订单列表

日常使用中，用户每天优先看待发货订单，避免漏发货或重复发货。

“标记已发货”必须使用 Modal/Dialog，不要在表格行内展开完整表单。之前行内展开导致布局混乱。

订单管理页当前还显示“发货日期 / 待发货”列：

- 已发货且有 `shipping_date`：显示发货日期。
- 已发货但无 `shipping_date`：显示“已发货｜未填日期”，作为轻提示。
- 未发货、备货中、部分发货：按 `order_date` 计算等待天数，例如“下单 0 天”“已等 3 天”“已等 12 天”。
- 等待天数颜色轻量分级：0-3 天普通，4-7 天提示，8 天以上更醒目。
- 该列只用于显示，不改变发货保存逻辑。

### 4.5 物流方式业务含义

快运：

- 安能
- 壹米滴答
- 中通快运
- 德邦
- 其他可追踪或较规范快运

物流：

- 本地货运物流
- 可能只有沟通单号、货站信息、司机信息
- 不一定能查轨迹

不要对接物流 API。不要强制填写物流单号。本地物流可能没有标准单号。

---

## 5. 客户逻辑

客户统计由订单自动汇总生成，不手动维护自动统计字段。

客户匹配规则：

1. 优先按 `contact` 匹配
2. 如果没有 `contact`，使用 `customer_name + country`

客户统计字段包括：

- 客户名
- 联系方式
- 国家/渠道
- 首单日期
- 最近下单日期
- 历史订单数
- 历史购买数量
- 历史销售额 RMB
- 复购状态
- 客户价值等级
- 客户复购潜力
- 跟进优先级
- 建议跟进动作
- 最后跟进日期
- 最后跟进结果
- 下次联系日期
- 备注

客户跟进编辑页允许用户手动编辑：

- 客户名
- 国家/渠道
- 最后跟进日期
- 最后跟进结果
- 下次联系日期
- 备注

联系方式暂保持只读。首单日期、最近下单日期、历史订单数、历史购买数量、历史销售额、复购状态、客户价值等级、客户复购潜力、跟进优先级、建议跟进动作等自动统计字段不要允许手动改。

客户管理页当前有“近5日已跟进客户”模块：

- 数据来自 `customers.last_follow_date`、`last_follow_result`、`next_follow_date`、`remark` 等现有字段。
- 不新增数据库字段。
- 只展示最近 5 天内有跟进日期的客户，最多 10 条，按跟进日期倒序。
- 这是“已跟进回顾”，不是待跟进提醒，不改变跟进优先级计算。

客户管理列表当前操作列在最前面，并保持低 z-index sticky，方便横向滚动时点击“详情”和“跟进/编辑”。

### 5.1 老客户自动匹配

新增订单页面中，输入客户名或联系方式时，应自动匹配老客户。

匹配候选显示：

- 客户名
- 联系方式
- 国家/渠道
- 最近下单日期
- 历史订单数
- 历史销售额 RMB

点击候选客户后，自动填入：

- 客户名
- 联系方式
- 国家/渠道

重要交互：

- 不能强制选择老客户
- 允许手动输入新客户
- 用户选择后仍可手动修改
- 候选下拉必须使用稳定的 autocomplete / combobox 弹层
- 弹层应相对输入框定位，不能被下方卡片遮挡，不能撑开布局

---

## 6. 国家/渠道自动识别逻辑

国家/渠道应支持根据 WhatsApp / 联系方式自动识别，但允许手动覆盖。

建议维护工具函数：

`src/lib/country-detection.ts`

识别前 normalize：

- trim
- 去除空格
- 去除横线
- 去除括号
- 支持带 `+` 和不带 `+`
- 保留数字用于国家码判断

常见映射：

- `+234` / `234` → 尼日利亚
- `+233` / `233` → 加纳
- `+255` / `255` → 坦桑尼亚
- `+254` / `254` → 肯尼亚
- `+256` / `256` → 乌干达
- `+237` / `237` → 喀麦隆
- `+231` / `231` → 利比里亚
- `+232` / `232` → 塞拉利昂
- `+244` / `244` → 安哥拉
- `+221` / `221` → 塞内加尔
- `+225` / `225` → 科特迪瓦
- `+971` / `971` → 阿联酋
- `+966` / `966` → 沙特
- `+968` / `968` → 阿曼
- `+974` / `974` → 卡塔尔
- `+965` / `965` → 科威特
- `+962` / `962` → 约旦
- `+961` / `961` → 黎巴嫩
- `+20` / `20` → 埃及
- `+1` / `1` → 美国/加拿大
- `+886` / `886` → 台湾 / 台湾微信
- `+852` / `852` → 香港
- `+853` / `853` → 澳门
- `+63` / `63` → 菲律宾

文本识别：

- 包含 `微信`、`Wechat`、`WeChat`、`wx` → 微信订单
- 包含 `台湾微信` → 台湾微信

自动识别应提示用户，但不能强制覆盖用户手动输入。

---

## 7. 付款货币逻辑

`orders.sales_amount_rmb` 仍然是核心销售额统计字段。所有销售统计都用人民币金额。

但订单应记录客户实际支付货币：

- `payment_currency`
- `rmb_payment_method`
- `payment_remark`
- `deposit_amount_rmb`

常见货币：

- RMB
- USD
- Naira
- Cedis
- TZS
- KES
- XOF
- XAF
- AED
- SAR
- 其他

自动建议规则：

- 尼日利亚 → Naira
- 加纳 → Cedis
- 坦桑尼亚 → TZS
- 肯尼亚 → KES
- 喀麦隆 → XAF
- 科特迪瓦 → XOF
- 美国/加拿大 → USD
- 阿联酋 → AED
- 沙特 → SAR
- 微信订单 / 台湾微信 / 中国 → RMB
- 不确定 → USD 或 其他

如果 `payment_currency = RMB`，显示 `rmb_payment_method`：

- 支付宝
- 微信
- 银行转账
- 现金
- 其他

如果付款状态为定金：

- 显示 `deposit_amount_rmb`
- 统计仍按订单总销售额 `sales_amount_rmb`，不是按定金金额

---

## 8. 每日潜客逻辑

每日潜客字段：

- 日期
- WhatsApp1 / WhatsApp2 / WhatsApp3 / WhatsApp4 累计数
- 总潜客增加
- Facebook 后台潜在客户累计数、FB增加、FB占比（辅助指标）
- 女包群累计数
- 女包群增加数
- 双肩包群累计数
- 双肩包群增加数

核心原则：

- 用户每天填写累计数
- WhatsApp1～4 是最终有效潜客池；`total_increase` 只统计四个 WhatsApp 的每日增量；Facebook 后台潜客保留为辅助指标，不参与总潜客增加计算。
- 系统按日期顺序计算四个 WhatsApp 累计合计与上一条记录的差值
- 第一条记录三个自动增加数为 0；非空 override（含 0、负数）优先
- 修改历史日期后，必须全量重算后续日期增加数
- 同日期导入或录入应覆盖更新，不应重复创建

### 8.1 WhatsApp 群上限和换群逻辑

WhatsApp 群有 1024 人上限。用户通常在 950 人左右手动新建群。换群后群人数可能从接近 1000 变成 0 或几十人。

因此：

- 不要做群满员提醒
- 不要做 1024 容量进度条
- 不要自动判断该新建群
- Dashboard 重点看每日增加数，不重点看群当前绝对人数

支持手动增加数 override：

- `total_increase_override`
- `handbag_group_increase_override`
- `backpack_group_increase_override`
- `increase_note`
- `is_handbag_group_reset`
- `is_backpack_group_reset`

最终 Dashboard 图表仍使用：

- `total_increase`
- `handbag_group_increase`
- `backpack_group_increase`

数据库重算时：

- override 非空时使用 override
- override 为空时使用自动计算值
- override 可以为 0
- override 可以为负数
- 负数不一定是错误，可能来自换群或退群

### 8.2 每日潜客录入体验

`/daily-leads` 页面顶部应直接提供快速录入区域，不应强制跳转单独新增页。

默认日期为今天。

保存成功提示：

- 今日潜客数据已保存
- 系统已重新计算增加数

如果日期已存在：

- 提示该日期已存在，确认后更新当天数据，不新增重复记录

---

## 9. CSV 导入导出原则

### 9.1 编码

中文 Excel 导出的 CSV 可能是 GBK / ANSI，不一定是 UTF-8。

导入工具应支持：

- UTF-8
- GBK / GB18030
- BOM 清理
- 表头 trim
- 中文字段别名

### 9.2 WhatsApp 号码

Excel 可能把 WhatsApp 号码转成科学计数法，例如：

`2.34111E+11`

程序可尝试转成普通字符串，但必须提示：如果 Excel 已经损失精度，程序无法恢复原号码。

### 9.3 订单导入

常见字段映射：

- 时间 / 日期 / 订单日期 → `order_date`
- Whatsapp号码 / WhatsApp号码 / 联系方式 → `contact`
- 姓名 / 客户名 / 客户 → `customer_name`
- 销售额 / 销售额RMB / 金额 → `sales_amount_rmb`
- 个数 / 数量 → `quantity`
- 备注 → `remark`
- 合同号 / 订单编号 → `order_no`
- 国家/渠道 / 国家 / 渠道 → `country`
- 产品线 → `product_line`
- 发货状态 → `shipping_status`
- 物流方式 → `shipping_method`
- 物流公司 / 快运公司 / 物流/快运公司 → `shipping_company`
- 物流单号 / 快运单号 / 货运单号 → `tracking_no`
- 发货日期 → `shipping_date`
- 发货备注 → `shipping_remark`
- 付款货币 / 支付货币 / 客户支付货币 → `payment_currency`
- 人民币收款方式 / 收款方式 → `rmb_payment_method`
- 付款备注 → `payment_remark`

导入历史订单时，每一行代表一笔订单，并为每笔订单生成一条 `order_items`。

不要让 CSV 导入破坏现有订单。

### 9.4 每日潜客导入

字段映射：

- 日期 → `stat_date`
- 客户 / Facebook后台潜在客户 → `facebook_leads`
- WhatsApp1 → `whatsapp1`
- WhatsApp2 → `whatsapp2`
- WhatsApp3 → `whatsapp3`
- WhatsApp4 → `whatsapp4`（缺列/空白：已有日期保留原值，新日期为0）
- 女包群 → `handbag_group`
- 书包群人数 / 双肩包群 → `backpack_group`
- 总增加数 → `total_increase_override`（当用户选择保留 CSV 增加数时）
- 增加数-女包群 → `handbag_group_increase_override`
- 增加数-双肩包群 → `backpack_group_increase_override`

CSV 增加数默认仅校验。确认其符合 WhatsApp1～4 新口径后才勾选保留为人工修正；已有非空 override 和备注始终保留，不被导入覆盖。FB增加/FB占比在查询层派生，不新增数据库字段；分母非正、非有限、FB负增长或占比超过100%时显示 `-`。

### 9.5 导出

系统支持导出：

- 订单 CSV
- 客户 CSV
- 每日潜客 CSV

导出应为 UTF-8 CSV，文件名包含日期。

备份建议：

- 每周导出一次订单、客户、每日潜客
- 大规模修改前先导出
- 重新导入每日潜客前先备份 `daily_leads`

---

## 10. 数据检查页原则

`/data-check` 是数据健康中心，不是复杂 Dashboard。

它应区分：

### 正常

显示 0 或绿色，不抢眼。

### 业务提示

橙色提示，不一定是严重错误：

- 已发货但没有物流单号
- 已发货但没有发货日期
- 每日潜客增加数为负数
- 手动修正记录数量
- 优先跟进客户数量
- 可跟进客户数量

### 严重错误

红色：

- 订单日期为空
- 客户名和联系方式都为空
- 销售额为空或小于等于 0
- 数量为空或小于等于 0
- 国家/渠道缺失
- 产品线缺失

不要把 WhatsApp 群换群导致的负数当作严重错误。

---

## 11. 登录与部署安全原则

Supabase Auth 已用于登录保护。

必须有：

- `/login`
- 未登录访问管理页面跳转 `/login`
- 登录后访问系统页面
- 退出登录后不能继续访问系统
- 不提供公开注册页面
- 账号从 Supabase Dashboard → Authentication → Users → Add user 手动创建

环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

严禁：

- 把 `SUPABASE_SERVICE_ROLE_KEY` 放进任何 `NEXT_PUBLIC_`
- 在客户端组件直接引用 service role key
- 把 `.env.local` 提交到 GitHub
- 把真实 CSV、备份文件、清洗报告提交到 GitHub
- 给助理 Supabase / Vercel / GitHub 权限

助理只需要系统登录账号。

Vercel 注意事项：

- Framework Preset 必须是 Next.js
- Root Directory 留空或为项目根目录
- 环境变量名字必须完全正确
- 修改环境变量后必须 Redeploy
- 访问根路径 `/` 应跳转 `/login` 或 `/dashboard`，不要 404

GitHub / 推送：

- 推荐配置 SSH key，一台电脑配置后，该电脑对用户有权限的 GitHub 仓库都可以用 SSH 推送
- 当前项目 remote 建议为：
  `git@github.com:Congxx108/rovon-business-manager.git`

---

## 12. UI / 美观 / 交互原则

用户偏好：

- 现代化
- 科技感
- 精致
- 干净
- 高级但不花哨
- 简单自然动效
- 不牺牲可用性
- 中文表格排版规整

视觉方向：

- modern SaaS admin
- clean
- premium
- subtle tech feel
- structured
- calm
- readable

建议：

- 浅色主界面为主
- 深蓝 / 墨蓝 / slate / 冷灰为主基调
- 柔和边框
- 轻微阴影
- 圆角统一
- 卡片层级清晰
- hover / focus / active 过渡自然
- 动效以 150-250ms CSS transition 为主
- 不要引入重型动画库
- 不要做夸张位移动画、大面积弹跳、复杂切场、3D 特效

表格要求：

- 宽表格必须有横向滚动容器
- 表头 `whitespace-nowrap`
- 不允许 2-4 个汉字竖排
- 合理 min-width
- 数字右对齐
- 长文本 truncate + title
- 操作列清楚
- 行 hover 自然
- 状态 badge 柔和、统一、不刺眼

新增/编辑订单页面：

- 是最高频页面
- 信息密度要高
- 桌面端尽量 2-3 列栅格
- 不要长长单列导致一直滚动
- 底部操作按钮清楚
- 产品与金额、状态与备注、发货信息区块要规整

弹层原则：

- 客户自动匹配下拉必须稳定定位在输入框下方
- 不能撑开布局
- 不能被下方卡片遮挡
- 应用 `relative` wrapper + `absolute top-full left-0 right-0 z-50`
- 标记已发货必须使用 Modal/Dialog
- 不要在表格行内展开完整表单
- Modal 用 `fixed inset-0 z-50` 或 Portal，避免被表格 overflow 裁切
- sticky 操作列只使用表格内部所需的低 z-index，避免盖住 Modal 遮罩。

---

## 13. 性能和页面切换原则

用户觉得页面切换不能慢。优化方向：

- 导航使用 `next/link`
- 避免普通 `a` 标签导致整页刷新
- Dashboard 不要无意义 `select *`
- 列表页只选需要字段
- orders 数据增长后应分页或限制默认条数
- customers 默认可按销售额展示前 100，再通过搜索/筛选查找
- daily-leads 当前数据较少，可以全部或最近 90 条
- 页面切换或筛选给轻量 loading / skeleton
- 不要为了美化导致页面变卡
- 不要牺牲统计准确性

---

## 14. 开发流程原则

每次 Codex / Agent 修改后必须：

1. 不改不相关功能
2. 不改数据库，除非需求明确需要
3. 如新增数据库字段，必须新增 Supabase migration
4. 本地执行：
   - `npm run lint`
   - `npm run build`
5. 确认 `.env.local` 未提交
6. 确认真实 CSV / 备份 / 清洗报告未提交
7. commit
8. push 到 GitHub
9. 触发 Vercel 自动部署
10. 如果新增 migration，提醒用户必须在 Supabase SQL Editor 执行最新 SQL，Vercel 不会自动执行 Supabase migration

常用提交示例：

- `feat: improve order entry with items and deposit status`
- `fix: stabilize customer autocomplete and shipping modal`
- `chore: polish daily-use layout and navigation speed`
- `ui: upgrade admin interface visual system`

---

## 15. 已经踩过的坑

### 15.1 Vercel 404

曾出现 `/login` 404，原因不是环境变量，而是 Vercel 没识别 Next.js。

检查：

- Framework Preset = Next.js
- Root Directory = 空白或项目根目录
- Git 仓库连接正确
- 部署的是最新 commit

### 15.2 环境变量拼写

曾把 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 写成了错误名字，如 `NEXT_PUBLIC_SU_BASE_ANON_KEY` 或 `SUPABASE_ANON_KEY`。

正确三项必须是：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 15.3 migration 未执行

新增功能后，代码引用新字段，但 Supabase 里还没有字段，会导致查询失败。

例子：

- `orders.shipping_status does not exist`
- `order_items` 不存在
- `deposit_amount_rmb` 不存在

解决：

- 在 Supabase SQL Editor 执行最新 migration
- 再刷新页面

### 15.4 CSV 原始数据不能直接导入

历史订单 CSV 曾有：

- GBK 编码
- 日期缺年份
- 月度总计行
- 合同号为“无”
- 国家/渠道缺失
- 产品线缺失
- 数量缺失
- WhatsApp 科学计数法

清洗后才导入。

### 15.5 每日潜客“兼容版”与“原始累计值版”

一开始为了图表兼容生成过 Dashboard 兼容版。后来实现 override 后，正确做法是：

- 删除兼容版数据
- 导入原始累计值版
- 确认 CSV 增加数符合 WhatsApp1～4 口径后，才选择保留为人工值；已有 override 始终保留

这样同时保留真实累计数和正确增加数。

### 15.6 表格内展开表单会乱

“标记已发货”不能在 table row 内展开完整表单。应使用 Modal/Dialog。

订单管理和客户管理表格的操作列可以 sticky 到最左侧，但 z-index 不要过高。已有一次问题是 sticky 操作列压到发货 Modal 遮罩上方，修复方式是 Modal Portal 到 `document.body`，并降低 sticky 列层级。

### 15.7 自动匹配客户下拉层会乱

Autocomplete dropdown 不能被卡片 overflow 裁切，不能撑开布局，需要 stable absolute positioning / z-index。

---

## 16. 后续如果开启新对话，第一句话建议

用户可以在新对话中这样开头：

> 这是 ROVON 经营管理系统项目，请先阅读 README.md 和 AGENT.md。不要扩展库存、配货、PI 附件、客户公开订单页等新模块。当前重点是维护已有订单、客户、每日潜客、发货、导入导出、登录和 UI 体验。所有改动必须不破坏真实线上数据，并在修改后通过 lint/build、commit、push、Vercel 部署。新增数据库字段必须提供 Supabase migration 并提醒我手动执行。

---

## 17. 最重要的原则总结

1. 稳定优先，不能破坏已上线真实数据。
2. 统计继续基于 `orders` 汇总字段。
3. 订单录入代表客户已付款或至少已付定金。
4. 发货状态是核心风险控制，必须清晰。
5. 每日潜客重点看增加数，不是 WhatsApp 群当前绝对人数。
6. WhatsApp 换群不做满员提醒，用手动增加数 override 处理。
7. 客户统计自动生成，人工只维护跟进字段。
8. 客户名和国家/渠道允许在客户跟进编辑页做人工修正，但不要改自动统计字段。
9. 页面要现代、科技感、规整，但不能牺牲录入效率。
10. 弹层必须稳定，复杂表单用 Modal，不要嵌在表格行里。
11. Supabase service role key 只能在服务端和环境变量中存在，不能暴露前端。
12. Vercel 不会自动执行 Supabase migration。
13. 每次改完必须 lint/build，确认无敏感文件，再 commit/push。
