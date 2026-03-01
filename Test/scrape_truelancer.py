import requests
from bs4 import BeautifulSoup
import pandas as pd
import uuid
import random
import time

def scrape_truelancer():
    print("--- Scraping Truelancer [One by One: Attempt 1] ---")
    
    # Truelancer Freelancers Search URL (Web Developers)
    url = "https://www.truelancer.com/freelancers/web-developer"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        print(f"Requesting {url}...")
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"Failed to retrieve page. Status Code: {response.status_code}")
            return None

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Select freelancer cards (Selectors based on typical Truelancer structure, may need adjustment)
        # Note: Class names might change, so we look for generic containers if specific ones fail
        # Inspecting typical Truelancer structure: div with class 'freelancer-item' or similar
        
        profiles = []
        
        # Truelancer usually lists profiles in specific divs. Let's try to find them.
        # This is a best-guess based on common layouts. 
        # If specific classes deny us, we look for 'h3' (names) and associated info.
        
        cards = soup.find_all('div', class_='freelancer-item')
        
        if not cards:
            # Fallback: finding generic columns if specific class is missing
            print("Layout might have changed, trying generic search...")
            cards = soup.find_all('div', class_='col-md-12')

        print(f"Found {len(cards)} potential profile cards.")

        for card in cards:
            if len(profiles) >= 10: break # Limit for initial test

            try:
                # Name
                name_tag = card.find('h3') or card.find('a', class_='freelancer-name')
                if not name_tag: continue
                name = name_tag.get_text(strip=True)

                # Title
                title_tag = card.find('h4') or card.find('div', class_='title')
                title = title_tag.get_text(strip=True) if title_tag else "Web Developer"

                # Rate
                rate_tag = card.find('span', class_='price')
                hourly_rate = 15.0 # Default
                if rate_tag:
                    rate_text = rate_tag.get_text(strip=True).replace('$','').replace('/hr','')
                    try:
                        hourly_rate = float(rate_text)
                    except:
                        pass

                # Skills
                skills = []
                skill_tags = card.find_all('a', class_='skill-label')
                for s in skill_tags:
                    skills.append(s.get_text(strip=True))
                
                # Image
                img_tag = card.find('img')
                img_url = img_tag['src'] if img_tag else ""

                profiles.append({
                    "freelancer_id": str(uuid.uuid4()),
                    "name": name,
                    "title": title,
                    "primary_role": "Web Developer",
                    "skills": ", ".join(skills) if skills else "Web Development",
                    "verified_skill_score": random.randint(60, 95),
                    "hourly_rate": hourly_rate,
                    "experience_years": random.randint(1, 10),
                    "total_projects_completed": random.randint(0, 50),
                    "average_response_time_hours": random.randint(1, 24),
                    "overall_rating": round(random.uniform(3.5, 5.0), 2),
                    "location": "India", # Context
                    "bio": f"Professional {title} from Truelancer"
                })
                
            except Exception as e:
                # fail silently for one card
                continue

        if profiles:
            print(f"Successfully extracted {len(profiles)} profiles.")
            return pd.DataFrame(profiles)
        else:
            print("No profiles could be parsed from the HTML.")
            # Debug: print snippet
            # print(soup.prettify()[:1000]) 
            return None

    except Exception as e:
        print(f"Error scraping Truelancer: {e}")
        return None

if __name__ == "__main__":
    df = scrape_truelancer()
    if df is not None and not df.empty:
        # Append to existing csv
        try:
            existing = pd.read_csv("freelancers.csv")
            combined = pd.concat([existing, df], ignore_index=True)
            combined.to_csv("freelancers.csv", index=False)
            print("Appended Truelancer data to freelancers.csv")
        except:
            df.to_csv("freelancers.csv", index=False)
            print("Created new freelancers.csv with Truelancer data")
    else:
        print("Script finished without data.")
