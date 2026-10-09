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

    def analyze_function(
        self,
        file_path: str,
        func_metrics: Dict[str, Any],
        file_loc: int,
        file_churn_commits: int,
        file_duplication: float,
        file_bus_factor: float
    ) -> Dict[str, Any]:
        """
        Analiza el riesgo de UNA funcion individual dentro de un archivo
        (granularidad por funcion, requerida por el 41.1% de la encuesta).

        Nota metodologica importante: Git no rastrea commits ni autoria a
        nivel de funcion, solo a nivel de archivo/linea. Por eso:
          - cyclomatic_complexity y lines_of_code son EXACTOS (vienen
            directo de Lizard, por funcion).
          - code_churn se APROXIMA de forma proporcional: se reparte el
            churn total del archivo entre sus funciones segun el peso de
            cada una en LOC (func_loc / file_loc * commits_del_archivo).
          - code_duplication y bus_factor se HEREDAN del archivo completo,
            ya que el detector de duplicados trabaja por bloques de linea
            (no respeta limites de funcion) y el bus factor se calcula por
            autoria de commits sobre el archivo completo.
        Esta aproximacion queda documentada en 'approximation_note' para
        que se pueda citar como limitacion metodologica en la tesis.
        """
        func_loc = func_metrics.get('lines', 0)
        func_cc = func_metrics.get('cyclomatic_complexity', 0)

        proportion = (func_loc / file_loc) if file_loc else 0
        approx_churn = round(file_churn_commits * proportion, 2)

        risk_analysis = self.calculate_risk(
            cyclomatic_complexity=func_cc,
            code_churn=approx_churn,
            lines_of_code=func_loc,
            code_duplication=file_duplication,
            bus_factor=file_bus_factor
        )

        return {
            'file': file_path,
            'function': func_metrics.get('name'),
            'lines_of_code': func_loc,
            'cyclomatic_complexity': func_cc,
            'parameters': func_metrics.get('parameters', 0),
            'risk_analysis': risk_analysis,
            'approximation_note': (
                "code_churn aproximado proporcionalmente al tamaño de la "
                "funcion dentro del archivo; code_duplication y bus_factor "
                "heredados del archivo completo (Git no distingue limites "
                "de funcion)."
            )
        }

    def analyze_module(
        self,
        file_path: str,
        code_metrics: Dict[str, Any],
        git_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analiza el riesgo de un módulo combinando Git + Code metrics.
        Tambien calcula el riesgo de cada funcion individual del modulo
        (ver analyze_function) y lo expone en 'functions_risk'.

        Args:
            file_path: Ruta del archivo
            code_metrics: Métricas de código (CC, LOC, etc.)
            git_metrics: Métricas de Git (commits, churn, etc.)

        Returns:
            Análisis de riesgo del módulo
        """
        # Extraer métricas de código
        cc = code_metrics.get('complexity', 0)
        loc = code_metrics.get('loc', 0)
        functions = code_metrics.get('functions_count', 0)
        deficiencies = code_metrics.get('deficiencies', [])
        functions_list = code_metrics.get('functions', [])
        duplication = code_metrics.get('duplication_percent', 0)

        # Extraer métricas de Git
        commits = git_metrics.get('total_commits', 0)
        churn = git_metrics.get('total_churn', 0)
        bus_factor = git_metrics.get('risk_percentage', 0)

        # Calcular riesgo a nivel de archivo (agregado)
        risk_analysis = self.calculate_risk(
            cyclomatic_complexity=cc,
            code_churn=commits,
            lines_of_code=loc,
            code_duplication=duplication,
            bus_factor=bus_factor
        )

        # Calcular riesgo a nivel de funcion (granularidad por funcion)
        functions_risk = [
            self.analyze_function(
                file_path, func, loc, commits, duplication, bus_factor
            )
            for func in functions_list
        ]

        return {
            'file': file_path,
            'risk_analysis': risk_analysis,
            'code_metrics': {
                'cyclomatic_complexity': cc,
                'lines_of_code': loc,
                'functions_count': functions,
                'deficiencies': deficiencies
            },
            'git_metrics': {
                'commits': commits,
                'code_churn': churn,
                'bus_factor_risk': bus_factor
            },
            'functions_risk': functions_risk
        }

    def analyze_repository(
        self,
        modules: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analiza el riesgo de todo el repositorio

        Args:
            modules: Lista de módulos analizados

        Returns:
            Análisis agregado de riesgo del repositorio
        """
        if not modules:
            return {
                'error': 'No modules provided',
                'message': 'Se requiere al menos un módulo para analizar'
            }

        high_risk_modules = []
        medium_risk_modules = []
        low_risk_modules = []

        risk_scores = []
        cc_scores = []
        churn_scores = []
        loc_scores = []

        # Analizar cada módulo
        for module in modules:
            risk_class = module.get('risk_analysis', {}).get('classification')
            risk_score = module.get('risk_analysis', {}).get('risk_score', 0)

            risk_scores.append(risk_score)

            # Agregar scores componentes
            components = module.get('risk_analysis', {}).get('component_scores', {})
            cc_scores.append(components.get('cyclomatic_complexity', 0))
            churn_scores.append(components.get('code_churn', 0))
            loc_scores.append(components.get('lines_of_code', 0))

            # Clasificar módulos por riesgo
            module_info = {
                'file': module.get('file'),
                'risk_score': risk_score,
                'classification': risk_class,
                'deficiencies': module.get('code_metrics', {}).get('deficiencies', [])
            }

            if risk_class == 'HIGH':
                high_risk_modules.append(module_info)
            elif risk_class == 'MEDIUM':
                medium_risk_modules.append(module_info)
            else:
                low_risk_modules.append(module_info)

        # Ordenar por riesgo (mayor primero)
        high_risk_modules.sort(key=lambda x: x['risk_score'], reverse=True)
        medium_risk_modules.sort(key=lambda x: x['risk_score'], reverse=True)

        # Calcular promedios
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        avg_cc = sum(cc_scores) / len(cc_scores) if cc_scores else 0
        avg_churn = sum(churn_scores) / len(churn_scores) if churn_scores else 0
        avg_loc = sum(loc_scores) / len(loc_scores) if loc_scores else 0

        # Clasificación general
        overall_class = self._classify_risk(avg_risk)

        return {
            'summary': {
                'total_modules': len(modules),
                'overall_risk_classification': overall_class,
                'average_risk_score': round(avg_risk, 2),
                'high_risk_count': len(high_risk_modules),
                'medium_risk_count': len(medium_risk_modules),
                'low_risk_count': len(low_risk_modules)
            },
            'average_component_scores': {
                'cyclomatic_complexity': round(avg_cc, 2),
                'code_churn': round(avg_churn, 2),
                'lines_of_code': round(avg_loc, 2)
            },
            'high_risk_modules': high_risk_modules,
            'medium_risk_modules': medium_risk_modules,
            'low_risk_modules': low_risk_modules
        }

    def generate_priority_list(
        self,
        repository_analysis: Dict[str, Any],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Genera lista priorizada de módulos para refactorización

        Args:
            repository_analysis: Resultado de analyze_repository
            limit: Máximo número de módulos a retornar

        Returns:
            Lista priorizada de módulos de alto riesgo
        """
        all_modules = []

        # Combinar módulos de alto y medio riesgo
        all_modules.extend(repository_analysis.get('high_risk_modules', []))
        all_modules.extend(repository_analysis.get('medium_risk_modules', []))

        # Ordenar por score de riesgo (descendente)
        all_modules.sort(key=lambda x: x['risk_score'], reverse=True)

        # Retornar los primeros `limit`
        priority_list = []
        for i, module in enumerate(all_modules[:limit], 1):
            priority_list.append({
                'priority': i,
                'file': module['file'],
                'risk_score': module['risk_score'],
                'classification': module['classification'],
                'deficiencies_count': len(module.get('deficiencies', [])),
                'action': self._recommend_action(module['classification'])
            })

        return priority_list

    def _recommend_action(self, classification: str) -> str:
        """Recomienda acción según clasificación de riesgo"""
        if classification == 'HIGH':
            return 'Refactorización urgente - Programar inmediatamente'
        elif classification == 'MEDIUM':
            return 'Refactorización recomendada - Incluir en próximo sprint'
        else:
            return 'Monitoreo continuo - Sin acción inmediata'
