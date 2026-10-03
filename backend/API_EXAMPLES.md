# CodeVitals API Examples

## 🚀 Quick Start

**Server URL**: `http://localhost:5000`

---

## 1. Health Check

**Endpoint**: `GET /health`

```bash
curl http://localhost:5000/health
```

**Response**:
```json
{
  "status": "healthy",
  "app": "Analisis Metricas Git",
  "version": "1.0.0"
}
```

---

## 2. API Info

**Endpoint**: `GET /api/v1/info`

```bash
curl http://localhost:5000/api/v1/info
```

**Response**:
```json
{
  "app_name": "Analisis Metricas Git",
  "version": "1.0.0",
  "environment": "development",
  "api": "v1",
  "endpoints": {
    "analyze_repository": "POST /api/v1/analyze/repository",
    "calculate_churn": "GET /api/v1/analyze/repository/<repo_name>/churn/<file_path>",
    "calculate_bus_factor": "POST /api/v1/analyze/repository/bus-factor"
  }
}
```

---

## 3. Analyze Repository (Git Mining)

**Endpoint**: `POST /api/v1/analyze/repository`

**Description**: Extracts all commits, authors, and file changes from a Git repository using PyDriller.

### Request

```bash
curl -X POST http://localhost:5000/api/v1/analyze/repository \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/torvalds/linux.git",
    "repo_path": "./repos/linux"
  }'
```

### Request Body

```json
{
  "repo_url": "https://github.com/user/repo.git",
  "repo_path": "./repos/repo"
}
```

**Parameters**:
- `repo_url` (required): URL of the Git repository
- `repo_path` (optional): Local path to clone the repo (default: `./repos/repo-name`)

### Response

```json
{
  "success": true,
  "data": {
    "total_commits": 145,
    "total_authors": 3,
    "authors": ["dev1", "dev2", "dev3"],
    "commits": [
      {
        "hash": "a1b2c3d4e5f6...",
        "author": "dev1",
        "date": "2024-10-01T14:30:00",
        "message": "Fix bug in authentication",
        "files": 3
      }
    ],
    "files_changed": {
      "src/main.py": {
        "additions": 150,
        "deletions": 45,
        "changes": 23
      }
    },
    "date_range": {
      "first_commit": "2020-01-15T10:00:00",
      "last_commit": "2024-10-01T14:30:00"
    }
  },
  "message": "Análisis completado: 145 commits de 3 autores"
}
```

---

## 4. Calculate Code Churn

**Endpoint**: `GET /api/v1/analyze/repository/<repo_name>/churn/<file_path>`

**Description**: Calculates the churn (changes) for a specific file.

### Request

```bash
curl "http://localhost:5000/api/v1/analyze/repository/my-repo/churn/src/main.py?repo_url=https://github.com/user/repo.git"
```

### Query Parameters

- `repo_url` (required): URL of the repository
- `repo_path` (optional): Local repository path

### Response

```json
{
  "success": true,
  "data": {
    "file": "src/main.py",
    "total_changes": 23,
    "additions": 450,
    "deletions": 120,
    "total_churn": 570
  }
}
```

**Interpretation**:
- **total_changes**: Number of commits that touched this file
- **additions**: Total lines added
- **deletions**: Total lines removed
- **total_churn**: Sum of additions + deletions

---

## 5. Calculate Bus Factor

**Endpoint**: `POST /api/v1/analyze/repository/bus-factor`

**Description**: Calculates knowledge concentration risk (Bus Factor).

### Request

```bash
curl -X POST http://localhost:5000/api/v1/analyze/repository/bus-factor \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/user/repo.git",
    "repo_path": "./repos/repo"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "total_authors": 3,
    "total_commits": 145,
    "total_files": 42,
    "top_author": "dev1",
    "top_author_commits": 95,
    "risk_percentage": 65.5,
    "risk_level": "CRÍTICO",
    "recommendation": "Riesgo crítico - Acción inmediata necesaria",
    "author_distribution": {
      "dev1": 95,
      "dev2": 35,
      "dev3": 15
    }
  }
}
```

**Risk Levels**:
- **BAJO** (≤20%): Good knowledge distribution
- **MODERADO** (20-40%): Moderate concentration
- **ALTO** (40-60%): Document key decisions
- **CRÍTICO** (>60%): Immediate action needed

---

## 📝 Python Examples

### Example 1: Analyze Repository

```python
import requests
import json

url = "http://localhost:5000/api/v1/analyze/repository"
payload = {
    "repo_url": "https://github.com/torvalds/linux.git",
    "repo_path": "./repos/linux"
}

response = requests.post(url, json=payload)
data = response.json()

print(f"Total commits: {data['data']['total_commits']}")
print(f"Total authors: {data['data']['total_authors']}")
print(f"Authors: {', '.join(data['data']['authors'])}")
```

### Example 2: Calculate Bus Factor

```python
import requests

url = "http://localhost:5000/api/v1/analyze/repository/bus-factor"
payload = {
    "repo_url": "https://github.com/torvalds/linux.git"
}

response = requests.post(url, json=payload)
data = response.json()['data']

print(f"Top author: {data['top_author']}")
print(f"Risk percentage: {data['risk_percentage']}%")
print(f"Risk level: {data['risk_level']}")
print(f"Recommendation: {data['recommendation']}")
```

### Example 3: Calculate Code Churn

```python
import requests

repo_url = "https://github.com/torvalds/linux.git"
file_path = "kernel/sched.c"

url = f"http://localhost:5000/api/v1/analyze/repository/linux/churn/{file_path}"
params = {"repo_url": repo_url}

response = requests.get(url, params=params)
data = response.json()['data']

print(f"File: {data['file']}")
print(f"Total changes: {data['total_changes']}")
print(f"Code churn: {data['total_churn']}")
```

---

## ⚠️ Error Handling

### Missing Required Parameter

**Request**:
```bash
curl -X POST http://localhost:5000/api/v1/analyze/repository \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response** (400):
```json
{
  "error": "Parámetro requerido faltante",
  "required": ["repo_url"],
  "optional": ["repo_path"]
}
```

### Server Error

**Response** (500):
```json
{
  "error": "Error interno del servidor",
  "message": "detailed error message"
}
```

---

## 🔍 Testing with Postman

1. Create new POST request
2. URL: `http://localhost:5000/api/v1/analyze/repository`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
```json
{
  "repo_url": "https://github.com/user/repo.git"
}
```
5. Click Send

---

## 📊 Rate Limits & Performance

- No rate limits in development
- PyDriller clones repos to `./repos/` directory
- First analysis may take time (repo cloning)
- Subsequent runs use cached repositories
- Lizard analysis runs on local cloned repo

---

**Last Updated**: 2026-10-03  
**API Version**: v1
