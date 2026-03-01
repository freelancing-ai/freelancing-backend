import pandas as pd
import random
from faker import Faker
import uuid
from datetime import datetime, timedelta

# Initialize Faker with Indian locale
fake = Faker('en_IN')
Faker.seed(42)
random.seed(42)

# Configuration
NUM_FREELANCERS = 100
NUM_COMPANIES = 50
NUM_JOBS = 150
NUM_INTERACTIONS = 500

# --- DATASETS ---

REAL_INDIAN_COMPANIES = [
    {"name": "Tata Consultancy Services (TCS)", "industry": "Tech", "location": "Mumbai, Maharashtra"},
    {"name": "Infosys", "industry": "Tech", "location": "Bengaluru, Karnataka"},
    {"name": "Wipro", "industry": "Tech", "location": "Bengaluru, Karnataka"},
    {"name": "HCL Technologies", "industry": "Tech", "location": "Noida, Uttar Pradesh"},
    {"name": "Tech Mahindra", "industry": "Tech", "location": "Pune, Maharashtra"},
    {"name": "Flipkart", "industry": "E-commerce", "location": "Bengaluru, Karnataka"},
    {"name": "Paytm", "industry": "Fintech", "location": "Noida, Uttar Pradesh"},
    {"name": "Zomato", "industry": "Food Tech", "location": "Gurugram, Haryana"},
    {"name": "Swiggy", "industry": "Food Tech", "location": "Bengaluru, Karnataka"},
    {"name": "Ola", "industry": "Mobility", "location": "Bengaluru, Karnataka"},
    {"name": "Razorpay", "industry": "Fintech", "location": "Bengaluru, Karnataka"},
    {"name": "CRED", "industry": "Fintech", "location": "Bengaluru, Karnataka"},
    {"name": "Zerodha", "industry": "Fintech", "location": "Bengaluru, Karnataka"},
    {"name": "Groww", "industry": "Fintech", "location": "Bengaluru, Karnataka"},
    {"name": "PhysicsWallah", "industry": "EdTech", "location": "Noida, Uttar Pradesh"},
    {"name": "BYJU'S", "industry": "EdTech", "location": "Bengaluru, Karnataka"},
    {"name": "Unacademy", "industry": "EdTech", "location": "Bengaluru, Karnataka"},
    {"name": "Upstox", "industry": "Fintech", "location": "Mumbai, Maharashtra"},
    {"name": "Dream11", "industry": "Gaming", "location": "Mumbai, Maharashtra"},
    {"name": "MakeMyTrip", "industry": "Travel", "location": "Gurugram, Haryana"},
    {"name": "Nykaa", "industry": "E-commerce", "location": "Mumbai, Maharashtra"},
    {"name": "Lenskart", "industry": "E-commerce", "location": "Faridabad, Haryana"},
    {"name": "Pine Labs", "industry": "Fintech", "location": "Noida, Uttar Pradesh"},
    {"name": "Postman", "industry": "Tech", "location": "Bengaluru, Karnataka"},
    {"name": "BrowserStack", "industry": "Tech", "location": "Mumbai, Maharashtra"},
    {"name": "Freshworks", "industry": "SaaS", "location": "Chennai, Tamil Nadu"},
    {"name": "Zoho", "industry": "SaaS", "location": "Chennai, Tamil Nadu"},
    {"name": "Urban Company", "industry": "Services", "location": "Gurugram, Haryana"},
    {"name": "Meesho", "industry": "E-commerce", "location": "Bengaluru, Karnataka"},
    {"name": "ShareChat", "industry": "Social Media", "location": "Bengaluru, Karnataka"},
    {"name": "Dailyhunt", "industry": "Media", "location": "Bengaluru, Karnataka"},
    {"name": "InMobi", "industry": "AdTech", "location": "Bengaluru, Karnataka"},
    {"name": "PhonePe", "industry": "Fintech", "location": "Bengaluru, Karnataka"},
    {"name": "BharatPe", "industry": "Fintech", "location": "New Delhi, Delhi"},
    {"name": "L&T Infotech", "industry": "Tech", "location": "Mumbai, Maharashtra"},
    {"name": "Mindtree", "industry": "Tech", "location": "Bengaluru, Karnataka"},
    {"name": "Mphasis", "industry": "Tech", "location": "Bengaluru, Karnataka"},
    {"name": "Hexaware", "industry": "Tech", "location": "Mumbai, Maharashtra"},
    {"name": "Coforge", "industry": "Tech", "location": "Noida, Uttar Pradesh"},
    {"name": "Persistent Systems", "industry": "Tech", "location": "Pune, Maharashtra"},
    {"name": "KPIT Technologies", "industry": "Auto Tech", "location": "Pune, Maharashtra"},
    {"name": "Tata Elxsi", "industry": "Design", "location": "Bengaluru, Karnataka"},
    {"name": "Redbus", "industry": "Travel", "location": "Bengaluru, Karnataka"},
    {"name": "BookMyShow", "industry": "Entertainment", "location": "Mumbai, Maharashtra"},
    {"name": "Naukri.com", "industry": "Tech", "location": "Noida, Uttar Pradesh"},
    {"name": "PolicyBazaar", "industry": "Fintech", "location": "Gurugram, Haryana"},
    {"name": "Delhivery", "industry": "Logistics", "location": "Gurugram, Haryana"},
    {"name": "Rivigo", "industry": "Logistics", "location": "Gurugram, Haryana"},
    {"name": "BlackBuck", "industry": "Logistics", "location": "Bengaluru, Karnataka"},
    {"name": "Udaan", "industry": "E-commerce", "location": "Bengaluru, Karnataka"}
]

# Roles with associated skills to create coherent personas
ROLES = {
    "Frontend Developer": ["React", "Vue.js", "Angular", "TypeScript", "CSS3", "HTML5", "Redux", "Svelte", "Next.js", "Tailwind CSS"],
    "Backend Developer": ["Python", "Django", "Flask", "Node.js", "Express", "Java", "Spring Boot", "Go", "PostgreSQL", "MongoDB"],
    "Full Stack Developer": ["React", "Node.js", "Python", "TypeScript", "SQL", "AWS", "Docker", "GraphQL"],
    "Data Scientist": ["Python", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "SQL", "Jupyter", "Data Visualization"],
    "Machine Learning Engineer": ["Python", "TensorFlow", "PyTorch", "Keras", "NLP", "Computer Vision", "MLOps", "AWS SageMaker"],
    "DevOps Engineer": ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "CI/CD", "Linux", "Bash", "Azure"],
    "Mobile Developer": ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android", "Dart"],
    "UI/UX Designer": ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research", "Wireframing", "Photoshop", "Illustrator"],
    "Product Manager": ["Agile", "Scrum", "Jira", "Product Strategy", "Roadmapping", "User Stories", "Analytics"],
    "Digital Marketer": ["SEO", "SEM", "Google Analytics", "Content Marketing", "Social Media Marketing", "Email Marketing", "Copywriting"]
}

TITLES = [
    "Senior {}", "Lead {}", "Junior {}", "Freelance {}", "Expert {}", "Consultant {}", "Principal {}"
]

def generate_skills_for_role(role_name):
    core = ROLES[role_name]
    skills = random.sample(core, k=min(len(core), random.randint(3, 5)))
    if random.random() < 0.2:
        other_role = random.choice(list(ROLES.keys()))
        skills.append(random.choice(ROLES[other_role]))
    return list(set(skills))

def generate_freelancers(n):
    data = []
    for _ in range(n):
        freelancer_id = str(uuid.uuid4())
        name = fake.name()
        
        role = random.choice(list(ROLES.keys()))
        formatted_title = random.choice(TITLES).format(role)
        
        skills = generate_skills_for_role(role)
        
        # Indian Freelancer Rates (INR -> converted to rough USD or kept as INR digits depending on need)
        # Assuming the system handles 'hourly_rate' as a number. 
        # We will generate realistic rates in USD equivalent for global context or high-end Indian market (e.g., $15-$100)
        # OR if user implies INR. Let's stick to the previous scale (likely USD) but maybe slightly adjusted,
        # OR we can assume these are INR hundreds. Let's keep the previous numeric scale ($15-$150) as it fits high-quality freelance work globally.
        
        performance_tier = random.choices(["top", "mid", "low"], weights=[0.2, 0.5, 0.3])[0]
        
        if performance_tier == "top":
            verified_score = random.uniform(90, 100)
            avg_response = random.uniform(0.5, 2.0)
            overall_rating = random.uniform(4.7, 5.0)
            experience = random.randint(8, 20)
            completed = random.randint(50, 200)
            rate = random.uniform(50, 150) # High end
        elif performance_tier == "mid":
            verified_score = random.uniform(70, 89)
            avg_response = random.uniform(2.0, 12.0)
            overall_rating = random.uniform(4.0, 4.6)
            experience = random.randint(3, 7)
            completed = random.randint(10, 49)
            rate = random.uniform(25, 50)
        else:
            verified_score = random.uniform(40, 69)
            avg_response = random.uniform(12.0, 48.0)
            overall_rating = random.uniform(2.5, 3.9)
            experience = random.randint(0, 2)
            completed = random.randint(0, 9)
            rate = random.uniform(10, 25)

        data.append({
            "freelancer_id": freelancer_id,
            "name": name,
            "title": formatted_title,
            "primary_role": role,
            "skills": ", ".join(skills),
            "verified_skill_score": round(verified_score, 1),
            "hourly_rate": round(rate, 2),
            "experience_years": experience,
            "total_projects_completed": completed,
            "average_response_time_hours": round(avg_response, 1),
            "overall_rating": round(overall_rating, 2),
            "location": fake.city() + ", India", # Enforce India
            "bio": fake.catch_phrase()
        })
    return pd.DataFrame(data)

def generate_companies(n):
    data = []
    real_pool = REAL_INDIAN_COMPANIES.copy()
    random.shuffle(real_pool)
    
    for i in range(n):
        if i < len(real_pool):
            comp = real_pool[i]
            c_name = comp["name"]
            industry = comp["industry"]
            location = comp["location"]
        else:
            c_name = fake.company()
            industry = random.choice(["IT Services", "SaaS", "Fintech", "E-commerce"])
            location = fake.city() + ", India"
            
        data.append({
            "company_id": str(uuid.uuid4()),
            "company_name": c_name,
            "industry": industry,
            "location": location
        })
    return pd.DataFrame(data)

def generate_jobs(n, companies_df):
    data = []
    company_ids = companies_df["company_id"].tolist()
    
    for _ in range(n):
        role = random.choice(list(ROLES.keys()))
        req_skills = generate_skills_for_role(role)
        descriptors = ["Urgent", "Long-term", "Contract", "Part-time", "Full-time"]
        title = f"{random.choice(descriptors)}: {role} Needed"
        
        data.append({
            "job_id": str(uuid.uuid4()),
            "company_id": random.choice(company_ids),
            "title": title,
            "description": fake.paragraph(nb_sentences=3),
            "required_skills": ", ".join(req_skills),
            "budget": round(random.uniform(5000, 100000), 2), # Adjusted for INR scale? Or keep USD? Let's assume these are visible as "Credits" or "Rs" in UI.
            "duration_days": random.randint(7, 180),
            "status": random.choices(["Open", "Closed", "In Progress"], weights=[0.4, 0.3, 0.3])[0]
        })
    return pd.DataFrame(data)

def generate_interactions(n, freelancers_df, jobs_df):
    data = []
    freelancer_ids = freelancers_df["freelancer_id"].tolist()
    job_ids = jobs_df["job_id"].tolist()
    freelancer_map = freelancers_df.set_index("freelancer_id").to_dict("index")

    for _ in range(n):
        f_id = random.choice(freelancer_ids)
        j_id = random.choice(job_ids)
        f_in = freelancer_map[f_id]
        
        base_quality = f_in["verified_skill_score"] / 20.0
        actual_rating = min(5.0, max(1.0, random.normalvariate(base_quality, 0.4)))
        
        if actual_rating >= 4.5:
            completion = 1.0; on_time = True; review_sentiment = "positive"
        elif actual_rating >= 3.5:
            completion = 1.0; on_time = random.choice([True, False]); review_sentiment = "neutral"
        else:
            completion = random.choice([0.0, 0.5, 1.0]); on_time = False; review_sentiment = "negative"
            
        data.append({
            "interaction_id": str(uuid.uuid4()),
            "job_id": j_id,
            "freelancer_id": f_id,
            "company_id": jobs_df[jobs_df["job_id"] == j_id]["company_id"].values[0],
            "rating": round(actual_rating, 1),
            "project_completion_rate": completion,
            "on_time_delivery": on_time,
            "review_text": generate_review_text(review_sentiment),
            "timestamp": fake.date_between(start_date="-1y", end_date="today")
        })
    return pd.DataFrame(data)

def generate_review_text(sentiment):
    pos = ["Great work!", "Excellent deliverables.", "Highly recommended.", "A pleasure to work with.", "Exceeded expectations."]
    neu = ["Good work but delayed.", "Met requirements.", "Communication could be better.", "Decent output."]
    neg = ["Missed deadlines.", "Poor quality code.", "Ghosted mid-project.", "Would not hire again."]
    
    if sentiment == "positive": return random.choice(pos)
    elif sentiment == "neutral": return random.choice(neu)
    else: return random.choice(neg)

def main():
    print("--- Generating INDIAN Synthetic Data ---")
    
    print(f"Generating {NUM_FREELANCERS} Freelancers (Indian Names)...")
    freelancers = generate_freelancers(NUM_FREELANCERS)
    freelancers.to_csv("freelancers.csv", index=False)
    
    print(f"Generating {NUM_COMPANIES} Companies (Indian Tech)...")
    companies = generate_companies(NUM_COMPANIES)
    companies.to_csv("companies.csv", index=False)
    
    print(f"Generating {NUM_JOBS} Jobs...")
    jobs = generate_jobs(NUM_JOBS, companies)
    jobs.to_csv("jobs.csv", index=False)
    
    print(f"Generating {NUM_INTERACTIONS} Interactions...")
    interactions = generate_interactions(NUM_INTERACTIONS, freelancers, jobs)
    interactions.to_csv("job_history.csv", index=False)
    
    print("\nSUCCESS! Data generated:")
    print("- freelancers.csv")
    print("- companies.csv")
    print("- jobs.csv")
    print("- job_history.csv")

if __name__ == "__main__":
    main()
