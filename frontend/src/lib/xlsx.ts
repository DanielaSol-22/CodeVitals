/**
 * Generador mínimo de archivos .xlsx (una hoja) sin dependencias.
 * Un .xlsx es un ZIP con XML; aquí se arma con el método "stored" (sin compresión).
 */
type Cell = string | number

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

export function buildXlsx(sheetName: string, rows: Cell[][], colWidths: number[] = []): Uint8Array {
  const cols = colWidths.length
    ? `<cols>${colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const sheetRows = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => {
          const ref = `${colName(c)}${r + 1}`
          return typeof v === 'number' && isFinite(v)
            ? `<c r="${ref}"><v>${v}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(clean(String(v)))}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  const files = [
    {
      name: '[Content_Types].xml',
      xml: `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      xml: `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      xml: `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      xml: `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      xml: `${X}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ]
  return zipStored(files.map((f) => ({ name: f.name, data: enc.encode(f.xml) })))
}
