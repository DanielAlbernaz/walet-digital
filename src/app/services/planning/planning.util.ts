// Utilitários de formatação compartilhados pelas telas de Planejamento.
export function formatBRL(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}
