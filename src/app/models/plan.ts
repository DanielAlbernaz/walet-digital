export interface Plan {
  id: number;
  name: 'Free' | 'Pro';
  slug: string;
  max_users?: number;
  features: PlanFeatures;
}

export interface PlanFeatures {
  installments: boolean;
  advanced_reports: boolean;
  exports: boolean;
  custom_categories: boolean;
  // Adicione outras features conforme necessário
}

