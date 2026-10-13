import textwrap

from app.modules.cognitive import cognitive_by_function
from app.modules.metrics_calculator import MetricsCalculator


def _score(src, name):
    data = cognitive_by_function(textwrap.dedent(src))
    return next(v for _, (n, v) in data.items() if n == name)


def test_nested_loops_and_ifs_are_penalized_by_nesting():
    # Ejemplo oficial de SonarSource: for(+1) > for(+2) > if(+3) = 6
    src = """
    def sum_of_primes(max):
        total = 0
        for i in range(1, max + 1):
            for j in range(2, i):
                if i % j == 0:
                    break
            else:
                total += i
        return total
    """
    assert _score(src, "sum_of_primes") == 6


def test_elif_and_else_do_not_add_nesting():
    src = """
    def words(n):
        if n == 1:
            return "one"
        elif n == 2:
            return "two"
        else:
            return "many"
    """
    assert _score(src, "words") == 3


def test_boolean_sequences_count_once_and_switching_counts_again():
    assert _score("def f(a, b, c):\n    return a and b and c\n", "f") == 1
    assert _score("def f(a, b, c):\n    return a and b or c\n", "f") == 2
    assert _score("def f(a, b, c):\n    if a and b and c:\n        return 1\n", "f") == 2


def test_recursion_exceptions_and_ternary():
    assert _score("def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n", "fact") == 2
    assert _score("def f():\n    try:\n        pass\n    except ValueError:\n        pass\n", "f") == 1
    assert _score("def f(a):\n    return 1 if a else 2\n", "f") == 1


def test_flat_function_is_zero_and_syntax_errors_return_none():
    assert _score("def f(a):\n    return a + 1\n", "f") == 0
    assert cognitive_by_function("def broken(:\n") is None


def test_metrics_calculator_reports_cognitive_complexity(tmp_path):
    f = tmp_path / "m.py"
    f.write_text(textwrap.dedent("""
    def easy(a):
        return a

    def hard(x):
        for i in x:
            for j in i:
                if j:
                    for k in j:
                        if k:
                            while k:
                                if k > 1:
                                    k -= 1
                                else:
                                    break
    """))
    r = MetricsCalculator().analyze_file(str(f))
    by = {fn["name"]: fn for fn in r["functions"]}
    assert by["easy"]["cognitive_complexity"] == 0
    assert by["hard"]["cognitive_complexity"] > 15
    assert r["cognitive_complexity"] == by["hard"]["cognitive_complexity"]
    assert any(d["type"] == "HIGH_COGNITIVE_COMPLEXITY" and d["function"] == "hard" for d in r["deficiencies"])


def test_non_python_files_have_no_cognitive_value(tmp_path):
    f = tmp_path / "a.js"
    f.write_text("function a(x){ if(x){ return 1 } return 2 }\n")
    r = MetricsCalculator().analyze_file(str(f))
    assert r["cognitive_complexity"] is None
    assert r["functions"][0]["cognitive_complexity"] is None


def test_analysis_exposes_cognitive_churn_lines_and_frequency(tmp_path):
    import subprocess
    from app.routers import risk
    repo = tmp_path / "demo"
    repo.mkdir()
    env = {"GIT_AUTHOR_NAME": "a", "GIT_AUTHOR_EMAIL": "a@a", "GIT_COMMITTER_NAME": "a",
           "GIT_COMMITTER_EMAIL": "a@a", "PATH": __import__("os").environ["PATH"], "HOME": str(repo)}
    run = lambda *a: subprocess.run(["git", *a], cwd=repo, check=True, capture_output=True, env=env)
    run("init", "-q")
    (repo / "a.py").write_text("def f(x):\n    if x:\n        for i in x:\n            if i:\n                return 1\n    return 2\n")
    run("add", "."); run("commit", "-q", "-m", "one")
    (repo / "a.py").write_text("def f(x):\n    if x:\n        for i in x:\n            if i:\n                return 1\n    return 3\n")
    run("add", "."); run("commit", "-q", "-m", "two")
    mods, _, _ = risk._analyze_all_modules(str(repo), str(repo))
    m = mods[0]
    assert m["code_metrics"]["cognitive_complexity"] == 6          # if(1) + for(2) + if(3)
    assert m["git_metrics"]["modification_frequency"] == 2          # commits
    assert m["git_metrics"]["code_churn"] == 6 + 1 + 1              # 6 lineas iniciales + 1 agregada + 1 eliminada
    assert m["git_metrics"]["lines_added"] == 7 and m["git_metrics"]["lines_deleted"] == 1
