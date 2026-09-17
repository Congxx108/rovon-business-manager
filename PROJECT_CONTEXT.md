# ROVON 经营管理系统项目上下文

最后整理日期：2026-09-17

本文档用于在新对话、新任务或上下文压缩后快速恢复项目背景。后续改动前应优先阅读本文档、`CHANGELOG.md`、`README.md`、`AGENTS.md`，再查看具体代码文件。

## 1. 项目基本信息

- 项目名称：ROVON 经营管理系统
- 项目目标：用轻量 Web 系统替代 Excel/Airtable 中已经验证过的核心经营管理需求，提升订单录入、客户跟进、销售统计、每日潜客统计和广告投放决策效率。
- 主要使用者：外贸业务负责人和助理。
- 业务场景：女包、书包、男包等箱包外贸业务的订单记录、发货跟进、客户统计、每日潜客统计、Dashboard 总览。
- 当前技术栈：
  - Next.js 16.2.9 App Router
  - React 19.2.4
  - TypeScript
  - Tailwind CSS 4
  - Supabase JS / Supabase SSR
  - Recharts
  - lucide-react
- 本地运行：
  - 安装依赖：`npm install`
  - 配置 `.env.local`
  - 启动：`npm run dev`
  - 访问：`http://localhost:3000/dashboard`
- 构建检查：
  - `npm run lint`
  - `npm run build`
- 部署方式：
  - GitHub 推送后由 Vercel 自动部署。
  - Vercel 环境变量必须配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
- 数据库/后端服务：
  - 使用 Supabase PostgreSQL。
  - 使用 Supabase Auth 邮箱密码登录。
  - 业务读写目前主要通过服务端 Supabase admin client 和 `SUPABASE_SERVICE_ROLE_KEY` 完成。
  - `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，不能暴露到浏览器端，也不能写入 `NEXT_PUBLIC_` 变量。

## 2. 业务背景

这是一个用于外贸订单管理和销售统计的系统。业务核心是箱包产品，例如 Mixed Handbag、Mixed Schoolbag，以及女包、书包、男包、混合、其他等产品类目。

主要市场包括非洲、中东等地区，也存在微信订单、台湾微信、美国/加拿大等来源或渠道。订单来源可能包括 Facebook、TikTok、WhatsApp、微信等。系统需要替代原来的 Excel 订单统计方式，并承接已经通过 Airtable/Excel 验证过的核心业务流程。

系统当前重点不是扩展大型业务模块，而是让真实日常使用更稳定：

- 更快录入订单。
- 更清晰地判断销售额、订单数、销售数量。
- 更好地跟进老客户和潜在客户。
- 避免漏发货和重复发货。
- 支持每日潜客和 WhatsApp 群增加数统计。
- 为广告投放和业务决策提供 Dashboard。

明确不属于当前范围的模块：

- 库存
- 配货
- PI 附件
- 客户公开订单页
- 微信小程序
- 复杂权限或审批流
- 物流 API 自动轨迹查询

## 3. 当前系统已有功能

以下内容根据当前代码、README、migration、路由和组件整理。

### 3.1 全局与登录

- 路由根路径：`src/app/page.tsx`
- 登录页：`/login`
- 全局布局：`src/components/app-shell.tsx`
- 导航组件：`src/components/nav-client.tsx`
- Auth 相关：`src/app/auth/actions.ts`、`src/lib/auth.ts`、`src/lib/supabase/server.ts`
- 登录保护：`src/proxy.ts`
- 代码现状：项目已接入 Supabase Auth；未登录访问管理页会跳转登录页。

### 3.2 Dashboard / 数据看板

- 页面：`src/app/dashboard/page.tsx`
- 图表：`src/app/dashboard/dashboard-charts.tsx`
- 数据查询：`getDashboardData()` in `src/lib/data.ts`
- 已有展示：
  - 总销售额 RMB
  - 总订单数
  - 总销售数量
  - 平均订单金额
  - 待发货订单模块
  - 销售趋势
  - 销售数量趋势
  - 国家销售额排行
  - 国家销售额占比
  - 每日潜客增长趋势
  - 女包群每日增加趋势
  - 双肩包群每日增加趋势
  - 需要跟进客户列表
- 当前代码现状：
  - Dashboard period 类型包括 `default_12m`、`this_month`、`last_30d`、`last_90d`、`this_year`、`custom`。
  - 默认范围为最近 12 个月，按月统计。
  - 本月、最近 30 天、最近 90 天按天统计。
  - 今年按月统计。
  - 自定义日期范围根据跨度自动按天或按月。
  - 待发货订单不受顶部销售时间筛选影响，始终显示当前未完成发货订单。

### 3.3 订单管理

- 列表页：`/orders`，文件 `src/app/orders/page.tsx`
- 新增页：`/orders/new`，文件 `src/app/orders/new/page.tsx`
- 编辑页：`/orders/[id]/edit`，文件 `src/app/orders/[id]/edit/page.tsx`
- 导入页：`/orders/import`
- 动作：`src/app/orders/actions.ts`
- 表单控件：`src/components/order-form-controls.tsx`
- 发货弹窗：`src/components/mark-shipped-form.tsx`
- CSV 导出按钮：`src/components/csv-export-button.tsx`
- 已有功能：
  - 订单列表筛选：搜索、国家/渠道、产品线、月份、发货状态、待发货快捷筛选。
  - CSV 导出订单。
  - CSV 导入订单，支持中文 CSV 表头、GBK/GB18030 兼容、字段映射、基础清洗。
  - 新增订单后刷新客户统计。
  - 编辑订单后刷新客户统计。
  - 取消/退款订单不计入销售统计。
  - 多产品明细行，通过 `order_items` 保存明细，`orders` 保留汇总字段。
  - 订单列表操作列在最左侧，支持编辑和标记已发货。
  - 老客户返单在订单列表中有浅色高亮/返单 badge。
  - 订单列表在“发货状态”和“物流方式”之间显示“发货日期 / 待发货”列。
- 当前新增订单页面结构：
  1. 基础信息
  2. 产品与金额
  3. 付款状态
  4. 备注
  5. 底部操作按钮
- 代码现状：
  - 新增订单页不显示发货信息模块。
  - 编辑订单页仍保留发货信息模块。
  - 普通订单备注字段为 `remark`。
  - “发货日期 / 待发货”列只做展示：已发货显示日期或“未填日期”提示；待发货订单显示从 `order_date` 到当前香港日期的等待天数。

### 3.4 产品与金额录入

- 组件：`OrderItemsInput` in `src/components/order-form-controls.tsx`
- 表：`order_items`
- 规则：
  - 每个订单可包含多个产品明细行。
  - 每行包含产品类目、数量、销售额 RMB。
  - `orders.quantity` 是明细数量合计。
  - `orders.sales_amount_rmb` 是明细销售额合计。
  - 如果多个不同产品类目，`orders.product_line` 汇总为“混合”；如果只有一个类目则保留该类目。

### 3.5 付款状态

- 付款字段：
  - `payment_status`
  - `deposit_amount_rmb`
  - `payment_currency`
  - `rmb_payment_method`
  - `payment_remark`
- 当前付款状态主要选项：
  - 已付全款
  - 定金
- 业务规则：
  - 销售统计仍然按 `sales_amount_rmb` / `sales_amount_effective_rmb` 统计，不按定金金额统计。
  - `payment_currency` 记录客户实际支付货币。
  - `rmb_payment_method` 仅在客户支付货币为 RMB 时使用。

### 3.6 发货状态与物流

- 发货字段：
  - `shipping_status`
  - `shipping_method`
  - `shipping_company`
  - `tracking_no`
  - `shipping_date`
  - `shipping_remark`
- 发货状态选项见 `src/lib/shipping.ts`：
  - 未发货
  - 备货中
  - 部分发货
  - 已发货
  - 无需发货
- 待发货状态：
  - 未发货
  - 备货中
  - 部分发货
- 代码现状：
  - `/orders` 和 Dashboard 待发货模块可打开“标记已发货”Modal。
  - `MarkShippedForm` 使用 Portal 渲染到 `document.body`，避免被表格 sticky 列遮挡。
  - 标记已发货保存后更新发货状态和物流信息。
  - Dashboard 和订单列表将订单已有的五个物流字段传入共用 `MarkShippedForm.initialShipping`；打开时自动预填，发货日期优先已有日期，缺失时沿用 `todayString()` 默认今天。
  - Dashboard 待发货查询包含物流方式、公司、单号、日期和备注；保存仍使用原 `markOrderShipped`，不改变统计、待发货定义或数据库结构。

### 3.7 客户管理

- 列表页：`/customers`
- 详情页：`/customers/[id]`
- 跟进编辑页：`/customers/[id]/edit`
- 动作：`src/app/customers/actions.ts`
- 数据刷新：`refresh_customers_from_orders()` 数据库函数。
- 已有功能：
  - 客户列表按销售额排序。
  - 客户列表操作列在最前面，支持横向滚动时固定显示。
  - 客户详情展示基础信息、统计字段、跟进字段、关联历史订单。
  - 客户跟进字段可编辑。
  - 当前代码允许在客户跟进编辑页修改客户名和国家/渠道，联系方式和统计字段保持只读。
  - 客户管理页顶部有“近5日已跟进客户”模块，展示最近 5 天内有 `last_follow_date` 的客户，最多 10 条。
- 注意：
  - 修改客户人工字段时，不应随意调用 `refresh_customers_from_orders()`，否则可能被订单汇总结果覆盖。
  - 近5日已跟进客户模块是回顾模块，不是待跟进提醒；不改变跟进优先级计算。

### 3.8 每日潜客统计

- 列表页：`/daily-leads`
- 新增页：`/daily-leads/new`
- 编辑页：`/daily-leads/[id]/edit`
- 导入页：`/daily-leads/import`
- 字段：
  - `stat_date`
  - `facebook_leads`
  - `whatsapp1`
  - `whatsapp2`
  - `whatsapp3`
  - `total_increase`
  - `handbag_group`
  - `handbag_group_increase`
  - `backpack_group`
  - `backpack_group_increase`
  - override 和换群标记字段
- 代码现状：
  - 每日潜客增加数通过数据库函数 `recalculate_daily_leads()` 全量重算。
  - 支持手动 override 增加数，用于换群、历史数据修正、WhatsApp2 / WhatsApp3 中途启用等情况。
  - Dashboard 图表使用最终的 `total_increase`、`handbag_group_increase`、`backpack_group_increase`。
  - 自动总增加数 = Facebook、WhatsApp1、WhatsApp2、WhatsApp3 四个累计数之和减去上一条日期记录的对应合计；首条自动值为 0，非空 override（含 0、负数）优先。
  - 快速录入、新增、同日期更新、编辑、历史表格、CSV 模板/预览/导出均支持 WhatsApp3，位置在 WhatsApp2 后。
  - 旧 CSV 缺列或空值按 0 导入，沿用同日期覆盖规则（已有 WhatsApp3 也会变为 0），导入页有明确提示。
  - 编辑页写入现有手动修正字段；新增页的同日期确认只更新累计数，保留已有 override。
  - WhatsApp3 migration 仅添加字段和替换函数，不主动调用重算或修改旧业务字段；生产 migration 已于 2026-09-17 应用，原有 179 条记录字段指纹保持一致；应用部署仍需通过 GitHub/Vercel 完成。
  - 不做 WhatsApp 群 1024 上限提醒。

### 3.9 数据检查与清理

- 数据检查页：`/data-check`
- 测试数据清理页：`/data-cleanup`
- 代码现状：
  - 检查订单、客户、每日潜客、发货相关数据质量。
  - 清理测试数据有预览和确认流程。

### 3.10 数据库 migration / 表结构

Migration 文件：

- `20260627052249_init_rovon_core.sql`
- `20260627054338_phase2_core_business_loop.sql`
- `20260628090000_add_order_shipping_fields.sql`
- `20260628093000_add_daily_lead_manual_increase_overrides.sql`
- `20260628120000_add_order_items_and_deposit.sql`
- `20260628123000_add_order_payment_details.sql`
- `20260917070334_add_daily_leads_whatsapp3.sql`

主要表：

- `orders`
  - 订单基础字段、销售额、取消/退款、付款、发货、备注。
  - `sales_amount_effective_rmb` 是生成列：取消/退款为 0，否则等于 `sales_amount_rmb`。
- `order_items`
  - 一笔订单的多个产品明细行。
- `customers`
  - 由订单汇总生成的客户统计和人工跟进字段。
- `daily_leads`
  - 每日潜客累计数、最终增加数、手动 override、换群标记。

关键函数：

- `public.refresh_customers_from_orders()`
- `public.recalculate_daily_leads()`
- `public.customer_match_key(...)`
- `public.set_customer_derived_fields()`
- `public.set_updated_at()`

RLS/权限：

- migration 中启用了 RLS。
- 服务端使用 `SUPABASE_SERVICE_ROLE_KEY` 读写。
- 不应把 service role key 暴露给客户端。

## 4. 核心业务规则

### 4.1 销售统计

- 取消/退款订单不计入有效销售统计。
- 有效销售额使用 `sales_amount_effective_rmb`。
- 订单数量使用 `orders.quantity` 汇总值。
- 客户销售额和客户购买数量来自有效订单汇总。
- 订单发货状态不改变销售统计口径。

### 4.2 Dashboard 日期范围和图表粒度

- Dashboard 默认应统计最近 12 个月。
- 默认统计方式为按月统计。
- 本月、最近 30 天、最近 90 天应按天统计。
- 今年应按月统计。
- 自定义日期范围需要同时影响销售统计和潜客统计。
- 自定义日期跨度小于等于 90 天时按天统计，大于 90 天时按月统计。
- 如果筛选范围按天统计，趋势图标题应显示：
  - 日销售趋势
  - 日销售数量趋势
- 如果筛选范围按月统计，趋势图标题应显示：
  - 月度销售趋势
  - 月度销售数量趋势
- 待发货订单模块不受 Dashboard 顶部销售时间筛选影响，始终显示当前未完成发货订单。

### 4.3 国家/渠道识别

- 联系方式包含“台湾微信”时识别为台湾微信。
- 联系方式包含“微信”、`Wechat`、`WeChat`、`wx` 时识别为微信订单。
- WhatsApp 号码通过国家码识别国家，例如 +234 尼日利亚、+233 加纳、+255 坦桑尼亚等。
- WhatsApp 号码无法判断国家时，业务期望可归入“其他”或由用户手动填写。
- 微信订单可作为独立来源或国家/渠道统计。
- 用户手动选择的国家/渠道不应被自动识别逻辑强制覆盖。

### 4.4 订单录入页面结构

新增订单页面理想结构：

1. 基础信息
2. 产品与金额
3. 付款状态
4. 备注

当前代码现状符合以上结构。

### 4.5 发货管理

- 新增订单默认未发货。
- 新增订单页不显示发货信息模块。
- 编辑订单页保留发货信息模块。
- Dashboard 和订单管理页提供“标记已发货”快捷操作。
- 本地物流可能没有标准物流单号，因此物流单号不应强制必填。
- 待发货定义：非取消/退款，且发货状态为未发货、备货中、部分发货。
- 订单管理页“发货日期 / 待发货”列显示规则：
  - 已发货且有 `shipping_date`：显示发货日期。
  - 已发货但无 `shipping_date`：显示“已发货｜未填日期”，作为业务提示。
  - 未发货、备货中、部分发货：显示下单等待天数。
  - 等待 0-3 天普通提示，4-7 天浅橙提示，8 天以上浅红提示。
  - `order_date` 缺失时显示 `-`。

### 4.6 客户跟进可视化

- 客户管理页应把操作列放在第一列，方便点击详情和跟进/编辑。
- sticky 操作列 z-index 只在表格内部生效，不应超过 Modal/遮罩。
- “近5日已跟进客户”模块使用现有客户人工跟进字段：
  - `last_follow_date`
  - `last_follow_result`
  - `next_follow_date`
  - `remark`
  - `name`
  - `contact`
  - `country`
- 近 5 日判断包含今天。
- 无近 5 日跟进记录时显示空状态，不报错。
- 该模块不新增客户、不修改客户、不刷新客户统计。

### 4.7 每日潜客与 WhatsApp 群

- WhatsApp 群人数接近上限后可能手动新建群。
- Dashboard 不做群满员提醒、不做 1024 进度条、不自动判断建群。
- 每日潜客趋势重点看增加数，而不是群当前总人数。
- 手动 override 允许 0 或负数。
- 负数增加数不一定是错误，可能是换群、退群或历史修正。

## 5. UI / 交互偏好

- 系统应偏实用、清晰、稳定，适合每天录入和查看。
- Dashboard 统计需要直观，不要隐藏关键风险模块。
- 不要为了视觉效果牺牲录入效率。
- 卡片结构要清晰，减少信息混杂。
- 表格列多时应允许横向滚动，避免表头竖排。
- 操作入口应易找，例如订单列表操作列在最左侧。
- 客户列表操作列也应在最左侧。
- 订单列表应清晰显示发货日期或待发货等待天数，辅助日常发货优先级判断。
- Modal/Dropdown/Autocomplete 必须注意层级和 overflow，避免：
  - 固定高亮区域残留
  - 遮罩被 sticky 元素盖住
  - 下拉被卡片裁切
  - 滚动时固定块异常
- 修改 UI 时优先小范围优化，不要大规模重构。
- 动效应简单自然，不要花哨，不要拖慢页面。

## 6. 开发原则

- 每次只处理一个明确任务。
- 不要一次性大规模重构。
- 不要删除已有功能。
- 不要改动无关页面。
- 修改前先确认相关文件和当前代码现状。
- 如果用户要求“不要改业务逻辑”，则只做 UI/文档/局部交互修复。
- 如果需要修改数据库结构：
  - 必须说明原因。
  - 必须新增 migration。
  - 必须说明对现有真实数据的影响。
- 如果涉及 Supabase：
  - 检查 `.env.example` 和运行环境变量。
  - 检查表结构、RLS/权限、查询逻辑。
  - service role 只能在服务端使用。
  - 不把 service role 写入客户端组件或 `NEXT_PUBLIC_` 环境变量。
- 每次完成后必须说明：
  - 修改了哪些文件。
  - 改了什么。
  - 如何测试。
  - 是否存在风险或后续注意事项。
- 提交前确认：
  - 不提交 `.env.local`。
  - 不提交真实 CSV、备份文件、清洗报告。
  - 不提交无关改动。

## 7. 常见问题记录

### 7.1 Supabase 表已存在但页面仍提示 Setup required

可能原因：

- `.env.local` 缺少 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY`。
- Vercel 环境变量未配置或配置到了错误环境。
- 本地 `.env.local` 修改后未重启 dev server。
- service role key 错误、过期或复制不完整。
- migration 没有在当前 Supabase project 执行。
- 连接的是另一个 Supabase project。
- RLS/权限或表暴露设置导致查询失败。
- 页面捕获 Supabase 查询错误后显示配置提示。

### 7.2 本地 localhost 页面短暂可用后失效

可能原因：

- `npm run dev` 进程停止。
- 端口被占用或 Next dev server 重启中。
- 修改环境变量后没有重启。
- Auth session 过期或 cookie 状态异常。
- 网络/VPN 影响 Supabase 请求。
- 构建缓存或 Turbopack dev 状态异常，可以尝试重启 dev server。

### 7.3 migration 重复执行或环境变量错误风险

- 有些 migration 使用 `if not exists`，但不是所有数据变更都适合重复执行。
- 不要手动乱改 migration 历史。
- 真实数据导入前后要先备份 CSV。
- 新增字段前必须考虑旧数据默认值。
- Supabase project ref 必须确认，避免把 migration 推到错误项目。

### 7.4 UI 固定高亮区域、遮罩残留、滚动异常

常见原因：

- sticky table header/column 的 z-index 高于 Modal overlay。
- 弹窗渲染在 table/overflow 容器内部，被裁切或层级压住。
- 父元素使用 `overflow-hidden`、`overflow-auto`、`transform`、`isolate` 或较高 z-index 创建 stacking context。
- 解决原则：
  - Modal/Dialog 优先 Portal 到 `document.body`。
  - overlay 使用足够高但统一的 z-index。
  - sticky 列 z-index 只在表格内部够用即可，不要使用 z-50/z-[999]。
  - 订单列表和客户列表操作列均可 sticky 在最左侧，但必须保持低层级。

### 7.5 Dashboard 时间筛选和图表粒度不一致

风险表现：

- 用户选择本月/最近 30 天，但图表仍显示“月度销售趋势”。
- 销售统计按日期筛选，潜客趋势没有同步筛选。
- 自定义日期只影响部分卡片。

当前代码现状：

- `getDashboardData()` 已集中处理 period config、日期范围和 grain。
- 图表标题根据 grain 自动显示“日销售趋势”或“月度销售趋势”。
- 后续修改 Dashboard 时应继续复用这一套 period config，不要在各图表里写散乱逻辑。
