FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY init_db.py start.sh ./
COPY seed_admin.py seed_aew.py seed_alert_thresholds.py seed_buyers.py seed_darfo.py seed_farmers.py seed_municipal.py seed_planting_intents.py seed_provincial.py ./
COPY uploads ./uploads

RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
