
import pandas as pd
import numpy as np

# Weights for the Dynamic Rating Algorithm
WEIGHTS = {
    'completion_rate': 0.30,
    'response_time': 0.20,
    'skill_test': 0.20,
    'quality_rating': 0.30
}

def normalize_response_time(series):
    """
    Normalizes response time. Lower is better.
    We'll cap max bad response at 48 hours for normalization purposes.
    Score = 1 - (hours / 48). If hours > 48, score is 0.
    """
    clipped = series.clip(upper=48)
    return 1 - (clipped / 48)

def normalize_skill_test(series):
    """
    Normalizes skill test (0-100) to 0-1.
    """
    return series / 100.0

def normalize_rating(series):
    """
    Normalizes 5-star rating to 0-1.
    """
    return series / 5.0

def calculate_dynamic_score(job_history_df, freelancers_df):
    """
    Calculates the score for each freelancer based on interaction history.
    """
    print("Computing Dynamic Scores...")
    
    # 1. Aggregate metrics from Job History
    metrics = job_history_df.groupby('freelancer_id').agg({
        'project_completion_rate': 'mean',
        'response_time_score': 'mean', # Already normalized in generation, but let's re-verify or use raw if available
        'quality_score': 'mean',      # 0-10 scale
        'rating': 'mean'              # 1-5 scale
    }).reset_index()
    
    # 2. Merge with Freelancer static data (verified skill score)
    merged = pd.merge(freelancers_df, metrics, on='freelancer_id', how='left')
    
    # Fill NaN for new freelancers (cold start)
    # Default: Average completion, average response, 0 ratings
    merged['project_completion_rate'] = merged['project_completion_rate'].fillna(0.8) # Optimistic start
    merged['quality_score'] = merged['quality_score'].fillna(7.0) # Average
    merged['rating'] = merged['rating'].fillna(0)
    
    # 3. Apply Normalization
    # Note: In our generation script, 'response_time_score' was directly generated. 
    # In a real app, we'd calculate it from raw hours. Let's use the generated score directly as it's 0-1.
    
    # Normalize Quality (0-10 -> 0-1)
    norm_quality = merged['quality_score'] / 10.0
    
    # Normalize Rating (1-5 -> 0-1) - Optional, can use instead of quality
    norm_rating = normalize_rating(merged['rating'])
    
    # Combined Quality Metric (Average of explicit quality score and star rating)
    final_quality = (norm_quality + norm_rating) / 2
    
    # Normalize Skill Test (0-100 -> 0-1)
    norm_skill = normalize_skill_test(merged['verified_skill_score'])
    
    # 4. Compute Weighted Score
    merged['dynamic_score'] = (
        (WEIGHTS['completion_rate'] * merged['project_completion_rate']) +
        (WEIGHTS['response_time'] * merged['response_time_score'].fillna(0.5)) + # default mid
        (WEIGHTS['skill_test'] * norm_skill) +
        (WEIGHTS['quality_rating'] * final_quality)
    ) * 100 # Scale to 0-100
    
    return merged

def main():
    try:
        interactions = pd.read_csv('job_history.csv')
        freelancers = pd.read_csv('freelancers.csv')
    except FileNotFoundError:
        print("Error: CSV files not found. Please run generate_data.py first.")
        return

    scored_freelancers = calculate_dynamic_score(interactions, freelancers)
    
    # Save the updated freelancers with their new dynamic scores
    scored_freelancers.to_csv('freelancers_scored.csv', index=False)
    
    print("Success! Dynamic scores calculated.")
    print(scored_freelancers[['name', 'dynamic_score', 'verified_skill_score', 'overall_rating']].head(10))

if __name__ == "__main__":
    main()
