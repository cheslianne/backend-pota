FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV CMDSTAN=/opt/cmdstan/cmdstan-2.33.1

RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	libgomp1 \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Manual ETL runs execute in this API container, so it needs the same
# compiled Prophet backend as the dedicated scheduler worker.
RUN python -c "from pathlib import Path; import cmdstanpy; ok=cmdstanpy.install_cmdstan(version='2.33.1', dir='/opt/cmdstan', verbose=True); path=Path('/opt/cmdstan/cmdstan-2.33.1'); assert ok and (path/'bin'/'cmdstan').exists(), f'Incomplete CmdStan installation at {path}'; print(path)"

COPY src ./src
COPY init_db.py start.sh ./
COPY seed_admin.py seed_aew.py seed_alert_thresholds.py seed_buyers.py seed_darfo.py seed_farmers.py seed_municipal.py seed_planting_intents.py seed_provincial.py ./
COPY uploads ./uploads

RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
