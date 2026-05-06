FROM registry.access.redhat.com/ubi9/python-${{ values.pythonVersion }}:latest

WORKDIR /opt/app-root/src

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY src/ src/

EXPOSE ${{ values.port }}
USER 1001

CMD ["uvicorn", "src.main.app:app", "--host", "0.0.0.0", "--port", "${{ values.port }}"]
