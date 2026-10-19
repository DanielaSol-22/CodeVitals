/**
 * Generador mínimo de archivos .xlsx (varias hojas, estilos, filtros) sin dependencias.
 * Un .xlsx es un ZIP con XML; aquí se arma con el método "stored" (sin compresión).
 */

const enc = new TextEncoder()

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipStored(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // nombres en UTF-8
    local.setUint32(14, crc, true)
    local.setUint32(18, f.data.length, true)
    local.setUint32(22, f.data.length, true)
    local.setUint16(26, name.length, true)
    parts.push(new Uint8Array(local.buffer), name, f.data)

    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, f.data.length, true)
    c.setUint32(24, f.data.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, offset, true)
    central.push(new Uint8Array(c.buffer), name)
    offset += 30 + name.length + f.data.length
  }
  const centralSize = central.reduce((a, p) => a + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0))
  let pos = 0
  for (const p of all) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string)
// Quita caracteres de control que XML no admite.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

function colName(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}


export type StyleKey =
  | 'title' | 'subtitle' | 'header' | 'text' | 'center' | 'wrap' | 'high' | 'med' | 'low'
  | 'kpiLabel' | 'kpiValue' | 'section' | 'note' | 'pct'

/** Índice de cada estilo en <cellXfs> de styles.xml (0 = sin estilo). */
const STYLE_ID: Record<StyleKey, number> = {
  title: 1, subtitle: 2, header: 3, text: 4, center: 5, wrap: 6, high: 7, med: 8, low: 9,
  kpiLabel: 10, kpiValue: 11, section: 12, note: 13, pct: 14,
}

export type Cell = string | number | { v: string | number; s: StyleKey }

export interface Sheet {
  name: string
  rows: Cell[][]
  widths?: number[]
  /** Filas fijas arriba al desplazarse (encabezado). */
  freezeRows?: number
  /** Filtro automático: fila del encabezado (1 = primera). */
  filterRow?: number
  /** Celdas combinadas, p. ej. "A1:F1". */
  merges?: string[]
  /** Rangos con barra de datos de 0 a 100, p. ej. "C5:C60". */
  dataBars?: string[]
  /** Alto de filas concretas en puntos (1 = primera fila). */
  heights?: Record<number, number>
}

const BORDER = '<border><left/><right/><top/><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>'
const xf = (font: number, fill: number, border: number, align = '', numFmt = 0) =>
  `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${numFmt ? ' applyNumberFormat="1"' : ''}${align ? ' applyAlignment="1">' + align + '</xf>' : '/>'}`
const V = (h: string, wrap = false) => `<alignment horizontal="${h}" vertical="center"${wrap ? ' wrapText="1"' : ''}/>`

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="9">
<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="18"/><color rgb="FF4C2FBF"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="FF111827"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font>
<font><b/><sz val="20"/><color rgb="FF111827"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF3B2A8F"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${BORDER}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
${xf(2, 0, 0, V('left'))}
${xf(4, 0, 0, V('left'))}
${xf(1, 2, 0, V('center', true))}
${xf(0, 0, 1, V('left'))}
${xf(0, 0, 1, V('center'))}
${xf(0, 0, 1, '<alignment horizontal="left" vertical="top" wrapText="1"/>')}
${xf(5, 3, 1, V('center'))}
${xf(6, 4, 1, V('center'))}
${xf(7, 5, 1, V('center'))}
${xf(4, 6, 0, V('center'))}
${xf(8, 6, 0, V('center'))}
${xf(3, 0, 1, V('left'))}
${xf(4, 0, 0, '<alignment horizontal="left" vertical="top" wrapText="1"/>')}
${xf(0, 0, 1, V('center'), 9)}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

function sheetXml(sh: Sheet): string {
  const cols = sh.widths?.length
    ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const rows = sh.rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          const v = typeof cell === 'object' ? cell.v : cell
          const s = typeof cell === 'object' ? ` s="${STYLE_ID[cell.s]}"` : ''
          const ref = `${colName(c)}${r + 1}`
          return typeof v === 'number' && isFinite(v)
            ? `<c r="${ref}"${s}><v>${v}</v></c>`
            : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(clean(String(v)))}</t></is></c>`
        })
        .join('')
      const h = sh.heights?.[r + 1]
      return `<row r="${r + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cells}</row>`
    })
    .join('')
  const lastCol = colName(Math.max(0, ...sh.rows.map((r) => r.length - 1)))
  const pane = sh.freezeRows
    ? `<pane ySplit="${sh.freezeRows}" topLeftCell="A${sh.freezeRows + 1}" activePane="bottomLeft" state="frozen"/>`
    : ''
  const view = `<sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews>`
  const filter = sh.filterRow ? `<autoFilter ref="A${sh.filterRow}:${lastCol}${sh.rows.length}"/>` : ''
  const merges = sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
  const bars = (sh.dataBars ?? [])
    .map((ref, i) => `<conditionalFormatting sqref="${ref}"><cfRule type="dataBar" priority="${i + 1}"><dataBar><cfvo type="num" val="0"/><cfvo type="num" val="100"/><color rgb="FF8B7CFF"/></dataBar></cfRule></conditionalFormatting>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${view}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rows}</sheetData>${filter}${merges}${bars}</worksheet>`
}

/** Libro de Excel con varias hojas, colores de riesgo, filtros y barras de datos. */
export function buildWorkbook(sheets: Sheet[]): Uint8Array {
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  const sheetOverrides = sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('')
  const files = [
    {
      name: '[Content_Types].xml',
      xml: `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>`,
    },
    {
      name: '_rels/.rels',
      xml: `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      xml: `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(clean(s.name)).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      xml: `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'xl/styles.xml', xml: STYLES_XML },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, xml: sheetXml(s) })),
  ]
  return zipStored(files.map((f) => ({ name: f.name, data: enc.encode(f.xml) })))
}

/** Compatibilidad: libro de una sola hoja sin estilos. */
export function buildXlsx(sheetName: string, rows: Cell[][], colWidths: number[] = []): Uint8Array {
  return buildWorkbook([{ name: sheetName, rows, widths: colWidths }])
}
