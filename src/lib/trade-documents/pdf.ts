import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import pi from "../../../assets/trade-documents/pi.json";
import ci from "../../../assets/trade-documents/ci.json";
import packing from "../../../assets/trade-documents/packing.json";
import { lineAmount, packingTotals, totals, type TradeDocument } from "./model";
type Template = typeof pi;
type Note = { label: string; text: string };
const templates = { pi, ci, packing };
const assetDir = () => path.join(process.cwd(), "assets", "trade-documents");
const blue = rgb(36 / 255, 72 / 255, 170 / 255);
const color = (s: string) =>
  /^[a-f\d]{6}$/i.test(s)
    ? rgb(
        parseInt(s.slice(0, 2), 16) / 255,
        parseInt(s.slice(2, 4), 16) / 255,
        parseInt(s.slice(4), 16) / 255,
      )
    : rgb(0, 0, 0);
function dynamicCell(
  kind: TradeDocument["document_type"],
  col: number,
  row: number,
) {
  if (kind === "packing")
    return (
      (row === 3 && col === 2) ||
      ([8, 9, 10].includes(row) && [0, 8].includes(col)) ||
      ([11, 12].includes(row) && [2, 8, 14].includes(col)) ||
      (row >= 17 && row <= 21) ||
      (row === 22 && [6, 7, 9, 11, 13].includes(col)) ||
      ([23, 25].includes(row) && col === 3)
    );
  const footer = kind === "pi" ? 26 : 24;
  return (
    (row === 3 && col === 8) ||
    (row === 4 && [0, 8].includes(col)) ||
    (row === 5 && col === 8) ||
    (row >= 10 && row <= 13 && [0, 5].includes(col)) ||
    (row === 16 && [0, 2, 3, 6, 9].includes(col)) ||
    (row === 18 && [9, 10].includes(col)) ||
    (row >= 19 && row <= footer - 4) ||
    ([footer - 2, footer - 1].includes(row) && [8, 10].includes(col)) ||
    (row >= footer + 1 && row <= footer + 4 && col === 0) ||
    (row >= footer + 7 && row <= footer + 11 && col === 0) ||
    (row === footer + 16 && [0, 6].includes(col))
  );
}
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(
      /(?<=\s)|(?=[\u3000-\u9fff])|(?<=[\u3000-\u9fff])/u,
    )) {
      if (font.widthOfTextAtSize(line + word, size) <= width) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trim());
      line = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(line + ch, size) > width && line) {
          lines.push(line.trim());
          line = ch;
        } else line += ch;
      }
    }
    lines.push(line.trim());
  }
  return lines;
}
function values(
  doc: TradeDocument,
  start: number,
  capacity: number,
  last: boolean,
) {
  const d = doc.data,
    type = doc.document_type,
    items = d.items.slice(start, start + capacity),
    sum = totals(d),
    v: Record<string, string> = {};
  if (type === "packing") {
    Object.assign(v, {
      J2: "PACKING LIST",
      C3: "ROVON GLOBAL Bag Manufacturing Co., Ltd.",
      A7: "SELLER",
      I7: "BUYER",
      A8: d.seller.name,
      A9: d.seller.address,
      A10: d.seller.phone,
      I8: d.buyer.name,
      I9: d.buyer.address,
      I10: d.buyer.phone,
      A11: "Invoice No.",
      C11: d.invoice_reference || doc.document_no,
      G11: "Invoice Date",
      I11: doc.document_date,
      M11: "Mode of Delivery",
      O11: d.delivery,
      A12: "Trade Term",
      C12: d.incoterm,
      G12: "From (Departure)",
      I12: d.departure,
      M12: "To (Destination)",
      O12: d.destination,
      A13: "Packing details should match product labels, carton labels, shipment documents, and customs declaration.",
      A22: last ? "TOTAL" : "CONTINUED",
      G22: last ? String(sum.cartons) : "",
      H22: last ? String(sum.quantity) : "",
      J22: last ? sum.gross : "",
      L22: last ? sum.net : "",
      N22: last ? sum.cbm : "",
      A23: "REMARK:",
      D23: [d.shipment_label, d.remark].filter(Boolean).join("\n"),
      A25: "DECLARATION:",
      D25: d.declaration,
      A30: "Seller Signature: Authorized Signatory",
      J30: "Buyer Acceptance: Authorized Representative",
    });
    const headers = [
      "#",
      "PICTURE",
      "DESCRIPTION",
      "CHINESE NAME",
      "Materials",
      "H.S CODE",
      "CTNS",
      "QUANTITY\n(PCS)",
      "G.WEIGH\n(KG)",
      "TOTAL\nG.WEIGH\n(KG)",
      "NET.WEIGH\n(KG)",
      "TOTAL\nNET.WEIGH\n(KG)",
      "DIMENSION\nL * W * H\n(cm)",
      "MESA.\n(CBM)",
      "LOGO\n/BRAND",
      "WITH BATTERY",
    ];
    const chinese = [
      "序号",
      "产品图片",
      "英文品名",
      "中文品名",
      "材质",
      "海关商品编码",
      "箱数",
      "总件数",
      "单箱毛重",
      "总毛重",
      "单箱净重",
      "总净重",
      "长*宽*高",
      "总体积",
      "品牌信息",
      "电池信息",
    ];
    for (let i = 0; i < 16; i++) {
      v[`${String.fromCharCode(65 + i)}15`] = headers[i];
      v[`${String.fromCharCode(65 + i)}16`] = chinese[i];
    }
    items.forEach((item, i) => {
      const r = i + 17,
        g = d.packing_groups.find((g) => g.id === item.packing_group);
      const first =
        !!g && d.items.findIndex((x) => x.packing_group === g.id) === start + i;
      const p = g ? packingTotals(g) : null;
      Object.assign(v, {
        [`A${r}`]: String(start + i + 1),
        [`C${r}`]: item.description,
        [`D${r}`]: item.chinese_name,
        [`E${r}`]: item.material,
        [`F${r}`]: item.hs_code,
        [`G${r}`]: first ? g!.cartons : "",
        [`H${r}`]: item.quantity,
        [`I${r}`]: first ? g!.gross_weight : "",
        [`J${r}`]: first ? p!.gross : "",
        [`K${r}`]: first ? g!.net_weight : "",
        [`L${r}`]: first ? p!.net : "",
        [`M${r}`]: g
          ? `${g.length}*${g.width}*${g.height}${g.label ? `\n${g.label}` : ""}`
          : "",
        [`N${r}`]: first ? p!.cbm : "",
        [`O${r}`]: item.brand,
        [`P${r}`]: item.battery,
      });
    });
  } else {
    const footer = type === "pi" ? 26 : 24,
      fee = footer - 2,
      total = footer - 1,
      bank = footer + 7;
    Object.assign(v, {
      F2: type === "pi" ? "PROFORMA INVOICE" : "COMMERCIAL INVOICE",
      I3: `No. ${doc.document_no}`,
      A4: "ROVON GLOBAL Bag Manufacturing Co., Ltd.",
      I4: `Date: ${doc.document_date}`,
      I5: d.valid_until ? `Valid Until: ${d.valid_until}` : "",
      A9: "FROM",
      F9: "TO",
      A10: d.seller.name,
      A11: d.seller.address,
      A12: d.seller.contact,
      A13: d.seller.phone,
      F10: d.buyer.name,
      F11: d.buyer.address,
      F12: d.buyer.contact,
      F13: d.buyer.phone,
      A15: "Incoterms",
      C15: "FOB City",
      D15: "Payment Terms",
      G15: "Payment Method",
      J15: "Currency",
      A16: d.incoterm,
      C16: d.fob_city,
      D16: d.payment_terms,
      G16: d.payment_method,
      J16: d.currency,
      A18: "#",
      B18: "PHOTO",
      C18: "DESCRIPTION",
      F18: "SPEC /\nMODEL",
      H18: "UNIT",
      I18: "QTY",
      J18: `UNIT\nPRICE\n(${d.currency})`,
      K18: `AMOUNT\n(${d.currency})`,
      [`I${fee}`]: `${d.fee_label} (${d.currency})`,
      [`K${fee}`]: last ? d.fee : "",
      [`I${total}`]: last ? "TOTAL" : "CONTINUED",
      [`K${total}`]: last ? `${d.currency} ${sum.amount}` : "",
      [`A${footer}`]: "TERMS & CONDITIONS",
      [`A${footer + 5}`]: "Manual Bank Override:",
      [`A${footer + 6}`]: "BANK INFORMATION:",
      [`A${footer + 14}`]: "Seller Signature: Authorized Signatory",
      [`G${footer + 14}`]: "Buyer Acceptance: Authorized Representative",
      [`A${footer + 16}`]: d.seller.name,
      [`G${footer + 16}`]: d.buyer.name,
    });
    d.terms.forEach((t, i) => (v[`A${footer + 1 + i}`] = t));
    if (d.bank_override) v[`A${bank}`] = d.bank_override;
    else {
      v[`A${bank}`] = `Bank Name: ${d.bank.bank_name}`;
      v[`A${bank + 1}`] = `Account Name: ${d.bank.account_name}`;
      v[`A${bank + 2}`] = `A/C No.: ${d.bank.account_no}`;
      v[`A${bank + 3}`] = d.bank.remark ? `Remark: ${d.bank.remark}` : "";
      v[`A${bank + 4}`] =
        `SWIFT/Code: ${d.bank.swift}    Bank Address: ${d.bank.address}`;
    }
    items.forEach((item, i) => {
      const r = i + 19;
      Object.assign(v, {
        [`A${r}`]: String(start + i + 1),
        [`C${r}`]: item.description,
        [`F${r}`]: item.model,
        [`H${r}`]: item.unit,
        [`I${r}`]: item.quantity,
        [`J${r}`]: item.unit_price,
        [`K${r}`]:
          item.quantity && item.unit_price
            ? `${d.currency} ${lineAmount(item)}`
            : "",
      });
    });
  }
  v[type === "packing" ? "C3" : "A4"] = d.seller.name.replace(
    /\(Yiwu surong\)/i,
    "",
  );
  return v;
}
export async function renderTradePdf(
  doc: TradeDocument,
  imageReader: (path: string) => Promise<Uint8Array>,
) {
  const template = templates[doc.document_type] as Template,
    pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${doc.document_type.toUpperCase()} ${doc.document_no}`);
  pdf.setAuthor(doc.data.seller.name);
  pdf.setCreationDate(new Date(`${doc.document_date}T00:00:00Z`));
  pdf.setModificationDate(new Date(`${doc.document_date}T00:00:00Z`));
  const capacity =
    doc.document_type === "pi" ? 4 : doc.document_type === "ci" ? 2 : 5;
  let needsCjk = false;
  for (let start = 0; start < doc.data.items.length; start += capacity) {
    const text = values(
      doc,
      start,
      capacity,
      start + capacity >= doc.data.items.length,
    );
    if (
      template.cells.some(
        (c) =>
          dynamicCell(doc.document_type, c.col, c.row + 1) &&
          /[^\u0000-\u00ff]/.test(text[c.ref] ?? ""),
      )
    )
      needsCjk = true;
  }
  // Full embedding avoids fontkit's CJK subset glyph loss; English documents omit this font.
  const [normal, bold, serif, serifBold, chinese, background] =
    await Promise.all([
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.TimesRoman),
      pdf.embedFont(StandardFonts.TimesRomanBold),
      needsCjk
        ? fs
            .readFile(path.join(assetDir(), "NotoSansSC-Regular.ttf"))
            .then((bytes) => pdf.embedFont(bytes))
        : pdf.embedFont(StandardFonts.Helvetica),
      fs
        .readFile(path.join(assetDir(), `${doc.document_type}-base.pdf`))
        .then((bytes) => pdf.embedPdf(bytes, [0])),
    ]);
  const chooseFont = (
    text: string,
    style: { bold: boolean; serif: boolean },
  ) =>
    /[^\u0000-\u00ff]/.test(text)
      ? chinese
      : style.serif
        ? style.bold
          ? serifBold
          : serif
        : style.bold
          ? bold
          : normal;
  const base = background[0],
    { width, height } = base,
    xs = template.printX,
    ys = template.printY,
    scale = template.scale;
  const notes: Note[] = [];
  const imagePaths = [
    ...new Set(doc.data.items.map((x) => x.image_path).filter(Boolean)),
  ];
  if (imagePaths.length > 100) throw new Error("图片数量超出限制");
  const pictures = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  let byteCount = 0;
  for (const imagePath of imagePaths) {
    const bytes = await imageReader(imagePath);
    byteCount += bytes.length;
    if (byteCount > 20000000)
      throw new Error("图片总大小超过 20 MB，请压缩图片");
    const img = imagePath.endsWith(".png")
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
    pictures.set(imagePath, img);
  }
  for (let start = 0; start < doc.data.items.length; start += capacity) {
    const last = start + capacity >= doc.data.items.length;
    const page = pdf.addPage([width, height]),
      v = values(doc, start, capacity, last);
    page.drawPage(base, { x: 0, y: 0 });
    if (doc.document_type === "packing" && !last) {
      page.drawRectangle({
        x: xs[0] + 1,
        y: height - ys[22] + 1,
        width: xs[6] - xs[0] - 2,
        height: ys[22] - ys[21] - 2,
        color: rgb(0.94, 0.96, 0.98),
      });
      page.drawText("CONTINUED", {
        x: xs[0] + 3,
        y: height - ys[22] + 4,
        size: 6,
        font: bold,
        color: blue,
      });
    }
    for (const cell of template.cells) {
      if (!dynamicCell(doc.document_type, cell.col, cell.row + 1)) continue;
      const text = v[cell.ref];
      if (!text) continue;
      const merged = template.merges.find(
        (m) =>
          cell.col >= m[0] &&
          cell.col <= m[2] &&
          cell.row >= m[1] &&
          cell.row <= m[3],
      );
      if (merged && (cell.col !== merged[0] || cell.row !== merged[1]))
        continue;
      let c2 = merged
        ? Math.min(merged[2] + 1, template.cols.length)
        : cell.col + 1;
      const r2 = merged
        ? Math.min(merged[3] + 1, template.rows.length)
        : cell.row + 1;
      const footer = doc.document_type === "pi" ? 26 : 24;
      // Match Excel text overflow across adjacent blank source cells.
      if (doc.document_type !== "packing") {
        if (
          cell.col === 0 &&
          cell.row + 1 >= footer + 1 &&
          cell.row + 1 <= footer + 4
        )
          c2 = 11;
        if (cell.col === 8 && cell.row + 1 === footer - 2) c2 = 10;
        if (cell.row + 1 === footer + 16) c2 = cell.col === 0 ? 6 : 11;
      } else if (cell.row === 9 && [0, 8].includes(cell.col))
        c2 = cell.col === 0 ? 8 : 16;
      const x = xs[cell.col],
        y = height - ys[r2],
        w = xs[c2] - x,
        h = ys[r2] - ys[cell.row],
        st = template.styles[cell.style];
      const font = chooseFont(text, st.font),
        pad = 1.2;
      const nominalSize = st.font.size * scale;
      const feeCell =
        doc.document_type !== "packing" &&
        cell.col === 8 &&
        cell.row + 1 === footer - 2;
      const size = feeCell
        ? Math.max(
            4,
            Math.min(
              nominalSize,
              (nominalSize * (w - pad * 2)) /
                font.widthOfTextAtSize(text, nominalSize),
            ),
          )
        : nominalSize;
      const leading = size * 1.12;
      const lines = wrap(text, font, size, Math.max(3, w - pad * 2)),
        max = Math.max(1, Math.floor((h - pad * 2 + 1) / leading));
      let visible = lines;
      if (lines.length > max) {
        let index = notes.findIndex((n) => n.text === text);
        if (index < 0) {
          index = notes.length;
          notes.push({ label: `Additional details ${index + 1}`, text });
        }
        visible = [...lines.slice(0, max - 1), `See details ${index + 1}`];
      }
      const block = visible.length * leading,
        textTop =
          st.valign === "center"
            ? y + (h + block) / 2 - size
            : st.valign === "top"
              ? y + h - pad - size
              : y + block - size + pad;
      visible.forEach((line, i) => {
        const tw = font.widthOfTextAtSize(line, size),
          tx =
            st.align === "right"
              ? x + w - tw - pad
              : st.align === "center"
                ? x + (w - tw) / 2
                : x + pad;
        page.drawText(line, {
          x: tx,
          y: textTop - i * leading,
          size,
          font,
          color: color(st.font.color),
        });
      });
    }
    doc.data.items.slice(start, start + capacity).forEach((item, i) => {
      const img = pictures.get(item.image_path);
      if (!img) return;
      const row = (doc.document_type === "packing" ? 16 : 18) + i,
        x = xs[1] + 2,
        yTop = height - ys[row] - 2,
        w = xs[2] - xs[1] - 4,
        h = ys[row + 1] - ys[row] - 4;
      const s = Math.min(w / img.width, h / img.height);
      page.drawImage(img, {
        x: x + (w - img.width * s) / 2,
        y: yTop - (h + img.height * s) / 2,
        width: img.width * s,
        height: img.height * s,
      });
    });
  }
  let notePage = null as ReturnType<typeof pdf.addPage> | null,
    y = 0;
  for (const note of notes) {
    const font = chooseFont(note.text, { bold: false, serif: false });
    for (const line of [
      note.label,
      ...wrap(note.text, font, 10, width - 100),
      "",
    ]) {
      if (!notePage || y < 60) {
        notePage = pdf.addPage([width, height]);
        notePage.drawText("ADDITIONAL DETAILS", {
          x: 50,
          y: height - 55,
          font: bold,
          size: 16,
          color: blue,
        });
        notePage.drawText(doc.document_no, {
          x: 50,
          y: height - 78,
          font: normal,
          size: 10,
        });
        y = height - 105;
      }
      if (line) notePage.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    }
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: width - 65,
      y: 14,
      font: normal,
      size: 7,
      color: rgb(0.4, 0.4, 0.4),
    });
    if (doc.status === "draft")
      p.drawText("DRAFT", {
        x: 50,
        y: 14,
        font: bold,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
  });
  return pdf.save();
}
