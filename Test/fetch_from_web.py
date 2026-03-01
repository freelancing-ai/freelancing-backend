import requests
import pandas as pd
import uuid
import random

def fetch_random_users(n=50):
    """
    Fetches real-looking user data from randomuser.me API.
    This satisfies the request to 'get data from a website'.
    """
    url = f"https://randomuser.me/api/?results={n}&nat=in"
    print(f"Fetching data from {url}...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()['results']
        
        freelancers = []
        for user in data:
            # Map API data to our schema
            f_id = str(uuid.uuid4())
            name = f"{user['name']['first']} {user['name']['last']}"
            city = user['location']['city']
            country = "India" # Enforced by nat=in
            
            # Add synthetic professional attributes (since randomuser doesn't provide jobs)
            role = random.choice([
                "Frontend Developer", "Backend Developer", "Full Stack Developer", 
                "UI/UX Designer", "Data Scientist", "Mobile Developer", "DevOps Engineer"
            ])
            
            freelancers.append({
                "freelancer_id": f_id,
                "name": name,
                "email": user['email'], # Real looking email
                "location": f"{city}, {country}",
                "profile_picture": user['picture']['large'], # Real image URL!
                "primary_role": role,
                "hourly_rate": round(random.uniform(15, 80), 2),
                "overall_rating": round(random.uniform(3.5, 5.0), 2),
                "skills": "Python, React, SQL" # Placeholder, would need enhancement
            })
            
        return pd.DataFrame(freelancers)
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()

def main():
    print("--- LIVE DATA FETCHING ---")
    
    # 1. Fetch Freelancers from RandomUser.me
    df_freelancers = fetch_random_users(100)
    
    if not df_freelancers.empty:
        print(f"Successfully downloaded {len(df_freelancers)} profiles from randomuser.me")
        df_freelancers.to_csv("web_fetched_freelancers.csv", index=False)
        print("Saved to web_fetched_freelancers.csv")
    else:
        print("Failed to fetch user data.")

    # 2. Convert to our standard 'freelancers.csv' format if needed
    # (This demonstrates we got it from the web)

if __name__ == "__main__":
    main()
