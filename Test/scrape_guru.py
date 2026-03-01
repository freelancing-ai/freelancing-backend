import requests
from bs4 import BeautifulSoup
import pandas as pd
import uuid
import random
import time
import os

def save_safe(df, filename):
    """
    Saves DataFrame to CSV with retry logic for PermissionError.
    """
    retries = 3
    while retries > 0:
        try:
            # Check if file exists to determine header
            header = False
            try:
                pd.read_csv(filename)
                # If read success, file exists.
            except FileNotFoundError:
                header = True
            
            # Read existing to append
            try:
                existing = pd.read_csv(filename)
                combined = pd.concat([existing, df], ignore_index=True)
                # Drop duplicates based on name to avoid clutter
                combined = combined.drop_duplicates(subset=['name'])
            except FileNotFoundError:
                combined = df
            
            combined.to_csv(filename, index=False)
            print(f"Successfully saved. Total profiles: {len(combined)}")
            return
        except PermissionError:
            print(f"Permission denied accessing {filename}. Is it open? Retrying in 2s...")
            time.sleep(2)
            retries -= 1
    print("Failed to save data due to file permission issues.")

def scrape_guru(target_n=100):
    print(f"--- Scraping Guru.com [Target: {target_n}] ---")
    
    profiles = []
    page = 1
    base_url = "https://www.guru.com/d/freelancers/skill/web-development"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    while len(profiles) < target_n:
        # Pagination URL structure: /pg/2
        url = f"{base_url}/pg/{page}" if page > 1 else base_url
        
        try:
            print(f"Requesting Page {page}: {url}...")
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"Failed to retrieve page {page}. Status Code: {response.status_code}")
                # If 404, we reached the end
                break

            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Guru specific classes
            cards = soup.find_all('div', class_='record')
            
            if not cards:
                 # Fallback
                cards = soup.find_all('div', {'id': lambda x: x and x.startswith('service_')})

            print(f"Found {len(cards)} cards on page {page}.")
            
            if not cards:
                print("No more cards found. Stopping.")
                break

            for card in cards:
                if len(profiles) >= target_n: break

                try:
                    # Name
                    name_tag = card.find('h3') or card.find('a', class_='avatar_link')
                    if not name_tag: continue
                    name = name_tag.get_text(strip=True)

                    # Avoid duplicates in current run
                    if any(p['name'] == name for p in profiles):
                        continue

                    # Title
                    title_tag = card.find('h2') or card.find('div', class_='service-title')
                    title = title_tag.get_text(strip=True) if title_tag else "Web Developer"

                    # Rate
                    rate_tag = card.find('span', class_='price') or card.find('div', class_='budget')
                    hourly_rate = 20.0
                    if rate_tag:
                        rate_text = rate_tag.get_text(strip=True).replace('$','').replace('/hr','')
                        try:
                            hourly_rate = float(rate_text.split()[0].replace(',', '')) 
                        except:
                            pass

                    # Skills
                    skills = []
                    skill_tags = card.find_all('a', class_='skillItem')
                    for s in skill_tags:
                        skills.append(s.get_text(strip=True))

                    profiles.append({
                        "freelancer_id": str(uuid.uuid4()),
                        "name": name,
                        "title": title,
                        "primary_role": "Web Developer",
                        "skills": ", ".join(skills) if skills else "Web Development",
                        "verified_skill_score": random.randint(70, 98),
                        "hourly_rate": hourly_rate,
                        "experience_years": random.randint(2, 15),
                        "total_projects_completed": random.randint(5, 100),
                        "average_response_time_hours": random.randint(1, 12),
                        "overall_rating": round(random.uniform(4.0, 5.0), 2),
                        "location": "Global",
                        "bio": f"Guru.com Freelancer - {title}"
                    })
                except Exception:
                    continue
            
            page += 1
            # Rate limit politeness
            time.sleep(1.5)

        except Exception as e:
            print(f"Error scraping page {page}: {e}")
            break

    print(f"Scraping finished. Collected {len(profiles)} profiles.")
    return pd.DataFrame(profiles)

if __name__ == "__main__":
    df = scrape_guru(target_n=100)
    if df is not None and not df.empty:
        save_safe(df, "freelancers.csv")
    else:
        print("Script finished without data.")
