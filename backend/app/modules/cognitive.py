"""
Complejidad cognitiva (Python).

Mide qué tan dificil es ENTENDER una funcion, a diferencia de la complejidad
ciclomatica, que cuenta caminos de ejecucion. Sigue el metodo de SonarSource
(G. A. Campbell, "Cognitive Complexity"):
  +1 por cada if, elif, else, for, while, except, operador ternario, match y
     por cada secuencia de operadores booleanos (and / or) y por cada llamada
     recursiva;
  + el nivel de anidamiento actual en if, for, while, except, ternario y match
     (lo que anida penaliza mas);
  las funciones y lambdas anidadas suben el nivel de anidamiento.

Es una implementacion propia con el modulo ast: no depende de SonarQube y
solo analiza Python. Para otros lenguajes devuelve None.
"""
from __future__ import annotations

import ast

_FUNCS = (ast.FunctionDef, ast.AsyncFunctionDef)
_MATCH = getattr(ast, "Match", None)


class _Scorer:
    def __init__(self, name: str):
        self.name = name
        self.total = 0

    def run(self, func: ast.AST) -> int:
        for stmt in func.body:  # type: ignore[attr-defined]
            self.node(stmt, 0)
        return self.total

    # -- recorrido -----------------------------------------------------
    def children(self, node: ast.AST, nesting: int) -> None:
        for child in ast.iter_child_nodes(node):
            self.node(child, nesting)

    def block(self, stmts, nesting: int) -> None:
        for s in stmts:
            self.node(s, nesting)

    def if_chain(self, node: ast.If, nesting: int, is_elif: bool) -> None:
        self.total += 1 if is_elif else 1 + nesting
        self.node(node.test, nesting)
        self.block(node.body, nesting + 1)
        orelse = node.orelse
        if len(orelse) == 1 and isinstance(orelse[0], ast.If):
            self.if_chain(orelse[0], nesting, True)  # elif: +1 sin penalizar anidamiento
        elif orelse:
            self.total += 1  # else
            self.block(orelse, nesting + 1)

    def node(self, node: ast.AST, nesting: int) -> None:
        if isinstance(node, ast.If):
            self.if_chain(node, nesting, False)
        elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            self.total += 1 + nesting
            self.children_except(node, ("body", "orelse"), nesting)
            self.block(node.body, nesting + 1)
            self.block(node.orelse, nesting + 1)
        elif isinstance(node, ast.Try) or type(node).__name__ == "TryStar":
            self.block(node.body, nesting)
            for h in node.handlers:
                self.total += 1 + nesting
                if h.type is not None:
                    self.node(h.type, nesting)
                self.block(h.body, nesting + 1)
            self.block(node.orelse, nesting)
            self.block(node.finalbody, nesting)
        elif isinstance(node, ast.IfExp):
            self.total += 1 + nesting
            self.children(node, nesting + 1)
        elif _MATCH is not None and isinstance(node, _MATCH):
            self.total += 1 + nesting
            self.node(node.subject, nesting)
            for case in node.cases:
                self.block(case.body, nesting + 1)
        elif isinstance(node, ast.BoolOp):
            self.total += 1  # una secuencia de operadores iguales cuenta una vez
            for v in node.values:
                if isinstance(v, ast.BoolOp) and type(v.op) is type(node.op):
                    self.flatten(v, nesting)
                else:
                    self.node(v, nesting)
        elif isinstance(node, _FUNCS + (ast.Lambda,)):
            body = node.body if isinstance(node.body, list) else [node.body]
            self.block(body, nesting + 1)
        elif isinstance(node, ast.Call):
            fn = node.func
            if (isinstance(fn, ast.Name) and fn.id == self.name) or \
               (isinstance(fn, ast.Attribute) and fn.attr == self.name
                    and isinstance(fn.value, ast.Name) and fn.value.id in ("self", "cls")):
                self.total += 1  # recursion
            self.children(node, nesting)
        else:
            self.children(node, nesting)

    def flatten(self, node: ast.BoolOp, nesting: int) -> None:
        for v in node.values:
            if isinstance(v, ast.BoolOp) and type(v.op) is type(node.op):
                self.flatten(v, nesting)
            else:
                self.node(v, nesting)

    def children_except(self, node: ast.AST, skip: tuple, nesting: int) -> None:
        for field, value in ast.iter_fields(node):
            if field in skip:
                continue
            for item in value if isinstance(value, list) else [value]:
                if isinstance(item, ast.AST):
                    self.node(item, nesting)


def function_cognitive_complexity(func: ast.AST) -> int:
    return _Scorer(getattr(func, "name", "")).run(func)


def cognitive_by_function(source: str) -> dict[int, tuple[str, int]] | None:
    """{linea_de_def: (nombre, complejidad_cognitiva)} para cada funcion del codigo.
    Devuelve None si el codigo no se puede interpretar (error de sintaxis)."""
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError, RecursionError):
        return None
    out: dict[int, tuple[str, int]] = {}
    for node in ast.walk(tree):
        if isinstance(node, _FUNCS):
            out[node.lineno] = (node.name, function_cognitive_complexity(node))
    return out
