import { exportValue, safeSpreadsheetValue, serializeCsv } from "./exportUtils.js";

const MIME_TYPES = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export async function createCustomerExport(format, records, columns) {
  if (format === "csv") {
    return { blob: new Blob([serializeCsv(records, columns)], { type: MIME_TYPES.csv }), mimeType: MIME_TYPES.csv };
  }

  if (format === "xlsx") {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const xmlEscape = (value) => safeSpreadsheetValue(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
    const columnName = (number) => {
      let label = "";
      for (let value = number; value > 0; value = Math.floor((value - 1) / 26)) label = String.fromCharCode(65 + ((value - 1) % 26)) + label;
      return label;
    };
    const allRows = [columns.map((column) => column.label), ...records.map((record) => columns.map((column) => record[column.key]))];
    const sheetRows = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(exportValue(value))}</t></is></c>`;
    }).join("")}</row>`).join("");
    const finalCell = `${columnName(columns.length)}${allRows.length}`;
    const widths = columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(Math.max(column.label.length + 4, 14), 32)}" customWidth="1"/>`).join("");

    zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file("xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Customers" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${finalCell}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${finalCell}"/></worksheet>`);
    const blob = await zip.generateAsync({ type: "blob", mimeType: MIME_TYPES.xlsx });
    return { blob, mimeType: MIME_TYPES.xlsx };
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    document.setProperties({ title: "CustomerHub customer report", subject: `${records.length} customer records` });
    document.setFont("helvetica", "bold");
    document.setFontSize(16);
    document.text("CustomerHub customer report", 15, 17);
    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    document.text(`${records.length} records | Generated ${new Date().toLocaleDateString()}`, 15, 24);

    let y = 34;
    const contentWidth = pageWidth - 30;
    records.forEach((record, index) => {
      if (y > pageHeight - 28) {
        document.addPage();
        y = 18;
      }
      document.setFont("helvetica", "bold");
      document.setFontSize(10);
      document.text(`Record ${index + 1}`, 15, y);
      y += 5;
      document.setFont("helvetica", "normal");
      document.setFontSize(8.5);
      for (const column of columns) {
        const line = `${column.label}: ${exportValue(record[column.key]) || "—"}`;
        const wrapped = document.splitTextToSize(line, contentWidth);
        if (y + wrapped.length * 4.2 > pageHeight - 12) {
          document.addPage();
          y = 18;
        }
        document.text(wrapped, 18, y);
        y += wrapped.length * 4.2;
      }
      y += 3;
      document.setDrawColor(226, 232, 240);
      document.line(15, y, pageWidth - 15, y);
      y += 5;
    });
    return { blob: document.output("blob"), mimeType: MIME_TYPES.pdf };
  }

  throw new Error("Unsupported customer export format");
}

export function downloadExport(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createExportFilename(format) {
  return `customerhub-customers-${new Date().toISOString().slice(0, 10)}.${format}`;
}
