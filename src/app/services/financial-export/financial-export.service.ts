import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportColumnType = 'text' | 'currency' | 'date';

export interface ExportColumn {
  header: string;
  key: string;
  type?: ExportColumnType;
  align?: 'left' | 'right' | 'center';
  /** Largura sugerida da coluna (em caracteres) para o Excel. */
  width?: number;
}

export interface ExportMeta {
  /** Título exibido no topo do PDF. */
  title?: string;
  /** Linha de contexto (período/filtros) exibida abaixo do título no PDF. */
  subtitle?: string;
  /** Nome da aba no Excel. */
  sheetName?: string;
  /** Rótulo da linha de total (ex.: "Total"). */
  totalLabel?: string;
  /** Valor total a destacar na coluna monetária. */
  totalValue?: number;
}

export type ExportRow = Record<string, string | number | null | undefined>;

@Injectable({ providedIn: 'root' })
export class FinancialExportService {
  // ---------------------------------------------------------------------------
  // Excel (.xlsx)
  // ---------------------------------------------------------------------------
  exportToExcel(
    columns: ExportColumn[],
    rows: ExportRow[],
    filename: string,
    meta: ExportMeta = {}
  ): void {
    const header = columns.map((c) => c.header);
    const body = rows.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        if (col.type === 'currency') {
          return Number(value) || 0;
        }
        if (col.type === 'date') {
          return this.formatDate(value);
        }
        return value ?? '';
      })
    );

    const aoa: (string | number)[][] = [header, ...body];

    // Linha de total na coluna monetária, se houver.
    const currencyIndex = columns.findIndex((c) => c.type === 'currency');
    if (meta.totalValue !== undefined && currencyIndex >= 0) {
      const totalRow: (string | number)[] = columns.map(() => '');
      totalRow[0] = meta.totalLabel || 'Total';
      totalRow[currencyIndex] = Number(meta.totalValue) || 0;
      aoa.push(totalRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Formatação monetária nas células numéricas (ignora cabeçalho).
    if (currencyIndex >= 0) {
      const lastRow = aoa.length - 1;
      for (let r = 1; r <= lastRow; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: currencyIndex });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = 'R$ #,##0.00';
        }
      }
    }

    ws['!cols'] = columns.map((col) => ({
      wch: col.width || Math.max(col.header.length + 2, col.type === 'currency' ? 14 : 18)
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, meta.sheetName || 'Dados');
    XLSX.writeFile(wb, this.ensureExtension(filename, 'xlsx'));
  }

  // ---------------------------------------------------------------------------
  // PDF
  // ---------------------------------------------------------------------------
  exportToPdf(
    columns: ExportColumn[],
    rows: ExportRow[],
    filename: string,
    meta: ExportMeta = {}
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const marginX = 40;
    let cursorY = 48;

    if (meta.title) {
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 39);
      doc.text(meta.title, marginX, cursorY);
      cursorY += 18;
    }

    if (meta.subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(meta.subtitle, marginX, cursorY);
      cursorY += 16;
    }

    const head = [columns.map((c) => c.header)];
    const body = rows.map((row) =>
      columns.map((col) => this.formatCellForText(row[col.key], col.type))
    );

    const foot =
      meta.totalValue !== undefined
        ? [
            columns.map((col, idx) => {
              if (idx === 0) {
                return meta.totalLabel || 'Total';
              }
              if (col.type === 'currency') {
                return this.formatCurrency(meta.totalValue);
              }
              return '';
            })
          ]
        : undefined;

    const columnStyles: { [key: number]: { halign: 'left' | 'right' | 'center' } } = {};
    columns.forEach((col, idx) => {
      const align = col.align || (col.type === 'currency' ? 'right' : 'left');
      columnStyles[idx] = { halign: align };
    });

    autoTable(doc, {
      head,
      body,
      foot,
      startY: cursorY + 6,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles,
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        const pageNumber = doc.getNumberOfPages();
        doc.text(`Página ${pageNumber}`, pageWidth - marginX, pageHeight - 16, { align: 'right' });
        doc.text(
          `Gerado em ${this.nowLabel()}`,
          (data.settings.margin as { left: number }).left,
          pageHeight - 16
        );
      }
    });

    doc.save(this.ensureExtension(filename, 'pdf'));
  }

  // ---------------------------------------------------------------------------
  // CSV
  // ---------------------------------------------------------------------------
  exportToCsv(
    columns: ExportColumn[],
    rows: ExportRow[],
    filename: string,
    meta: ExportMeta = {}
  ): void {
    const separator = ';'; // padrão pt-BR (Excel reconhece automaticamente)
    const lines: string[] = [];

    lines.push(columns.map((c) => this.escapeCsv(c.header, separator)).join(separator));

    rows.forEach((row) => {
      const cells = columns.map((col) => {
        if (col.type === 'currency') {
          // Número com vírgula decimal (compatível com Excel pt-BR), sem separador de milhar.
          return (Number(row[col.key]) || 0).toFixed(2).replace('.', ',');
        }
        if (col.type === 'date') {
          return this.escapeCsv(this.formatDate(row[col.key]), separator);
        }
        return this.escapeCsv(String(row[col.key] ?? ''), separator);
      });
      lines.push(cells.join(separator));
    });

    const currencyIndex = columns.findIndex((c) => c.type === 'currency');
    if (meta.totalValue !== undefined && currencyIndex >= 0) {
      const totalCells = columns.map((col, idx) => {
        if (idx === 0) {
          return this.escapeCsv(meta.totalLabel || 'Total', separator);
        }
        if (idx === currencyIndex) {
          return (Number(meta.totalValue) || 0).toFixed(2).replace('.', ',');
        }
        return '';
      });
      lines.push(totalCells.join(separator));
    }

    // BOM para o Excel interpretar acentuação em UTF-8.
    const content = '﻿' + lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, this.ensureExtension(filename, 'csv'));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private formatCellForText(value: string | number | null | undefined, type?: ExportColumnType): string {
    if (type === 'currency') {
      return this.formatCurrency(Number(value) || 0);
    }
    if (type === 'date') {
      return this.formatDate(value);
    }
    return value === null || value === undefined ? '' : String(value);
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  }

  private formatDate(value: string | number | null | undefined): string {
    if (!value) {
      return '';
    }
    const raw = String(value);
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleDateString('pt-BR');
  }

  private nowLabel(): string {
    return new Date().toLocaleString('pt-BR');
  }

  private escapeCsv(value: string, separator: string): string {
    const needsQuotes = value.includes(separator) || value.includes('"') || value.includes('\n') || value.includes('\r');
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  private ensureExtension(filename: string, ext: string): string {
    const lower = filename.toLowerCase();
    return lower.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
