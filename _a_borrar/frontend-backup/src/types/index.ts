// Tipos para el análisis de riesgos

export interface ComponentScores {
  cyclomatic_complexity: number;
  code_churn: number;
  lines_of_code: number;
  code_duplication: number;
  bus_factor: number;
}

export interface ComponentAssessments {
  cyclomatic_complexity: string;
  code_churn: string;
  lines_of_code: string;
  code_duplication: string;
  bus_factor: string;
}

export interface RiskAnalysis {
  risk_score: number;
  classification: 'LOW' | 'MEDIUM' | 'HIGH';
  justification: string;
  maintenance_difficulty_index: number;
  difficulty_rating: string;
  component_scores: ComponentScores;
  component_assessments: ComponentAssessments;
}

export interface CodeMetrics {
  cyclomatic_complexity: number;
  lines_of_code: number;
  functions_count: number;
  deficiencies: string[];
}

export interface GitMetrics {
  commits: number;
  code_churn: number;
  bus_factor_risk: number;
}

export interface ModuleRisk {
  file: string;
  risk_analysis: RiskAnalysis;
  code_metrics: CodeMetrics;
  git_metrics: GitMetrics;
}

export interface RepositoryRiskSummary {
  total_modules: number;
  overall_risk_classification: string;
  average_risk_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
}

export interface RepositoryRisk {
  summary: RepositoryRiskSummary;
  average_component_scores: Partial<ComponentScores>;
  high_risk_modules: Array<{
    file: string;
    risk_score: number;
    classification: string;
    deficiencies: string[];
  }>;
  medium_risk_modules: Array<{
    file: string;
    risk_score: number;
    classification: string;
    deficiencies: string[];
  }>;
  low_risk_modules: Array<{
    file: string;
    risk_score: number;
    classification: string;
    deficiencies: string[];
  }>;
}

export interface PriorityItem {
  priority: number;
  file: string;
  risk_score: number;
  classification: string;
  deficiencies_count: number;
  action: string;
}

export interface PriorityListResponse {
  total_modules: number;
  high_risk_modules: number;
  priority_list: PriorityItem[];
}
