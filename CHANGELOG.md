# CHANGELOG

本文档记录 ROVON 经营管理系统的当前已知状态、历史变更和后续待办。由于项目早期需求和 Bug 记录分散在对话中，本文件先建立“当前已知记录”，后续每次重要改动都应补充。

## 当前已知状态

### 已完成 / 已存在

- 项目已使用 Next.js 16、TypeScript、Supabase、Tailwind CSS、Recharts。
- 已部署到 Vercel，并支持 Supabase Auth 登录保护。
- 已配置服务端 Supabase admin client，使用 `SUPABASE_SERVICE_ROLE_KEY` 读写业务数据。
- 已有订单、客户、每日潜客、Dashboard、数据检查、数据清理、登录等页面。
- 已有订单真实数据和每日潜客真实数据导入能力。
- 已有 CSV 导入/导出能力。
- 已有订单发货状态和物流信息管理。
- 已有 Dashboard 待发货订单模块。
- 已有多产品类目订单明细 `order_items`。
- 已有定金金额、客户支付货币、人民币收款方式、付款备注字段。
- 已有客户自动匹配和国家/渠道自动识别。
- 已有每日潜客手动增加数 override 与换群标记逻辑。
- 已有客户详情和客户跟进编辑。
- 当前代码已支持客户跟进编辑页修改客户名和国家/渠道。
- 当前代码中 `/orders/new` 的页面结构为：
  1. 基础信息
  2. 产品与金额
  3. 付款状态
  4. 备注
- 当前代码中新增订单页不显示发货信息模块，编辑订单页仍显示发货信息模块。
- 当前代码中“标记已发货”弹窗使用 Portal，避免被 sticky 表格列遮挡。
- 当前代码中 Dashboard 顶部日期筛选包含：
  - 默认：最近 12 个月，按月计
  - 本月：按天计
  - 最近 30 天：按天计
  - 最近 90 天：按天计
  - 今年：按月计
  - 自定义日期范围
- 当前代码中趋势图标题会根据统计粒度自动变化。
- 当前代码中销售统计和潜客统计会跟随 Dashboard 日期范围变化。
- 当前代码中待发货订单模块不受 Dashboard 日期范围影响，避免漏发旧订单。
- 当前代码中 `/orders` 已增加“发货日期 / 待发货”列，用于显示发货日期、未填发货日期提示或待发货等待天数。
- 当前代码中 `/customers` 操作列已移动到最前面，并保持低层级 sticky。
- 当前代码中 `/customers` 已增加“近5日已跟进客户”模块，使用现有 `last_follow_date` 等字段展示最近已跟进客户。

### 进行中 / 需要确认

- 线上 Vercel 部署是否已经完成最新 commit 的自动部署，需要在 Vercel Dashboard 或线上页面确认。
- “标记已发货”Modal 遮罩层级修复已经进入代码，但仍建议在线上 `/orders` 页面手动回归：
  - 点击“标记已发货”后背景应统一变暗。
  - 左侧 sticky 操作列不应出现在遮罩上方。
  - 滚动时不应出现固定高亮块。
- `/orders/new` 备注独立卡片已经进入代码，但仍建议在线上手动确认：
  - 备注字段显示在独立卡片。
  - 保存订单后 `remark` 内容正常保存。
- Dashboard 日期筛选已经进入代码，但仍建议在线上手动确认：
  - 默认选中“默认”，范围为最近 12 个月。
  - 本月/最近 30 天/最近 90 天按天显示。
  - 今年按月显示。
  - 自定义范围可以同时影响销售统计和潜客统计。
- 订单发货时效列和客户近5日跟进模块已进入代码，但仍建议在线上手动确认：
  - 已发货订单显示发货日期或“已发货｜未填日期”。
  - 待发货订单显示等待天数。
  - 客户列表操作列在最前面。
  - 修改客户最后跟进日期为今天后，客户进入近5日已跟进客户模块。

### 待修复问题

以下问题来自项目历史和用户反馈。部分已经在当前代码中修复，但仍保留为“待回归确认”。

- 订单管理页面标记已发货时，左侧出现莫名其妙的固定高亮区域，滚动时依旧存在。
  - 代码现状：`MarkShippedForm` 已改为 Portal；订单 sticky 操作列 z-index 已降低。
  - 当前状态：需要线上回归确认。
- 新增订单页面备注栏需要独立成卡片。
  - 代码现状：`/orders/new` 和 `/orders/[id]/edit` 已拆出“备注”卡片。
  - 当前状态：需要线上回归确认。
- Dashboard 默认统计和趋势图粒度需要优化。
  - 代码现状：默认最近 12 个月，按月；本月/30天/90天按天；今年按月。
  - 当前状态：需要线上回归确认。
- 需要新增自定义日期范围筛选。
  - 代码现状：Dashboard 已支持自定义开始日期和结束日期。
  - 当前状态：需要线上回归确认。
- 销售统计和潜客统计需要统一跟随日期范围变化。
  - 代码现状：`getDashboardData()` 已按 period 过滤订单和每日潜客。
  - 当前状态：需要线上回归确认。
- 订单管理页面需要显示发货日期/待发货天数。
  - 代码现状：已在发货状态和物流方式之间新增“发货日期 / 待发货”列。
  - 当前状态：需要线上回归确认。
- 客户管理页面操作列需要提到最前，并显示近5日已跟进客户。
  - 代码现状：操作列已前置并 sticky；已增加“近5日已跟进客户”模块。
  - 当前状态：需要线上回归确认。

### 待开发 / 待优化

- 后续每个功能任务开始前，先阅读：
  - `PROJECT_CONTEXT.md`
  - `CHANGELOG.md`
  - `README.md`
  - `AGENTS.md`
  - 相关页面/组件/数据文件
- 建议为重要业务流程建立手动测试清单：
  - 新增订单
  - 编辑订单
  - 标记已发货
  - 客户跟进编辑
  - 每日潜客快速录入
  - Dashboard 日期筛选
  - CSV 导入导出
- Dashboard 快捷筛选业务期望：
  - 默认：最近 12 个月，按月计
  - 本月：按天计
  - 最近 30 天：按天计
  - 最近 90 天：按天计
  - 今年：按月计
- 趋势图标题需要根据统计粒度自动变化。
- 订单录入页面卡片结构业务期望：
  1. 基础信息
  2. 产品与金额
  3. 付款状态
  4. 备注
- 后续如继续 UI polish，应小范围改动，避免再次引入弹层/滚动/遮罩层级问题。
- 后续如要改 Supabase schema，必须先说明原因并新增 migration。
- 客户跟进模块后续如继续优化，应保持其为“已跟进回顾”，不要混入待跟进提醒逻辑，除非用户明确要求。

## 最近 Git 历史摘要

以下来自当前 Git 历史，可作为线索，不代表完整业务验收记录：

- `1ad3af5 ui: improve shipping timing and recent follow-up visibility`
  - 订单列表新增“发货日期 / 待发货”列。
  - 客户列表操作列前置。
  - 客户页新增近5日已跟进客户模块。
- `650681f ui: fix shipping modal overlay and separate order remark card`
  - 修复发货 Modal 遮罩层级。
  - 拆出订单备注卡片。
- `bdef04e feat: add dashboard date range controls`
  - Dashboard 增加默认/本月/最近 30 天/最近 90 天/今年/自定义日期范围。
  - 销售趋势标题按天/月粒度变化。
- `a8eaced ui: improve order list actions and hide create shipping section`
  - 订单操作列前置。
  - 新增订单页隐藏发货模块。
- `f0bf408 feat: allow editing customer name and country`
  - 客户跟进编辑页允许修改客户名和国家/渠道。
- `0d41ea0 fix: stabilize customer autocomplete and shipping modal`
  - 稳定客户自动匹配下拉和发货 Modal。
- `1bae4e8 style: polish ROVON management UI`
  - 全局 UI polish。
- `718624c feat: add customer matching and payment details`
  - 客户匹配和付款详情字段。
- `9e9e2ff feat: improve order entry with items and deposit status`
  - 多产品明细、定金状态。
- `1e5d895 chore: improve daily-use layout and navigation speed`
  - 日常使用布局和导航体验优化。
- `0cdb9ed feat: prepare ROVON business manager for deployment`
  - 登录保护、部署准备等。

## 2026-06-29 项目管理规范化

- 新增 `PROJECT_CONTEXT.md`。
- 新增 `CHANGELOG.md`。
- 将项目背景、代码现状、业务规则、开发原则、常见问题和待办事项集中管理。
- 本次只新增文档，不修改业务功能代码、不改 UI、不改数据库、不新增 migration。

## 2026-07-07 文档同步

- 更新 `AGENT.md`、`PROJECT_CONTEXT.md`、`CHANGELOG.md`，同步当前代码实际情况。
- 记录订单管理页新增“发货日期 / 待发货”列。
- 记录客户管理页操作列前置和“近5日已跟进客户”模块。
- 记录新增订单页不显示发货信息模块，发货维护通过 Dashboard/订单列表 Modal 完成。
- 记录客户跟进编辑页允许人工修正客户名和国家/渠道，但不允许修改自动统计字段。

## 2026-09-17 每日潜客新增 WhatsApp3

- 新增 WhatsApp3 累计数，同步快速录入、新增、同日期确认、编辑和历史表格。
- 新增 `20260917070334_add_daily_leads_whatsapp3.sql`，字段使用 integer / NOT NULL / DEFAULT 0 / 非负约束；仅扩展现有全量重算函数，不修改旧 migration，不主动更新历史行。
- 自动总增加数包含 Facebook + WhatsApp1 + WhatsApp2 + WhatsApp3 的相邻记录差值；首条、override 和两个群的算法保持原规则。
- 补齐编辑页已有手动修正字段的保存；同日期新增确认保留原有 override。
- CSV 映射、模板、预览、导出加入 WhatsApp3；旧 CSV 缺列/空值按 0 处理，并提示同日期覆盖影响。
- Dashboard 继续读取数据库最终增量，无新增重复计算；数据检查和清理预览仅补齐 WhatsApp3 展示/查询，不改变清理行为。
- 发布顺序：先执行新增 Supabase migration，再部署应用；Vercel 不会自动执行数据库 migration。
- 验证：`npm run lint`、`npm run build`、`npx tsc --noEmit` 全部通过；使用本地隔离 PGlite 数据库执行新 SQL，验证历史字段保留、历史修改/改日期重算、首条和 override；通过真实 Server Action 代码配合隔离数据库适配器验证五个录入/更新动作、CSV 新旧格式和 Dashboard 最终增量/日期筛选，并检查页面字段与导出映射。生产 migration 已执行，迁移前后 179 条记录的原有字段数据指纹一致，WhatsApp3 默认 0；未写入或删除业务记录。尚未做部署后的浏览器人工验收。

## 2026-09-17 标记已发货 Modal 自动预填

- 修复 Dashboard 和订单列表的共用发货弹窗未接收已有物流信息的问题。
- `MarkShippedForm` 接收订单物流初始值，预填物流方式、公司、单号、发货日期和备注；日期缺失时继续默认今天，其余缺失字段保持空值。
- Dashboard 待发货查询和类型补齐四个缺失字段，两个入口统一传递现有数据。
- 原保存 server action、Portal、遮罩层级、待发货定义和销售统计保持不变；无数据库或部署配置变更，无真实数据写入。
- 验证：lint、build、TypeScript 通过；本地 React/jsdom 验证完整/部分/空物流信息、日期优先级、直接保存及修改保存的 FormData，经原 server action 模拟写入校验；验证 Portal 挂载、层级、Escape/遮罩关闭及重新打开。未执行真实订单发货或线上视觉验收。
