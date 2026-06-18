import { roundMoney } from './ofx-parser.util';

/** pdfjs-dist não expõe tipos estáveis para Angular — carregamento dinâmico. */
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  version: string;
  getDocument: (params: { data: Uint8Array; useSystemFonts?: boolean }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
      }>;
    }>;
  };
};

const PDFJS_VERSION = '3.11.174';
let pdfjsLibPromise: Promise<PdfJsLib> | null = null;

async function getPdfJs(): Promise<PdfJsLib> {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((mod) => {
      const pdfjs = mod as PdfJsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
      return pdfjs;
    });
  }
  return pdfjsLibPromise;
}

export interface PdfParsedTransaction {
  fitid: string;
  memo: string;
  date: string;
  value: number;
}

export interface PdfParseResult {
  bank: 'itau' | 'bv' | 'unknown';
  referenceDate: string;
  transactions: PdfParsedTransaction[];
}

/** Remove acentos e colapsa espaços para facilitar regex em textos extraídos do PDF. */
export function normalizePdfText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(arrayBuffer);
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str ?? '').join(' ');
    pages.push(pageText);
  }

  return pages.join('\n');
}

function parseBrazilianMoney(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return roundMoney(parseFloat(normalized) || 0);
}

function parseReferenceDate(normalizedText: string): string {
  const patterns = [
    /Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Data de Vencimento\s+(\d{2}\/\d{2}\/\d{4})/i,
    /Emissao:\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Com vencimento em:\s*(\d{2}\/\d{2}\/\d{4})/i,
    /data de fechamento:\s*(\d{2}\/\d{2}\/\d{4})/i
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      return brDateToIso(match[1]);
    }
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function brDateToIso(value: string): string {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return value;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function buildIsoDateFromDayMonth(dayMonth: string, referenceIso: string): string {
  const parts = dayMonth.match(/^(\d{2})\/(\d{2})$/);
  if (!parts) {
    return referenceIso;
  }

  const day = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10);
  const ref = new Date(`${referenceIso}T00:00:00`);
  let year = ref.getFullYear();
  const refMonth = ref.getMonth() + 1;

  if (month > refMonth) {
    year -= 1;
  }

  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, lastDay);

  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function detectBank(normalizedText: string): PdfParseResult['bank'] {
  if (/Banco\s+BV|BV\s+Mais|01\.858\.774/i.test(normalizedText)) {
    return 'bv';
  }
  if (/ITAU UNIBANCO|Banco Ita\s*u/i.test(normalizedText)) {
    return 'itau';
  }
  return 'unknown';
}

function cleanBvDescription(raw: string): { description: string; portion: string | null } {
  let text = raw.replace(/\s+/g, ' ').trim().replace(/\s+-\s*$/, '').trim();

  const parcelAndCity = text.match(/^(.+?)\s+(\d{2}\/\d{2})\s+([A-Z][A-Z0-9\s*-]+)$/);
  if (parcelAndCity) {
    const [current, total] = parcelAndCity[2].split('/');
    return {
      description: parcelAndCity[1].trim(),
      portion: `${parseInt(current, 10)}/${parseInt(total, 10)}`
    };
  }

  const parcelOnly = text.match(/^(.+?)\s+(\d{2}\/\d{2})$/);
  if (parcelOnly) {
    const [current, total] = parcelOnly[2].split('/');
    return {
      description: parcelOnly[1].trim(),
      portion: `${parseInt(current, 10)}/${parseInt(total, 10)}`
    };
  }

  const cityAtEnd = text.match(/^(.+?)\s+([A-Z]{2,}(?:\s+[A-Z]{2,})*)$/);
  if (cityAtEnd && cityAtEnd[2].length <= 40 && !/\d/.test(cityAtEnd[2])) {
    return { description: cityAtEnd[1].trim(), portion: null };
  }

  return { description: text, portion: null };
}

function parseBvNationalPurchasesSection(
  normalizedText: string,
  referenceDate: string
): PdfParsedTransaction[] {
  const sectionMatch = normalizedText.match(
    /Lan\s*c\s*amentos\s+nacionais\s*(.+?)\s*Total\s+lan\s*c\s*amentos\s+nacionais/i
  );

  if (!sectionMatch) {
    return [];
  }

  let section = sectionMatch[1];
  section = section.replace(
    /DATA\s+DESCRICAO\s+(?:LOCALIZACAO\s+)?VALOR EM R\$\s*/gi,
    ''
  );
  section = section.replace(/DATA\s+DESCRICAO\s+VALOR EM R\$\s*/gi, '');
  section = section.replace(/Cart[aã]o\s+[\d*\s]+/gi, '');

  const transactions: PdfParsedTransaction[] = [];
  const pattern = /(\d{2}\/\d{2})\s+(.+?)\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(section)) !== null) {
    const dayMonth = match[1];
    const rawDescription = match[2].trim();
    const value = parseBrazilianMoney(match[3]);

    if (value <= 0) {
      continue;
    }

    if (/^PAGAMENTO|^CREDITO/i.test(rawDescription)) {
      continue;
    }

    const { description, portion } = cleanBvDescription(rawDescription);
    if (description.length < 2) {
      continue;
    }

    const isoDate = buildIsoDateFromDayMonth(dayMonth, referenceDate);

    transactions.push({
      fitid: `pdf-bv-${dayMonth}-${description}-${value}`.slice(0, 120),
      memo: portion ? `${description} Parcela ${portion}` : description,
      date: isoDate,
      value
    });
  }

  return transactions;
}

function parseItauPurchasesSection(
  normalizedText: string,
  referenceDate: string
): PdfParsedTransaction[] {
  const sectionMatch = normalizedText.match(
    /Lan\s*c\s*amentos:\s*compras e saques\s*(.+?)\s*Lan\s*c\s*amentos\s+no\s+cart(?:\s*a\s*o)?/i
  );

  if (!sectionMatch) {
    return [];
  }

  let section = sectionMatch[1];
  section = section.replace(/DATA\s+ESTABELECIMENTO\s+VALOR EM R\$\s*/i, '');
  section = section.replace(/^[A-Z0-9\s.*-]{8,}\s+(?=DATA|\d{2}\/)/i, '');

  const transactions: PdfParsedTransaction[] = [];
  const pattern = /(\d{2}\/\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(section)) !== null) {
    const dayMonth = match[1];
    let description = match[2].trim();
    const value = parseBrazilianMoney(match[3]);

    if (value <= 0) {
      continue;
    }

    if (/^PAGAMENTO$/i.test(description)) {
      continue;
    }

    description = description.replace(/\s+/g, ' ').trim();
    const isoDate = buildIsoDateFromDayMonth(dayMonth, referenceDate);

    transactions.push({
      fitid: `pdf-itau-${dayMonth}-${description}-${value}`.slice(0, 120),
      memo: description,
      date: isoDate,
      value
    });
  }

  return transactions;
}

export function parsePdfStatementText(text: string): PdfParseResult {
  const normalizedText = normalizePdfText(text);
  const bank = detectBank(normalizedText);
  const referenceDate = parseReferenceDate(normalizedText);

  if (bank === 'bv') {
    const transactions = parseBvNationalPurchasesSection(normalizedText, referenceDate);
    return { bank, referenceDate, transactions };
  }

  if (bank === 'itau') {
    const transactions = parseItauPurchasesSection(normalizedText, referenceDate);
    return { bank, referenceDate, transactions };
  }

  return { bank: 'unknown', referenceDate, transactions: [] };
}

export async function parsePdfFile(arrayBuffer: ArrayBuffer): Promise<PdfParseResult> {
  const text = await extractPdfText(arrayBuffer);
  return parsePdfStatementText(text);
}
