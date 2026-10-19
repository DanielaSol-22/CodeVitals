FROM python:3.11-slim

WORKDIR /code

# Git es requerido por PyDriller/GitPython para operar sobre repositorios
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates && rm -rf /var/lib/apt/lists/*

# scc: contador de lineas y complejidad (herramienta de contraste, mas de 200 lenguajes)
ARG SCC_VERSION=3.5.0
RUN curl -fsSL "https://github.com/boyter/scc/releases/download/v${SCC_VERSION}/scc_Linux_x86_64.tar.gz" \
    | tar -xz -C /usr/local/bin scc && chmod +x /usr/local/bin/scc && scc --version

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]