
import pandas as pd
import random
from faker import Faker
import uuid
from datetime import datetime, timedelta

# Initialize Faker
fake = Faker()
Faker.seed(42)
random.seed(42)

# Configuration
NUM_FREELANCERS = 100
NUM_COMPANIES = 20
NUM_JOBS = 50
NUM_INTERACTIONS = 200

SKILL_SET = [
    "Python", "React", "Node.js", "Graphic Design", "SEO", "Copywriting",
    "Data Analysis", "Machine Learning", "Digital Marketing", "Video Editing",
    "Java", "C++", "Svelte", "DevOps", "Cybersecurity"
]

INDUSTRIES = ["Tech", "Marketing", "Finance", "Healthcare", "E-commerce", "Education"]

def generate_skills(n=3):
    return random.sample(SKILL_SET, k=random.randint(1, n))

def generate_freelancers(n):
    data = []
    for _ in range(n):
        freelancer_id = str(uuid.uuid4())
        name = fake.name()
        skills = generate_skills(5)
        
        # Simulate diverse performance levels
        performance_tier = random.choices(["top", "mid", "low"], weights=[0.2, 0.5, 0.3])[0]
        
        if performance_tier == "top":
            verified_score = random.uniform(90, 100)
            avg_response = random.uniform(0.5, 2.0)
            overall_rating = random.uniform(4.5, 5.0)
            experience = random.randint(5, 15)
        elif performance_tier == "mid":
            verified_score = random.uniform(70, 89)
            avg_response = random.uniform(2.0, 12.0)
            overall_rating = random.uniform(3.5, 4.4)
            experience = random.randint(2, 5)
        else:
            verified_score = random.uniform(40, 69)
            avg_response = random.uniform(12.0, 48.0)
            overall_rating = random.uniform(2.0, 3.4)
            experience = random.randint(0, 2)

        data.append({
            "freelancer_id": freelancer_id,
            "name": name,
            "skills": ", ".join(skills), # Store as string for CSV simplicity
            "verified_skill_score": round(verified_score, 1),
            "hourly_rate": round(random.uniform(15, 150), 2),
            "experience_years": experience,
            "total_projects_completed": random.randint(0, 50),
            "average_response_time_hours": round(avg_response, 1),
            "overall_rating": round(overall_rating, 2)
        })
    return pd.DataFrame(data)

def generate_companies(n):
    data = []
    for _ in range(n):
        data.append({
            "company_id": str(uuid.uuid4()),
            "company_name": fake.company(),
            "industry": random.choice(INDUSTRIES),
            "location": fake.city()
        })
    return pd.DataFrame(data)

def generate_jobs(n, companies_df):
    data = []
    company_ids = companies_df["company_id"].tolist()
    
    for _ in range(n):
        req_skills = generate_skills(3)
        data.append({
            "job_id": str(uuid.uuid4()),
            "company_id": random.choice(company_ids),
            "title": fake.job(),
            "description": fake.bs(),
            "required_skills": ", ".join(req_skills),
            "budget": round(random.uniform(100, 5000), 2),
            "duration_days": random.randint(1, 90),
            "status": random.choice(["Open", "Closed", "In Progress"])
        })
    return pd.DataFrame(data)

def generate_interactions(n, freelancers_df, jobs_df):
    data = []
    freelancer_ids = freelancers_df["freelancer_id"].tolist()
    job_ids = jobs_df["job_id"].tolist()
    
    # Pre-compute skill/quality mapping to make data somewhat consistent
    freelancer_map = freelancers_df.set_index("freelancer_id").to_dict("index")

    for _ in range(n):
        f_id = random.choice(freelancer_ids)
        j_id = random.choice(job_ids)
        
        # Base quality on freelancer's verified score + random noise
        f_in = freelancer_map[f_id]
        base_quality = f_in["verified_skill_score"] / 20.0 # scale to 0-5
        actual_rating = min(5.0, max(1.0, random.normalvariate(base_quality, 0.5)))
        
        # Correlate metrics with rating
        if actual_rating >= 4.0:
            completion = 1.0
            on_time = True
            quality_score = random.uniform(8, 10)
            response_time_score = random.uniform(0.8, 1.0) # High score for fast response
        elif actual_rating >= 3.0:
            completion = random.choices([1.0, 0.0], weights=[0.9, 0.1])[0]
            on_time = random.choice([True, False])
            quality_score = random.uniform(5, 7.9)
            response_time_score = random.uniform(0.5, 0.79)
        else:
            completion = random.choices([1.0, 0.0], weights=[0.6, 0.4])[0]
            on_time = False
            quality_score = random.uniform(1, 4.9)
            response_time_score = random.uniform(0.0, 0.49)

        data.append({
            "interaction_id": str(uuid.uuid4()),
            "job_id": j_id,
            "freelancer_id": f_id,
            "company_id": jobs_df[jobs_df["job_id"] == j_id]["company_id"].values[0],
            "rating": round(actual_rating, 1),
            "project_completion_rate": completion,
            "response_time_score": round(response_time_score, 2),
            "quality_score": round(quality_score, 1),
            "skill_test_result": f_in["verified_skill_score"], # Snapshot
            "on_time_delivery": on_time,
            "review_text": fake.sentence(),
            "timestamp": fake.date_between(start_date="-1y", end_date="today")
        })
    return pd.DataFrame(data)

def main():
    print("Generating Freelancers...")
    freelancers = generate_freelancers(NUM_FREELANCERS)
    freelancers.to_csv("freelancers.csv", index=False)
    
    print("Generating Companies...")
    companies = generate_companies(NUM_COMPANIES)
    companies.to_csv("companies.csv", index=False)
    
    print("Generating Jobs...")
    jobs = generate_jobs(NUM_JOBS, companies)
    jobs.to_csv("jobs.csv", index=False)
    
    print("Generating Interactions...")
    interactions = generate_interactions(NUM_INTERACTIONS, freelancers, jobs)
    interactions.to_csv("job_history.csv", index=False)
    
    print("Data generation complete. Files saved: freelancers.csv, companies.csv, jobs.csv, job_history.csv")

if __name__ == "__main__":
    main()
