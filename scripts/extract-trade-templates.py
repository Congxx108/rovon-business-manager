"""Extract template geometry without retaining invoice/customer/bank sample values in Git."""
import argparse, json, zipfile, xml.etree.ElementTree as E, pathlib, posixpath, re

S = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
D = {'x': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}

def idx(ref):
    col, row = re.match(r'([A-Z]+)(\d+)', ref).groups()
    c = 0
    for ch in col: c = c * 26 + ord(ch) - 64
    return [c - 1, int(row) - 1]

def extract(file, kind, dest):
    with zipfile.ZipFile(file) as z:
        ss = [''.join(n.itertext()) for n in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', S)]
        root = E.fromstring(z.read('xl/worksheets/sheet1.xml'))
        style = E.fromstring(z.read('xl/styles.xml'))
        fonts = []
        for f in style.findall('s:fonts/s:font', S):
            color = f.find('s:color', S)
            fonts.append({'size': float(f.find('s:sz', S).get('val')), 'bold': f.find('s:b', S) is not None, 'serif': f.find('s:name', S).get('val') in ['Georgia', 'Cambria'], 'color': color.get('rgb', 'FF000000')[-6:] if color is not None else '000000'})
        fills = []
        for f in style.findall('s:fills/s:fill', S):
            color = f.find('s:patternFill/s:fgColor', S)
            fills.append(color.get('rgb', '')[-6:] if color is not None else '')
        borders = []
        for b in style.findall('s:borders/s:border', S):
            borders.append({side: b.find('s:' + side, S).get('style', '') for side in ['left', 'right', 'top', 'bottom'] if b.find('s:' + side, S) is not None})
        styles = []
        for xf in style.findall('s:cellXfs/s:xf', S):
            a = xf.find('s:alignment', S)
            styles.append({'font': fonts[int(xf.get('fontId', 0))], 'fill': fills[int(xf.get('fillId', 0))], 'border': borders[int(xf.get('borderId', 0))], 'align': a.get('horizontal', 'left') if a is not None else 'left', 'valign': a.get('vertical', 'bottom') if a is not None else 'bottom', 'wrap': a.get('wrapText') == '1' if a is not None else False})
        count = 16 if kind == 'packing' else 11
        cols = [64.0] * count
        for c in root.findall('s:cols/s:col', S):
            for i in range(int(c.get('min')) - 1, min(int(c.get('max')), count)):
                cols[i] = int(float(c.get('width', '8.43')) * 7 + 5) * .75
        maxrow = 30 if kind == 'packing' else (42 if kind == 'pi' else 40)
        default_height = float(root.find('s:sheetFormatPr', S).get('defaultRowHeight', 15))
        rows = [default_height] * maxrow
        cells = []
        for row in root.findall('s:sheetData/s:row', S):
            r = int(row.get('r')) - 1
            if r < maxrow: rows[r] = float(row.get('ht', default_height))
            for c in row.findall('s:c', S):
                col, r = idx(c.get('r'))
                if col < count and r < maxrow: cells.append({'ref': c.get('r'), 'col': col, 'row': r, 'style': int(c.get('s', 0))})
        merges = [list(idx(m.get('ref').split(':')[0])) + list(idx(m.get('ref').split(':')[-1])) for m in root.findall('s:mergeCells/s:mergeCell', S)]
        margins = root.find('s:pageMargins', S).attrib
        scale = float(root.find('s:pageSetup', S).get('scale', 100)) / 100
        drawings = []
        for dp in ['xl/drawings/drawing1.xml']:
            if dp not in z.namelist(): continue
            relpath = 'xl/drawings/_rels/drawing1.xml.rels'
            rels = {r.get('Id'): posixpath.normpath(posixpath.join('xl/drawings', r.get('Target'))) for r in E.fromstring(z.read(relpath))}
            for a in E.fromstring(z.read(dp)):
                pic = a.find('x:pic', D)
                if pic is None: continue
                start = a.find('x:from', D)
                end = a.find('x:to', D)
                fr = {x.tag.split('}')[-1]: int(x.text) for x in start}
                # Only header brand art. Product photos are never added to the repository.
                if fr.get('row', 99) >= 7: continue
                rid = pic.find('x:blipFill/a:blip', D).get('{' + S['r'] + '}embed')
                media = rels[rid]
                filename = kind + '-header-' + str(len(drawings)) + pathlib.Path(media).suffix
                (dest / filename).write_bytes(z.read(media))
                to = {x.tag.split('}')[-1]: int(x.text) for x in end} if end is not None else None
                extent = a.find('x:ext', D)
                drawings.append({'from': fr, 'to': to, 'extent': dict(extent.attrib) if extent is not None else None, 'file': filename})
        result = {'kind': kind, 'cols': cols, 'rows': rows, 'cells': cells, 'merges': merges, 'styles': styles, 'scale': scale, 'margins': {k: float(v) for k, v in margins.items()}, 'drawings': drawings}
        (dest / (kind + '.json')).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(kind, 'geometry', round(sum(cols) * scale, 1), 'x', round(sum(rows) * scale, 1), 'header images', len(drawings))
        settings = E.fromstring(z.read('xl/worksheets/sheet2.xml')) if 'xl/worksheets/sheet2.xml' in z.namelist() else None
        bank_values = {}
        if settings is not None:
            for c in settings.findall('s:sheetData/s:row/s:c', S):
                v = c.find('s:v', S)
                if v is not None: bank_values[c.get('r')] = ss[int(v.text)] if c.get('t') == 's' else v.text
        return [{'id': f'{kind}-{bank_values.get("A"+str(r),"")}', 'name': f'{kind.upper()} 原表 {bank_values.get("A"+str(r),"")}', 'document_type': kind, 'currency': bank_values.get('A'+str(r), ''), **{field: str(bank_values.get(col+str(r), '')).strip() for col, field in [('E','bank_name'),('F','account_name'),('G','account_no'),('H','swift'),('I','address'),('J','remark')]}} for r in range(2,12) if bank_values.get('A'+str(r))] if settings is not None else []

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--pi', required=True); p.add_argument('--ci', required=True); p.add_argument('--packing', required=True)
    p.add_argument('--output', required=True); p.add_argument('--private-banks', required=True)
    args = p.parse_args(); dest = pathlib.Path(args.output); dest.mkdir(parents=True, exist_ok=True)
    banks = extract(args.pi, 'pi', dest) + extract(args.ci, 'ci', dest)
    extract(args.packing, 'packing', dest)
    pathlib.Path(args.private_banks).write_text(json.dumps(banks, ensure_ascii=False), encoding='utf-8')
