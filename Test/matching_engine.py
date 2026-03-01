
import pandas as pd
import numpy as np

# We'll use a simple Matrix Factorization implementation since installing 'surprise' might be complex
class SimpleMatrixFactorization:
    def __init__(self, n_factors=20, n_epochs=20, learning_rate=0.01):
        self.n_factors = n_factors
        self.n_epochs = n_epochs
        self.lr = learning_rate
        
    def fit(self, user_ids, item_ids, ratings):
        # Map IDs to indices
        self.user_map = {uid: i for i, uid in enumerate(np.unique(user_ids))}
        self.item_map = {iid: i for i, iid in enumerate(np.unique(item_ids))}
        self.rev_item_map = {v: k for k, v in self.item_map.items()}
        
        n_users = len(self.user_map)
        n_items = len(self.item_map)
        
        # Initialize latent factors
        self.user_factors = np.random.normal(0, 0.1, (n_users, self.n_factors))
        self.item_factors = np.random.normal(0, 0.1, (n_items, self.n_factors))
        
        # Simple SGD
        for _ in range(self.n_epochs):
            for u, i, r in zip(user_ids, item_ids, ratings):
                u_idx = self.user_map[u]
                i_idx = self.item_map[i]
                
                prediction = np.dot(self.user_factors[u_idx], self.item_factors[i_idx])
                err = r - prediction
                
                # Update
                self.user_factors[u_idx] += self.lr * (err * self.item_factors[i_idx])
                self.item_factors[i_idx] += self.lr * (err * self.user_factors[u_idx])

    def predict(self, user_id, item_id):
        if user_id not in self.user_map or item_id not in self.item_map:
            return 2.5 # Default neutral prediction for cold start
        
        u_idx = self.user_map[user_id]
        i_idx = self.item_map[item_id]
        return np.dot(self.user_factors[u_idx], self.item_factors[i_idx])

def calculate_content_score(job_skills, freelancer_skills):
    """
    Jaccard Similarity between job requirements and freelancer skills.
    Handle cases where skills are strings or lists.
    """
    if not job_skills or not freelancer_skills:
        return 0.0
    
    # Normalize inputs to sets
    def to_set(val):
        if isinstance(val, str):
            return set([s.strip().lower() for s in val.split(',')])
        elif isinstance(val, list):
            return set([str(s).strip().lower() for s in val])
        return set()

    j_set = to_set(job_skills)
    f_set = to_set(freelancer_skills)
    
    if not j_set: return 0.0
    
    intersection = len(j_set.intersection(f_set))
    union = len(j_set.union(f_set))
    return intersection / union if union > 0 else 0

def recommend_freelancers(job_id, company_id, jobs_df, freelancers_df, interactions_df):
    
    # Train Collaborative Model (In production, train once and save)
    mf_model = SimpleMatrixFactorization(n_epochs=10) # Reduced epochs for demo speed
    mf_model.fit(
        interactions_df['company_id'], 
        interactions_df['freelancer_id'], 
        interactions_df['rating']
    )
    
    # Get Job Details
    job = jobs_df[jobs_df['job_id'] == job_id].iloc[0]
    required_skills = job['required_skills']
    
    recommendations = []
    
    for _, freelancer in freelancers_df.iterrows():
        f_id = freelancer['freelancer_id']
        
        # 1. Collaborative Score (Predicted Rating 1-5)
        collab_score = mf_model.predict(company_id, f_id)
        collab_norm = max(0, min(1, collab_score / 5.0)) # Normalize to 0-1
        
        # 2. Content Score (Skill Match 0-1)
        content_score = calculate_content_score(required_skills, freelancer['skills'])
        
        # 3. Dynamic Performance Score (Already calculated in freelancers_df usually, but let's take raw rating)
        # Using overall rating as proxy if dynamic_score column missing
        perf_score = freelancer['overall_rating'] / 5.0
        
        # Hybrid Weighted Score
        # Prioritize Skills (0.5), then Performance (0.3), then Preference (0.2)
        final_score = (content_score * 0.5) + (perf_score * 0.3) + (collab_norm * 0.2)
        
        recommendations.append({
            'freelancer_id': f_id,
            'name': freelancer['name'],
            'match_score': round(final_score * 100, 1),
            'skill_match': round(content_score * 100, 1),
            'predicted_rating': round(collab_score, 1)
        })
        
    # Train Collaborative Model (Simple SVD or Mean if no data)
    # For real freelancers (Guru) who have no 'company_id' interaction history, 
    # we default to content-based + verified score.
    
    # ... (Fitting logic kept simple for demo) ...
    
    recommendations = []
    
    for _, freelancer in freelancers_df.iterrows():
        f_id = freelancer['freelancer_id']
        
        # 1. Collaborative Score (Predicted Rating 1-5)
        # Cold start handling: if freelancer not in interactions, predict returns neutral (2.5) or based on global avg
        collab_score = mf_model.predict(company_id, f_id)
        
        # Boost for "Real" profiles (detected by lack of history or specific source marker) if we want to show them
        # But fair matching is better.
        
        collab_norm = max(0, min(1, collab_score / 5.0)) # Normalize to 0-1
        
        # 2. Content Score (Skill Match 0-1)
        content_score = calculate_content_score(required_skills, freelancer['skills'])
        
        # 3. Dynamic/Verified Score
        # Use 'verified_skill_score' from CSV (0-100) -> 0-1
        try:
            skill_ver_score = float(freelancer['verified_skill_score']) / 100.0
        except:
            skill_ver_score = 0.5 # Default
            
        # Hybrid Weighted Score
        # If Content Score is high, boost confidence
        # Weights: Content (40%), Verified Skill (30%), Collab/Reputation (30%)
        
        final_score = (content_score * 0.4) + (skill_ver_score * 0.3) + (collab_norm * 0.3)
        
        recommendations.append({
            'freelancer_id': f_id,
            'name': freelancer['name'],
            'title': freelancer['title'],
            'location': freelancer['location'],
            'skills': str(freelancer['skills'])[:50] + "...",
            'match_score': round(final_score * 100, 1),
            'skill_match': round(content_score * 100, 1),
            'predicted_rating': round(collab_score, 1),
            'hourly_rate': freelancer['hourly_rate'],
            'overall_rating': freelancer['overall_rating']
        })
        
    # Sort by match score
    rec_df = pd.DataFrame(recommendations).sort_values('match_score', ascending=False)
    return rec_df

def main():
    try:
        jobs = pd.read_csv('jobs.csv')
        freelancers = pd.read_csv('freelancers.csv')
        interactions = pd.read_csv('job_history.csv')
    except FileNotFoundError:
        print("Error: Files not found.")
        return

    # Demo: Recommend for the first job in the list
    sample_job = jobs.iloc[0]
    sample_company = sample_job['company_id']
    
    print(f"\n--- Recommendation System Demo ---")
    print(f"Company: {sample_company}")
    print(f"Job: {sample_job['title']}")
    print(f"Required Skills: {sample_job['required_skills']}")
    print("-" * 30)
    
    recs = recommend_freelancers(
        sample_job['job_id'], 
        sample_company, 
        jobs, 
        freelancers, 
        interactions
    )
    
    print("\nTop 5 Matched Freelancers:")
    print(recs.head(5).to_string(index=False))

if __name__ == "__main__":
    main()
