from app.modules.deficiency_info import describe_deficiencies


def test_describe_orders_by_severity_and_explains():
    items = describe_deficiencies([
        {"type": "LONG_METHOD", "function": "a", "severity": "MEDIUM", "value": 80},
        {"type": "CRITICAL_COMPLEXITY", "function": "b", "severity": "CRITICAL", "value": 22},
    ])
    assert [i["function"] for i in items] == ["b", "a"]
    assert items[0]["label"] == "Complejidad crítica" and "22" in items[0]["detail"] and items[0]["advice"]
    assert "80 líneas" in items[1]["detail"]


def test_describe_unknown_type_does_not_fail():
    assert describe_deficiencies([{"type": "X", "severity": "LOW", "value": 1}])[0]["label"] == "X"
    assert describe_deficiencies([]) == []
