import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { PDFDocument } from "pdf-lib";
const require = createRequire(import.meta.url),
  root = path.resolve(import.meta.dirname, ".."),
  temp = await fs.mkdtemp(path.join(os.tmpdir(), "rovon-trade-tests-"));
for (const name of ["model", "pdf"]) {
  const source = await fs.readFile(
    path.join(root, "src/lib/trade-documents", name + ".ts"),
    "utf8",
  );
  let js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  js = js
    .replaceAll('require("./model")', 'require("./model.cjs")')
    .replace(
      /require\("(\.\.\/\.\.\/\.\.\/assets\/[^"]+)"\)/g,
      (_, p) =>
        `require(${JSON.stringify(path.resolve(root, "src/lib/trade-documents", p))})`,
    );
  for (const dep of ["pdf-lib", "@pdf-lib/fontkit"])
    js = js.replaceAll(
      `require("${dep}")`,
      `require(${JSON.stringify(require.resolve(dep))})`,
    );
  await fs.writeFile(path.join(temp, name + ".cjs"), js);
}
const m = require(path.join(temp, "model.cjs")),
  { renderTradePdf } = require(path.join(temp, "pdf.cjs"));
const legacyBank = (type, currency, address) => ({
  ...m.EMPTY_BANK,
  id: `${type}-${currency}`,
  name: `${type} legacy ${currency}`,
  currency,
  document_type: type,
  account_no: `TEST-${currency}`,
  address,
});
const legacySettings = {
  ...m.DEFAULT_SETTINGS,
  banks: [
    legacyBank("ci", "USD", "TEST CI Address"),
    legacyBank("pi", "USD", "TEST PI Address"),
    legacyBank("pi", "CNY", "TEST Shared Address"),
    legacyBank("ci", "CNY", "TEST Shared Address"),
    {
      ...m.EMPTY_BANK,
      id: "other-usd",
      name: "TEST Additional USD",
      currency: "USD",
      account_no: "TEST-OTHER",
    },
  ],
};
const sharedSettings = m.normalizeSettings(legacySettings);
assert.equal(sharedSettings.banks.length, 3);
assert.equal(sharedSettings.banks[0].id, "bank-USD");
assert.equal(sharedSettings.banks[0].address, "TEST PI Address");
assert.deepEqual(
  new Set(sharedSettings.banks[0].legacy_ids),
  new Set(["pi-USD", "ci-USD"]),
);
assert.ok(sharedSettings.banks.every((b) => !("document_type" in b)));
assert.ok(sharedSettings.banks.some((b) => b.id === "other-usd"));
assert.deepEqual(m.normalizeSettings(sharedSettings), sharedSettings);
assert.throws(
  () =>
    m.normalizeSettings({
      ...legacySettings,
      banks: [...legacySettings.banks, legacySettings.banks[0]],
    }),
  /标识重复/,
);
assert.throws(
  () =>
    m.normalizeSettings({
      ...legacySettings,
      banks: legacySettings.banks.map((b) =>
        b.id === "ci-USD" ? { ...b, account_no: "TEST-DIFFERENT" } : b,
      ),
    }),
  /账号不同/,
);
const sharedPi = m.newTradeData(sharedSettings),
  sharedCi = m.newTradeData(sharedSettings);
assert.deepEqual(sharedPi.bank, sharedCi.bank);
sharedPi.bank.address = "TEST Manual PI Address";
assert.equal(sharedCi.bank.address, "TEST PI Address");
assert.equal(sharedSettings.banks[0].address, "TEST PI Address");
const legacySnapshot = m.normalizeTradeData({
  ...sharedCi,
  bank_profile_id: "ci-USD",
  bank: { ...sharedCi.bank, address: "TEST Saved CI Address" },
  bank_override: "TEST Manual Override",
});
assert.equal(legacySnapshot.bank_profile_id, "ci-USD");
assert.equal(legacySnapshot.bank.address, "TEST Saved CI Address");
assert.equal(legacySnapshot.bank_override, "TEST Manual Override");
const data = m.newTradeData(m.DEFAULT_SETTINGS);
data.buyer.name = "TEST Buyer";
data.buyer.address = "TEST Address, Nigeria";
data.items[0] = {
  ...data.items[0],
  description: "Mixed designs of handbags",
  model: "TEST-001",
  chinese_name: "女包",
  quantity: "200",
  unit_price: "4.1250",
  material: "PU leather",
  hs_code: "4202220000",
};
data.bank = {
  bank_name: "TEST Bank",
  account_name: "TEST Company",
  account_no: "TEST-ACCOUNT",
  swift: "TESTCODE",
  address: "TEST Bank Address",
  remark: "",
};
data.fee = "25.50";
assert.equal(m.totals(data).amount, "850.50");
assert.equal(
  m.lineAmount({ ...data.items[0], quantity: "1", unit_price: "0.0050" }),
  "0.01",
);
assert.throws(
  () =>
    m.normalizeTradeData({
      ...data,
      items: [{ ...data.items[0], quantity: "2.5" }],
    }),
  /数量/,
);
assert.throws(() => m.normalizeTradeData({ ...data, fee: "NaN" }), /费用/);
assert.throws(
  () =>
    m.normalizeTradeData({
      ...data,
      items: [{ ...data.items[0], image_path: "../orders/file.png" }],
    }),
  /图片/,
);
assert.throws(() => m.validDate("2026-02-30", "日期"), /日期/);
assert.equal(m.validDate("2028-02-29", "日期"), "2028-02-29");
assert.equal(m.normalizeTradeData({ ...data, fee: "0" }).fee, "0");
const group = {
  ...m.emptyGroup("g1"),
  label: "TEST Cartons",
  cartons: "50",
  gross_weight: "25",
  net_weight: "24",
  length: "60",
  width: "70",
  height: "90",
};
const packingData = {
  ...structuredClone(data),
  packing_groups: [group],
  items: [
    { ...data.items[0], packing_group: "g1", quantity: "1250" },
    { ...data.items[0], id: "i2", packing_group: "g1", quantity: "100" },
  ],
};
assert.deepEqual(m.packingTotals(group), {
  gross: "1250.000",
  net: "1200.000",
  cbm: "18.900",
});
assert.equal(m.totals(packingData).cartons, 50);
assert.equal(m.totals(packingData).quantity, 1350);
assert.equal(m.totals(packingData).cbm, "18.900");
assert.throws(() => m.assertIssueReady(data, "packing"), /装箱组/);
m.assertIssueReady(packingData, "packing");
assert.throws(
  () =>
    m.assertIssueReady(
      { ...packingData, packing_groups: [{ ...group, net_weight: "26" }] },
      "packing",
    ),
  /净重/,
);
const db = new PGlite();
await db.exec(
  "create role anon;create role authenticated;create role service_role bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table public.orders(id uuid primary key,quantity integer,amount numeric);insert into public.orders values('00000000-0000-0000-0000-000000000001',100,500);",
);
const migration = await fs.readFile(
  path.join(
    root,
    "supabase/migrations/20261008033128_optional_trade_documents.sql",
  ),
  "utf8",
);
await db.exec(migration);
const save = async (id, rev, type, no, json = data, order = null) =>
  (
    await db.query(
      "select public.save_trade_document($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as doc",
      [id, rev, type, no, "2026-10-08", order, null, JSON.stringify(json)],
    )
  ).rows[0].doc;
let doc = await save(null, 0, "pi", "TEST-PI");
assert.equal(doc.order_id, null);
assert.equal(doc.status, "draft");
await assert.rejects(() => save(doc.id, 0, "pi", "TEST-PI"), /版本冲突/);
await assert.rejects(() => save(null, 0, "pi", "TEST-PI"), /unique/);
const savedPath = `versions/${doc.id}/${randomUUID()}.pdf`;
doc = (
  await db.query("select public.issue_trade_document($1,$2,$3,$4) as doc", [
    doc.id,
    doc.revision,
    savedPath,
    "a".repeat(64),
  ])
).rows[0].doc;
assert.equal(doc.status, "issued");
assert.equal(doc.current_version, 1);
const oldData = structuredClone(doc.data);
doc = await save(doc.id, doc.revision, "pi", "TEST-PI", {
  ...doc.data,
  buyer: { ...doc.data.buyer, name: "TEST Revised Buyer" },
});
assert.equal(doc.status, "draft");
assert.equal(doc.current_version, 1);
assert.deepEqual(
  (
    await db.query(
      "select data from public.trade_document_versions where document_id=$1",
      [doc.id],
    )
  ).rows[0].data,
  oldData,
);
const linked = await save(
  null,
  0,
  "ci",
  "",
  data,
  "00000000-0000-0000-0000-000000000001",
);
assert.ok(linked.document_no.startsWith("CI-"));
const generated = await Promise.all(
  Array.from({ length: 6 }, () => save(null, 0, "pi", "")),
);
assert.equal(new Set(generated.map((x) => x.document_no)).size, 6);
await db.exec(
  `update public.trade_documents set status='void' where id='${doc.id}'`,
);
await assert.rejects(() => save(doc.id, doc.revision, "pi", "TEST-PI"), /作废/);
assert.deepEqual(
  (await db.query("select quantity,amount from public.orders")).rows,
  [{ quantity: 100, amount: "500" }],
);
const privileges = (
  await db.query(
    "select has_function_privilege('anon','public.save_trade_document(uuid,integer,text,text,date,uuid,uuid,jsonb)','execute') as fn,has_table_privilege('authenticated','public.trade_documents','select') as tbl",
  )
).rows[0];
assert.deepEqual(privileges, { fn: false, tbl: false });
await db.close();
for (const type of ["pi", "ci", "packing"]) {
  const snapshot = {
    id: randomUUID(),
    document_type: type,
    document_no: `TEST-${type.toUpperCase()}`,
    document_date: "2026-10-08",
    order_id: null,
    source_document_id: null,
    status: "issued",
    revision: 1,
    current_version: 1,
    data: type === "packing" ? packingData : data,
    created_at: "",
    updated_at: "",
  };
  const bytes = await renderTradePdf(snapshot, async () => {
    throw new Error("unexpected image request");
  });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(
    Math.round(pdf.getPages()[0].getWidth()),
    type === "packing" ? 842 : 595,
  );
  await fs.writeFile(path.join(temp, `${type}.pdf`), bytes);
}
const longDoc = {
  ...linked,
  data: {
    ...data,
    buyer: { ...data.buyer, address: "Long customer address ".repeat(25) },
    items: Array.from({ length: 7 }, (_, i) => ({
      ...data.items[0],
      id: String(i),
    })),
  },
};
const longBytes = await renderTradePdf(longDoc, async () => new Uint8Array());
assert.ok((await PDFDocument.load(longBytes)).getPageCount() >= 4);
await fs.writeFile(path.join(temp, "ci-multiple-pages.pdf"), longBytes);
console.log(
  "PASS: shared currency banks, legacy consolidation and snapshot preservation, decimal rounding, input boundaries, mixed cartons, optional orders, numbering, optimistic concurrency, immutable versions, restricted access, business-data isolation, PDF orientation and continuation.",
);
console.log("QA PDFs:", temp);
