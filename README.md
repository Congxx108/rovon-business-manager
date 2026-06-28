# ROVON 经营管理系统

轻量级经营管理系统第一阶段，用 Next.js + TypeScript + Supabase 替代 Airtable 中已经验证过的核心需求。

## 已包含模块

- Dashboard 总览：总销售额、订单数、销售数量、平均订单金额、月度销售、国家排行、潜客趋势、待跟进客户。
- 订单管理：订单列表、国家/产品线/月度筛选、新增订单表单。
- 历史订单导入：支持标准 CSV，导入前预览总行数、可导入行数、错误行、销售额和数量合计。
- 订单编辑：支持修改订单并刷新客户统计；删除采用“标记取消/退款”的安全处理。
- 客户管理：由订单刷新生成的客户统计列表，支持手动刷新客户统计。
- 客户详情/跟进：客户详情展示基础信息、自动统计、跟进信息和匹配订单；跟进字段可人工维护。
- 每日潜客统计：列表和新增统计表单，增量字段由数据库全量重算函数自动计算。
- 每日潜客编辑：支持修改历史累计数据，保存后自动全量重算增量。
- 每日潜客导入：支持标准 CSV，同日期覆盖更新，并校验 CSV 原增量和系统计算增量差异。
- 数据检查：订单、客户、每日潜客核心质量检查。

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量：

```bash
copy .env.example .env.local
```

3. 填写 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

系统使用 Supabase Auth 做登录保护。`NEXT_PUBLIC_SUPABASE_ANON_KEY` 用于登录 session，服务端仍使用 `SUPABASE_SERVICE_ROLE_KEY` 读写开启 RLS 的表。不要把 service role key 放到任何 `NEXT_PUBLIC_` 变量里。

4. 启动开发服务：

```bash
npm run dev
```

打开 `http://localhost:3000/dashboard`。

## Supabase migration

本项目的初始化 migration 位于：

```text
supabase/migrations/20260627052249_init_rovon_core.sql
supabase/migrations/20260627054338_phase2_core_business_loop.sql
```

如果使用 Supabase CLI：

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

也可以在 Supabase Dashboard 的 SQL Editor 中执行该 migration 文件内容。

## 构建检查

```bash
npm run lint
npm run build
```

## 真实数据导入流程

1. 先确认 Supabase migration 已执行完成：

```bash
npx supabase db push
```

也可以在 Supabase Dashboard 的 SQL Editor 中手动执行 `supabase/migrations` 下的 SQL 文件。

2. 配置 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. 启动本地程序：

```bash
npm run dev
```

4. 如有测试数据，先进入 `/data-check` 查看检查结果，再进入 `/data-cleanup` 预览并清理明确测试数据。清理前需要输入确认文字，不会直接清空真实数据。

5. 从 Excel 导出 CSV。建议另存为 CSV UTF-8；如果是中文 Windows 常见的 GBK/ANSI CSV，系统也会尝试自动识别。

6. 先进入 `/orders/import` 下载订单导入模板，按模板整理历史订单 CSV 后上传。导入前核对字段映射、默认国家/产品线是否会被使用、新增/更新订单数量、错误行和 WhatsApp 科学计数法提示。

7. 订单导入后检查 `/customers` 和 `/dashboard`，确认客户统计、总销售额、订单数、销售数量是否合理。

8. 再进入 `/daily-leads/import` 下载每日潜客导入模板，上传每日潜客 CSV。同日期记录会覆盖更新，CSV 中的增加数字段只用于校验，系统会重新计算。

9. 每日潜客导入后检查 `/daily-leads` 和 `/data-check`，重点核对日期范围、最近 7 条记录、三个增加数字段合计以及差异提示。

10. 最后回到 `/dashboard`，确认销售和潜客趋势数字是否符合历史 Excel/Airtable 的预期。

## Vercel 部署

在 Vercel Project Settings 里配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

然后使用 Vercel 自动识别 Next.js 项目部署即可。

## 创建登录账号

1. 进入 Supabase Dashboard。
2. 打开 Authentication。
3. 进入 Users。
4. 点击 Add user。
5. 输入邮箱和密码。
6. Email Confirm 可按 Supabase 当前项目设置处理。
7. 创建后，这个账号即可登录系统。
8. 不要开放公开注册；本系统没有提供注册页面，只允许 Supabase Auth 中已创建的用户登录。

## 部署到 Vercel 的环境变量

需要在 Vercel Project Settings 的 Environment Variables 中设置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

提醒：

- `SUPABASE_SERVICE_ROLE_KEY` 只能配置在 Vercel Environment Variables 中，不能写入代码。
- 不要截图公开 service role key。
- `SUPABASE_SERVICE_ROLE_KEY` 不能放入 `NEXT_PUBLIC_` 变量，否则会暴露到浏览器端。

## 数据备份建议

1. 每周至少进入 `/orders` 导出一次订单 CSV。
2. 每周至少进入 `/customers` 导出一次客户 CSV。
3. 每周至少进入 `/daily-leads` 导出一次每日潜客 CSV。
4. 如果要大规模修改订单、客户跟进或每日潜客数据，先导出 CSV 备份。
5. 如果要重新导入每日潜客，先备份 `daily_leads` 表，尤其是已经使用手动增加数修正的历史数据。
6. `SUPABASE_SERVICE_ROLE_KEY` 不要发给别人，不要截图公开，不要提交到代码仓库。

## 部署前安全提醒

1. 当前系统使用 `SUPABASE_SERVICE_ROLE_KEY` 在服务端读写数据。
2. 如果只在本地电脑使用，风险相对较低，但仍要保护好 `.env.local`。
3. 如果部署到 Vercel 并给助理使用，必须先增加登录保护。
4. 不要把没有登录保护的经营管理系统公开给任何人访问。
5. `SUPABASE_SERVICE_ROLE_KEY` 不能暴露到浏览器端，不能放入任何 `NEXT_PUBLIC_` 环境变量。

## 部署前检查

1. 已配置 `NEXT_PUBLIC_SUPABASE_URL`。
2. 已配置 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
3. 已配置 `SUPABASE_SERVICE_ROLE_KEY`。
4. `/login` 登录页面可用。
5. 未登录访问 `/dashboard` 会跳转到 `/login`。
6. 已登录后能访问 Dashboard、订单、客户、每日潜客和数据检查页面。
7. 点击左侧导航底部的退出登录后，不能继续访问系统页面。

## 部署上线后注意事项

1. 不要把 Vercel 后台权限随意给别人。
2. 不要把 Supabase service role key 发给任何人。
3. 助理只需要系统登录账号，不需要 Supabase、Vercel 或 GitHub 权限。
4. 每周导出一次订单、客户、每日潜客 CSV 作为备份。
5. 大规模修改或重新导入前，先导出备份。
6. 如果线上出现异常，先不要重复导入数据，先检查 Vercel Logs 和 Supabase 数据。

## 设计说明

- 第一条每日潜客记录的三个增加数字段保存为 `0`，这样 Dashboard 汇总和趋势展示更稳定，不需要额外处理空值。
- 第二阶段把每日潜客增量改为 `recalculate_daily_leads()` 全量重算。每次 `daily_leads` insert/update/delete 后，按 `stat_date` 顺序重新计算所有记录的三个增加数字段，避免修改中间日期或修改日期时出现边界错误。
- 第三阶段新增 CSV 导入。Excel 暂时请先另存为 CSV；导入预览在浏览器端完成，提交后服务端会再次校验。
- 订单导入字段映射：`时间`、`Whatsapp号码`、`姓名`、`销售额`、`个数`、`备注`、`合同号`、`国家/渠道`、`产品线`。
- 每日潜客导入字段映射：`日期`、`客户` 或 `Facebook后台潜在客户`、`WhatsApp1`、`WhatsApp2`、`女包群`、`书包群人数` 或 `双肩包群`。CSV 中的三个增加数字段只用于校验，不直接写入。
- 订单销售统计使用 `sales_amount_effective_rmb` 生成列：取消/退款订单为 `0`，否则等于 `sales_amount_rmb`。
- 客户统计由 `refresh_customers_from_orders()` 从有效订单汇总生成。匹配规则为优先 `contact`，没有 `contact` 时使用 `customer_name + country`。新增订单成功后会自动刷新客户统计，客户页也提供手动刷新入口。
- `main_product_line` 第二阶段取该客户最近一笔有效订单的产品线，逻辑简单稳定，后续需要时再升级为“出现次数最多”。
- 第四阶段新增编辑能力。订单编辑保存后调用 `refresh_customers_from_orders()`；每日潜客编辑依赖数据库触发器调用 `recalculate_daily_leads()`；客户只允许编辑人工跟进字段，不手动改自动统计字段。
