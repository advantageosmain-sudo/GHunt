FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml poetry.lock README.md LICENSE.md ./
COPY ghunt ./ghunt
COPY backend ./backend
RUN pip install --no-cache-dir . -r backend/requirements.txt && useradd --create-home ghunt && chown -R ghunt:ghunt /app
USER ghunt
EXPOSE 8080
CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "backend.app:application"]
