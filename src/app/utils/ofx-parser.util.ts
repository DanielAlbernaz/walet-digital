export interface OfxParsedTransaction {
  fitid: string;
  trntype: string;
  date: string;
  value: number;
  rawAmount: number;
  memo: string;
  isDebit: boolean;
}

export interface OfxInstallmentInfo {
  current: number;
  total: number;
  portion: string;
  baseDescription: string;
  groupKey: string;
}

const INSTALLMENT_PATTERNS: RegExp[] = [
  /parcela\s*(\d+)\s*\/\s*(\d+)/i,
  /parcela\s*(\d+)\s*de\s*(\d+)/i,
  /parc\.?\s*(\d+)\s*\/\s*(\d+)/i,
  /\s-\s*parcela\s*(\d+)\s*\/\s*(\d+)\s*$/i,
  /\s(\d+)\s*\/\s*(\d+)\s*$/i
];

export function parseOfxDate(raw: string): string {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    return new Date().toISOString().slice(0, 10);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseInstallmentFromMemo(memo: string): OfxInstallmentInfo | null {
  const text = (memo || '').trim();
  if (!text) {
    return null;
  }

  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (isNaN(current) || isNaN(total) || current < 1 || total < 2 || current > total) {
      continue;
    }

    let baseDescription = text.replace(match[0], '').trim();
    baseDescription = baseDescription.replace(/\s*-\s*$/, '').trim();
    if (!baseDescription) {
      baseDescription = text;
    }

    const groupKey = normalizeInstallmentGroupKey(baseDescription, total);
    return {
      current,
      total,
      portion: `${current}/${total}`,
      baseDescription,
      groupKey
    };
  }

  return null;
}

export function normalizeInstallmentGroupKey(baseDescription: string, total: number): string {
  const normalized = baseDescription
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return `${normalized}|${total}`;
}

function getTagValue(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

export function parseOfxContent(content: string): OfxParsedTransaction[] {
  if (!content || !content.trim()) {
    return [];
  }

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  const transactions: OfxParsedTransaction[] = [];

  blocks.forEach((block, index) => {
    const fitid = getTagValue(block, 'FITID') || `ofx-${index + 1}`;
    const trntype = getTagValue(block, 'TRNTYPE').toUpperCase();
    const dtposted = getTagValue(block, 'DTPOSTED');
    const trnamtRaw = getTagValue(block, 'TRNAMT');
    const memo = getTagValue(block, 'MEMO') || getTagValue(block, 'NAME') || 'Sem descrição';
    const rawAmount = parseFloat(trnamtRaw.replace(',', '.')) || 0;

    const isDebit = rawAmount < 0 || trntype === 'DEBIT' || trntype === 'PAYMENT';
    if (!isDebit) {
      return;
    }

    transactions.push({
      fitid,
      trntype,
      date: parseOfxDate(dtposted),
      value: Math.abs(rawAmount),
      rawAmount,
      memo,
      isDebit: true
    });
  });

  return transactions;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Move a data para o mês/ano alvo, preservando o dia quando possível. */
export function shiftDateToTargetMonth(isoDate: string, targetMonth: string): string {
  if (!isoDate || !targetMonth) {
    return isoDate;
  }

  const monthMatch = targetMonth.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) {
    return isoDate;
  }

  const targetYear = parseInt(monthMatch[1], 10);
  const targetMonthNum = parseInt(monthMatch[2], 10);
  const dateParts = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateParts) {
    return isoDate;
  }

  const originalDay = parseInt(dateParts[3], 10);
  const lastDayOfMonth = new Date(targetYear, targetMonthNum, 0).getDate();
  const day = Math.min(originalDay, lastDayOfMonth);

  return `${targetYear}-${String(targetMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
