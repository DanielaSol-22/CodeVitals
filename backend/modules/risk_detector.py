"""
Detector de Riesgos
Implementa la fórmula ponderada de riesgo para análisis de mantenibilidad
"""
from typing import Dict, List, Any, Tuple


class RiskDetector:
    """
    Calcula el riesgo de mantenibilidad usando fórmula ponderada
    
    Fórmula: Risk = 0.375·CC + 0.275·Churn + 0.175·LOC + 0.125·Dup + 0.125·BusF
    """
    
    # Pesos de la fórmula (suman 1.0)
    WEIGHTS = {
        'cyclomatic_complexity': 0.375,
        'code_churn': 0.275,
        'lines_of_code': 0.175,
        'code_duplication': 0.125,
        'bus_factor': 0.125
    }
    
    # Rangos de riesgo
    RISK_RANGES = {
        'LOW': (0, 39),
        'MEDIUM': (40, 69),
        'HIGH': (70, 100)
    }
    
    def __init__(self):
        """Inicializa el detector de riesgos"""
        self.total_weight = sum(self.WEIGHTS.values())
    
    def normalize_metric(self, value: float, min_val: float = 0, max_val: float = 100) -> float:
        """Normaliza una métrica al rango 0-100"""
        if max_val <= min_val:
            return 50
        
        normalized = ((value - min_val) / (max_val - min_val)) * 100
        return max(0, min(100, normalized))
    
    def calculate_complexity_score(self, cyclomatic_complexity: int) -> Tuple[float, str]:
        """Calcula score de complejidad ciclomática"""
        if cyclomatic_complexity <= 5:
            score = (cyclomatic_complexity / 5) * 20
            assessment = "Complejidad aceptable"
        elif cyclomatic_complexity <= 10:
            score = 20 + ((cyclomatic_complexity - 5) / 5) * 30
            assessment = "Complejidad moderada - Considere refactorizar"
        elif cyclomatic_complexity <= 15:
            score = 50 + ((cyclomatic_complexity - 10) / 5) * 30
            assessment = "Complejidad alta - Refactorización necesaria"
        else:
            score = min(100, 80 + ((cyclomatic_complexity - 15) / 5) * 20)
            assessment = "Complejidad crítica - Refactorización urgente"
        
        return score, assessment
    
    def calculate_churn_score(self, commits: int, max_commits: int = 100) -> Tuple[float, str]:
        """Calcula score de Code Churn"""
        score = self.normalize_metric(commits, 0, max_commits)
        
        if commits <= 5:
            assessment = "Cambios mínimos - Código estable"
        elif commits <= 20:
            assessment = "Cambios moderados"
        elif commits <= 50:
            assessment = "Cambios frecuentes - Considere versiones"
        else:
            assessment = "Cambios muy frecuentes - Riesgo de inestabilidad"
        
        return score, assessment
    
    def calculate_loc_score(self, loc: int, max_loc: int = 500) -> Tuple[float, str]:
        """Calcula score de Lines of Code"""
        score = self.normalize_metric(loc, 0, max_loc)
        
        if loc <= 100:
            assessment = "Tamaño pequeño - Buena mantenibilidad"
        elif loc <= 250:
            assessment = "Tamaño moderado"
        elif loc <= 500:
            assessment = "Archivo grande - Considere dividir"
        else:
            assessment = "Archivo muy grande - Refactorización urgente"
        
        return score, assessment
    
    def calculate_duplication_score(self, duplication_percent: float) -> Tuple[float, str]:
        """Calcula score de Code Duplication"""
        score = duplication_percent
        
        if duplication_percent <= 5:
            assessment = "Duplicación mínima"
        elif duplication_percent <= 15:
            assessment = "Duplicación moderada"
        elif duplication_percent <= 30:
            assessment = "Duplicación significativa - Refactorizar"
        else:
            assessment = "Duplicación crítica - Acción inmediata"
        
        return score, assessment
    
    def calculate_bus_factor_score(self, risk_percentage: float) -> Tuple[float, str]:
        """Calcula score de Bus Factor"""
        score = risk_percentage
        
        if risk_percentage <= 20:
            assessment = "Buena distribución de conocimiento"
        elif risk_percentage <= 40:
            assessment = "Concentración moderada de conocimiento"
        elif risk_percentage <= 60:
            assessment = "Alto riesgo - Documentar decisiones clave"
        else:
            assessment = "Riesgo crítico - Transferencia de conocimiento urgente"
        
        return score, assessment
    
    def calculate_risk(
        self,
        cyclomatic_complexity: int = 0,
        code_churn: int = 0,
        lines_of_code: int = 0,
        code_duplication: float = 0,
        bus_factor: float = 0
    ) -> Dict[str, Any]:
        """Calcula el riesgo general usando la fórmula ponderada"""
        
        # Calcular scores individuales
        cc_score, cc_assessment = self.calculate_complexity_score(cyclomatic_complexity)
        churn_score, churn_assessment = self.calculate_churn_score(code_churn)
        loc_score, loc_assessment = self.calculate_loc_score(lines_of_code)
        dup_score, dup_assessment = self.calculate_duplication_score(code_duplication)
        bf_score, bf_assessment = self.calculate_bus_factor_score(bus_factor)
        
        # Aplicar fórmula ponderada
        risk_score = (
            (cc_score * self.WEIGHTS['cyclomatic_complexity']) +
            (churn_score * self.WEIGHTS['code_churn']) +
            (loc_score * self.WEIGHTS['lines_of_code']) +
            (dup_score * self.WEIGHTS['code_duplication']) +
            (bf_score * self.WEIGHTS['bus_factor'])
        )
        
        # Clasificar riesgo
        classification = self._classify_risk(risk_score)
        
        # Generar justificación
        justification = self._generate_justification(
            cc_assessment, churn_assessment, loc_assessment,
            dup_assessment, bf_assessment, risk_score
        )
        
        # Calcular maintenance difficulty index (0-100)
        maintenance_index = self._calculate_maintenance_index(risk_score)
        difficulty_rating = self._rate_difficulty(maintenance_index)
        
        return {
            'risk_score': round(risk_score, 2),
            'classification': classification,
            'justification': justification,
            'maintenance_difficulty_index': round(maintenance_index, 2),
            'difficulty_rating': difficulty_rating,
            'component_scores': {
                'cyclomatic_complexity': round(cc_score, 2),
                'code_churn': round(churn_score, 2),
                'lines_of_code': round(loc_score, 2),
                'code_duplication': round(dup_score, 2),
                'bus_factor': round(bf_score, 2)
            },
            'component_assessments': {
                'cyclomatic_complexity': cc_assessment,
                'code_churn': churn_assessment,
                'lines_of_code': loc_assessment,
                'code_duplication': dup_assessment,
                'bus_factor': bf_assessment
            }
        }
    
    def _classify_risk(self, score: float) -> str:
        """Clasifica el riesgo basado en el score"""
        for classification, (min_val, max_val) in self.RISK_RANGES.items():
            if min_val <= score <= max_val:
                return classification
        return 'HIGH'
    
    def _generate_justification(
        self, cc_assess: str, churn_assess: str, loc_assess: str,
        dup_assess: str, bf_assess: str, score: float
    ) -> str:
        """Genera una justificación textual del riesgo"""
        factors = []
        
        if 'crítica' in cc_assess.lower() or 'alta' in cc_assess.lower():
            factors.append("complejidad ciclomática elevada")
        
        if 'frecuentes' in churn_assess.lower():
            factors.append("código inestable (cambios frecuentes)")
        
        if 'grande' in loc_assess.lower():
            factors.append("tamaño de archivo excesivo")
        
        if 'Duplicación significativa' in dup_assess or 'crítica' in dup_assess.lower():
            factors.append("duplicación de código")
        
        if 'riesgo' in bf_assess.lower():
            factors.append("concentración de conocimiento")
        
        if not factors:
            return "El código mantiene una calidad aceptable."
        
        return f"Factores de riesgo detectados: {', '.join(factors)}. Refactorización recomendada."
    
    def _calculate_maintenance_index(self, risk_score: float) -> float:
        """Calcula índice de mantenibilidad (inverso del riesgo)"""
        return max(0, 100 - risk_score)
    
    def _rate_difficulty(self, index: float) -> str:
        """Califica la dificultad de mantenimiento"""
        if index >= 80:
            return 'Excelente'
        elif index >= 60:
            return 'Bueno'
        elif index >= 40:
            return 'Regular'
        elif index >= 20:
            return 'Deficiente'
        else:
            return 'Crítico'
