import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Palitan ang password kung kinakailangan base sa iyong .env
try:
    connection = psycopg2.connect(
        user="postgres",
        password="your_password", # Palitan ng iyong postgres password
        host="127.0.0.1",
        port="5432"
    )
    connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = connection.cursor()
    
    cursor.execute("CREATE DATABASE pota_db;")
    print("Database 'pota_db' successfully created!")

except Exception as e:
    print("Error:", e)
finally:
    if connection:
        cursor.close()
        connection.close()