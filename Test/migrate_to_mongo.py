import pandas as pd
from pymongo import MongoClient
import os

# Configuration
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "smart_entrepreneur"
DATA_DIR = os.getcwd()

# File Paths
JOBS_FILE = os.path.join(DATA_DIR, 'jobs.csv')
FREELANCERS_FILE = os.path.join(DATA_DIR, 'freelancers.csv')
INTERACTIONS_FILE = os.path.join(DATA_DIR, 'job_history.csv')

def migrate():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    collections = {
        'jobs': JOBS_FILE,
        'freelancers': FREELANCERS_FILE,
        'interactions': INTERACTIONS_FILE
    }
    
    for coll_name, file_path in collections.items():
        print(f"Migrating {file_path} to {coll_name} collection...")
        if os.path.exists(file_path):
            try:
                df = pd.read_csv(file_path)
                data = df.to_dict('records')
                
                # Clear existing and insert new
                db[coll_name].delete_many({})
                if data:
                    db[coll_name].insert_many(data)
                    print(f"Successfully migrated {len(data)} records to {coll_name}.")
                else:
                    print(f"No data found in {file_path}.")
            except Exception as e:
                print(f"Error migrating {coll_name}: {e}")
        else:
            print(f"File {file_path} not found.")

    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
