
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pandas as pd
import os
import uuid
from datetime import datetime
import matching_engine
from fraud_engine import fraud_guard # [NEW] Import Fraud Engine
from pymongo import MongoClient

app = Flask(__name__)
app.secret_key = 'secret_key_demo'

# MongoDB Configuration
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client['job_matching_db']

freelancers_coll = db['freelancers']
jobs_coll = db['jobs']
interactions_coll = db['interactions']
proposals_coll = db['proposals']
users_coll = db['users']
companies_coll = db['companies']

DATA_DIR = os.getcwd()

JOBS_FILE = os.path.join(DATA_DIR, 'jobs.csv')
FREELANCERS_FILE = os.path.join(DATA_DIR, 'freelancers.csv')
INTERACTIONS_FILE = os.path.join(DATA_DIR, 'job_history.csv')
PROPOSALS_FILE = os.path.join(DATA_DIR, 'proposals.csv')
UPDATES_FILE = os.path.join(DATA_DIR, 'job_updates.csv')
USERS_FILE = os.path.join(DATA_DIR, 'users.csv')
COMPANIES_FILE = os.path.join(DATA_DIR, 'companies.csv')

# Initialize users.csv if not exists
if not os.path.exists(USERS_FILE):
    pd.DataFrame(columns=['username', 'password', 'freelancer_id']).to_csv(USERS_FILE, index=False)
if not os.path.exists(PROPOSALS_FILE):
    pd.DataFrame(columns=['proposal_id', 'job_id', 'freelancer_id', 'cover_letter', 'bid_amount', 'status', 'timestamp']).to_csv(PROPOSALS_FILE, index=False)

from flask import session, redirect, url_for
from datetime import datetime

def load_data(limit_freelancers=0):
    try:
        # Try fetching from MongoDB first
        try:
            # If limit_freelancers > 0, apply limit; otherwise fetch all
            jobs_mongo = list(jobs_coll.find({}, {'_id': 0}))
            if limit_freelancers > 0:
                freelancers_mongo = list(freelancers_coll.find({}, {'_id': 0}).limit(limit_freelancers))
            else:
                freelancers_mongo = list(freelancers_coll.find({}, {'_id': 0}))
            interactions_mongo = list(interactions_coll.find({}, {'_id': 0})) # Fetch all interactions
            
            if jobs_mongo or freelancers_mongo:
                jobs = pd.DataFrame(jobs_mongo) if jobs_mongo else pd.DataFrame()
                freelancers = pd.DataFrame(freelancers_mongo) if freelancers_mongo else pd.DataFrame()
                interactions = pd.DataFrame(interactions_mongo) if interactions_mongo else pd.DataFrame()
                
                # Check for updates
                try:
                    updates = pd.read_csv(UPDATES_FILE)
                except:
                    updates = pd.DataFrame(columns=['update_id', 'job_id', 'user_id', 'type', 'content', 'status', 'timestamp'])
                
                return jobs, freelancers, interactions, updates
        except Exception as e:
            print(f"MongoDB Fetch Error: {e}")

        # Fallback to CSV
        jobs = pd.read_csv(JOBS_FILE)
        freelancers = pd.read_csv(FREELANCERS_FILE)
        interactions = pd.read_csv(INTERACTIONS_FILE)
        try:
            updates = pd.read_csv(UPDATES_FILE)
        except:
            updates = pd.DataFrame(columns=['update_id', 'job_id', 'user_id', 'type', 'content', 'status', 'timestamp'])
        return jobs, freelancers, interactions, updates
    except FileNotFoundError:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

def load_extra_data():
    """Load additional collections specifically from MongoDB where possible"""
    try:
        proposals_mongo = list(proposals_coll.find({}, {'_id': 0}))
        users_mongo = list(users_coll.find({}, {'_id': 0}))
        companies_mongo = list(companies_coll.find({}, {'_id': 0}))
        
        proposals = pd.DataFrame(proposals_mongo) if proposals_mongo else pd.read_csv(PROPOSALS_FILE)
        users = pd.DataFrame(users_mongo) if users_mongo else pd.read_csv(USERS_FILE)
        companies = pd.DataFrame(companies_mongo) if companies_mongo else pd.read_csv(COMPANIES_FILE)
        
        return proposals, users, companies
    except Exception as e:
        print(f"Extra Data MongoDB Load Failed: {e}")
        return pd.read_csv(PROPOSALS_FILE), pd.read_csv(USERS_FILE), pd.read_csv(COMPANIES_FILE)

@app.route('/')
def index():
    jobs, _, _, _ = load_data(limit_freelancers=1)  # Only need jobs for homepage
    # Use efficient count query instead of loading all freelancers
    freelancer_total_count = freelancers_coll.count_documents({})
    
    # Filter Open Jobs
    open_jobs = jobs[jobs['status'] == 'Open']
    
    # Simulate Company Data & Currency Conversion
    import random
    company_data = [
        {"name": "Nexus AI", "logo": "/static/images/logo_nexus_ai.png"},
        {"name": "Vertex Solutions", "logo": "/static/images/logo_vertex_solutions.png"},
        {"name": "Quantum Corp", "logo": "/static/images/logo_quantum_corp.png"},
        {"name": "BlueSky Digital", "logo": "/static/images/logo_bluesky_digital.png"}
    ]
    
    def process_job(job):
        # Seed for consistency
        random.seed(job['job_id'])
        
        # Company Info
        company = random.choice(company_data)
        job['company_name'] = company['name']
        job['company_logo'] = company['logo']
        job['company_bg'] = "Verified Enterprise Client"
        
        # Currency Conversion (Lowered Multiplier/Base)
        # User said "cost is very very high".
        # Let's assume the CSV budget is High USD. We'll treat it as localized base or just divide.
        # Logic: If it's > 50000, divide by 10 to simulate realistic INR project costs, then format.
        raw_budget = float(job['budget'])
        if raw_budget > 10000:
            inr_budget = int(raw_budget) # Treat as direct INR if high
        else:
            inr_budget = int(raw_budget * 20) # Conservative conversion
            
        job['budget_inr'] = f"{inr_budget:,}"
        
        # Ensure duration is int
        job['duration_days'] = int(job['duration_days'])
        return job

    # specific categorization logic
    active_jobs = [process_job(job.to_dict()) for _, job in open_jobs.iterrows()]
    
    small_jobs = [j for j in active_jobs if j['duration_days'] <= 14][:4]
    medium_jobs = [j for j in active_jobs if 15 <= j['duration_days'] <= 45][:4]
    large_jobs = [j for j in active_jobs if j['duration_days'] > 45][:4]
    
    return render_template('index.html', 
                           job_count=len(jobs), 
                           freelancer_count=freelancer_total_count,
                           small_jobs=small_jobs,
                           medium_jobs=medium_jobs,
                           large_jobs=large_jobs)

# ... [Search, Profile, Hire Routes Unchanged] ...

# New Lifecycle Routes

@app.route('/job/<job_id>/submit_work', methods=['POST'])
def submit_work(job_id):
    # Freelancer Action: Submit for Review
    jobs_coll.update_one({'job_id': job_id}, {'$set': {'status': 'Under Review'}})
    return redirect(url_for('view_job', job_id=job_id))

@app.route('/job/<job_id>/approve', methods=['POST'])
def approve_work(job_id):
    # Company Action: Approve Work & Start Rating
    freelancer_id = ''
    try:
        match = proposals_coll.find_one({'job_id': job_id})
        if match:
            freelancer_id = match['freelancer_id']
    except:
        pass
        
    return render_template('job_complete.html', job_id=job_id, freelancer_id=freelancer_id)

@app.route('/job/<job_id>/rate', methods=['POST'])
def rate_freelancer(job_id):
    # Company Action: Submit Rating -> Close Job
    rating_val = int(request.form.get('rating'))
    comment = request.form.get('comment')
    freelancer_id = request.form.get('freelancer_id')
    
    # 1. Close the Job
    jobs_coll.update_one({'job_id': job_id}, {'$set': {'status': 'Closed'}})
    
    # If freelancer_id wasn't in form, try to find who applied
    if not freelancer_id:
         try:
             match = proposals_coll.find_one({'job_id': job_id})
             if match:
                 freelancer_id = match['freelancer_id']
         except:
             pass

    # 2. Save Interaction/Review
    if freelancer_id:
        # AI Safety Check on Review
        is_suspicious, reason = fraud_guard.analyze_review(comment, rating_val)
        
        new_interaction = {
            'interaction_id': f"int_{datetime.now().timestamp()}",
            'job_id': job_id,
            'freelancer_id': freelancer_id,
            'company_id': session.get('company_logged_in', 'unknown_company'),
            'rating': rating_val,
            'comment': comment,
            'timestamp': datetime.now().isoformat(),
            'is_flagged': is_suspicious,
            'flag_reason': reason if is_suspicious else ''
        }
        
        try:
            interactions_coll.insert_one(new_interaction)
            
            # 3. Recalculate Average Rating
            f_doc = freelancers_coll.find_one({'freelancer_id': freelancer_id})
            if f_doc:
                all_ratings = [i['rating'] for i in interactions_coll.find({'freelancer_id': freelancer_id})]
                new_avg = round(sum(all_ratings) / len(all_ratings), 1) if all_ratings else 0.0
                
                freelancers_coll.update_one(
                    {'freelancer_id': freelancer_id},
                    {
                        '$set': {'overall_rating': new_avg},
                        '$inc': {'total_projects_completed': 1}
                    }
                )
                
        except Exception as e:
            print(f"Error saving rating: {e}")

    return """
    <div style="font-family: sans-serif; text-align: center; margin-top: 5rem;">
        <h1 style="color: #10B981;">Contract Closed!</h1>
        <p>Rating and payment released to freelancer.</p>
        <a href="/" style="color: #4F46E5; font-weight: bold;">Return Home</a>
    </div>
    """
@app.route('/search', methods=['GET', 'POST'])
def search_freelancers():
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    is_ajax = request.args.get('ajax', '0') == '1'
    
    skip = (page - 1) * per_page
    
    # Efficient Direct MongoDB Search with Pagination
    try:
        if query:
            mongo_query = {
                '$or': [
                    {'name': {'$regex': query, '$options': 'i'}},
                    {'primary_role': {'$regex': query, '$options': 'i'}},
                    {'skills': {'$regex': query, '$options': 'i'}}
                ]
            }
            total_count = freelancers_coll.count_documents(mongo_query)
            matches_mongo = list(freelancers_coll.find(mongo_query, {'_id': 0}).sort('overall_rating', -1).skip(skip).limit(per_page))
        else:
            # Default view — all freelancers
            total_count = freelancers_coll.count_documents({})
            matches_mongo = list(freelancers_coll.find({}, {'_id': 0}).sort('overall_rating', -1).skip(skip).limit(per_page))
        
        matches = matches_mongo if matches_mongo else []
    except Exception as e:
        print(f"Search error: {e}")
        matches = []
        total_count = 0
    
    has_more = (skip + len(matches)) < total_count
    
    # If AJAX request, return JSON for infinite scroll
    if is_ajax:
        return jsonify({
            'freelancers': matches,
            'page': page,
            'per_page': per_page,
            'total': total_count,
            'has_more': has_more
        })
    
    return render_template('results.html', freelancers=matches, query=query, total=total_count, has_more=has_more, page=page)

@app.route('/profile/<freelancer_id>')
def view_profile(freelancer_id):
    # Try direct MongoDB fetch for reliability
    try:
        freelancer = freelancers_coll.find_one({'freelancer_id': freelancer_id}, {'_id': 0})
        if not freelancer:
            return "Freelancer not found", 404
    except Exception as e:
        return "Database error", 500
    
    # Process skills list for display
    skills_list = [s.strip() for s in str(freelancer.get('skills', '')).split(',')]
    
    # Get Job History for this freelancer
    history_docs = list(interactions_coll.find({'freelancer_id': freelancer_id}, {'_id': 0}))
    history = pd.DataFrame(history_docs) if history_docs else pd.DataFrame()
    
    full_history = []
    if not history.empty:
        jobs, _, _, _ = load_data()
        if not jobs.empty:
            merged = pd.merge(history, jobs, on='job_id', how='left')
            full_history = merged.to_dict('records')
    
    return render_template('profile.html', freelancer=freelancer, skills_list=skills_list, reviews=full_history)

@app.route('/hire/<freelancer_id>')
def hire_form(freelancer_id):
    jobs, freelancers, interactions, _ = load_data()
    f_row = freelancers[freelancers['freelancer_id'] == freelancer_id]
    if f_row.empty: return "Freelancer not found", 404
    freelancer = f_row.iloc[0].to_dict()
    return render_template('hire.html', freelancer=freelancer)

@app.route('/hire/submit', methods=['POST'])
def hire_submit():
    # In a real app, this would save to database and notify freelancer
    # For demo, we'll just show a success page or redirect
    return """
    <div style="font-family: sans-serif; text-align: center; margin-top: 5rem;">
        <h1 style="color: #10B981; font-size: 3rem;">Offer Sent! 🎉</h1>
        <p style="font-size: 1.2rem; color: #374151;">Your job proposal has been sent to the freelancer.</p>
        <a href="/" style="color: #4F46E5; text-decoration: none; font-weight: bold;">Return Home</a>
    </div>
    """

@app.route('/match/<job_id>')
def match_for_job(job_id):
    jobs, freelancers, interactions, _ = load_data()
    
    # Find job
    job = jobs[jobs['job_id'] == job_id]
    if job.empty:
        return "Job not found", 404
    
    job_details = job.iloc[0].to_dict()
    company_id = job_details['company_id']
    
    # Run Matching Engine
    recommendations_df = matching_engine.recommend_freelancers(
        job_id, company_id, jobs, freelancers, interactions
    )
    
    top_matches = recommendations_df.head(10).to_dict('records')
    
    return render_template('match_results.html', job=job_details, matches=top_matches)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        role = request.form.get('role')
        username = request.form.get('username')
        password = request.form.get('password')
        
        if role == 'company':
            if username == 'company' and password == 'password123':
                session['company_logged_in'] = True
                return redirect(url_for('company_dashboard'))
            else:
                return render_template('login.html', error="Invalid Company credentials.")
        else:
            # Check for hardcoded demo user
            if username == 'user' and password == 'password123':
                session['user_logged_in'] = True
                session['user_id'] = 'demo_user'
                return redirect(url_for('index'))
            
            # Check dynamic users
            try:
                user = users_coll.find_one({'username': username, 'password': password})
                if user:
                    session['user_logged_in'] = True
                    session['user_id'] = user['freelancer_id']
                    return redirect(url_for('index'))
            except Exception as e:
                print(f"Login error: {e}")

            return render_template('login.html', error="Invalid credentials.")
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # 1. Extract Data
        name = request.form.get('name')
        title = request.form.get('title')
        role = request.form.get('primary_role')
        rate = request.form.get('hourly_rate')
        skills = request.form.get('skills')
        bio = request.form.get('bio')
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 2. AI Safety Check (Fraud Engine)
        profile_data = {
            'bio': bio,
            'skills': [s.strip() for s in skills.split(',')] if skills else []
        }
        safety_result = fraud_guard.analyze_profile(profile_data)
        safety_score = safety_result['safety_score']
        verified_status = safety_result['status']
        
        # 3. Create Freelancer ID
        import uuid
        freelancer_id = f"f_{str(uuid.uuid4())[:8]}"
        
        # 4. Save to Freelancers CSV
        new_freelancer = {
            'freelancer_id': freelancer_id,
            'name': name,
            'title': title,
            'primary_role': role,
            'skills': skills,
            'hourly_rate': rate,
            'experience_years': 1, # Default
            'total_projects_completed': 0,
            'visible_projects': 0, # Default for safety
            'verified_skill_score': 0, # Default
            'overall_rating': 0.0, # Start with 0
            'location': 'Remote',
            'bio': bio,
            'safety_score': safety_score,
            'verified_status': verified_status
        }
        
        try:
            # Insert into freelancers collection
            freelancers_coll.insert_one(new_freelancer)
            
            # 5. Save to Users collection
            new_user = {
                'username': username,
                'password': password,
                'freelancer_id': freelancer_id
            }
            users_coll.insert_one(new_user)
            
            # 6. Auto Login
            session['user_logged_in'] = True
            session['user_id'] = freelancer_id
            
            return redirect(url_for('index'))
            
        except Exception as e:
            return f"Registration failed: {str(e)}"
            
    return render_template('register.html')

@app.route('/register-company', methods=['GET', 'POST'])
def register_company():
    if request.method == 'POST':
        # 1. Company Registration Logic
        company_name = request.form.get('company_name')
        # In a real app: Save company data, password, verify, etc.
        
        session['company_logged_in'] = True
        session['company_name'] = company_name
        
        # 2. Check for Job Posting (Unified Flow)
        job_title = request.form.get('job_title')
        if job_title:
            # User posted a job during registration
            import uuid
            job_id = f"job_{str(uuid.uuid4())[:8]}"
            
            description = request.form.get('job_description')
            skills = request.form.get('job_skills')
            budget = request.form.get('job_budget')
            duration = request.form.get('job_duration')
            
            new_job = {
                'job_id': job_id,
                'company_id': 'comp_new_registered', # Placeholder for the new company ID
                'title': job_title,
                'description': description,
                'required_skills': skills,
                'budget': budget,
                'duration_days': duration or 30, # Default if skipped
                'status': 'Open'
            }
            
            try:
                jobs_coll.insert_one(new_job)
            except Exception as e:
                print(f"Error posting job during reg: {e}")
                
        # Redirect to Dashboard (or Index)
        return redirect(url_for('company_dashboard'))
    return render_template('register_company.html')

@app.route('/post-job', methods=['GET', 'POST'])
def post_job():
    if not session.get('company_logged_in'):
        return redirect(url_for('login'))
        
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        skills = request.form.get('skills')
        budget = request.form.get('budget')
        duration = request.form.get('duration')
        
        # Create Job ID
        import uuid
        job_id = f"job_{str(uuid.uuid4())[:8]}"
        
        new_job = {
            'job_id': job_id,
            'company_id': 'comp_new_registered', # Placeholder
            'title': title,
            'description': description,
            'required_skills': skills,
            'budget': budget,
            'duration_days': duration,
            'status': 'Open'
        }
        
        try:
            jobs_coll.insert_one(new_job)
            return redirect(url_for('index'))
        except Exception as e:
            return f"Error posting job: {e}"
            
    return render_template('post_job.html')

@app.route('/logout')
def logout():
    session.pop('company_logged_in', None)
    session.pop('user_logged_in', None)
    return redirect(url_for('index'))

@app.route('/company')
def company_dashboard():
    if not session.get('company_logged_in'):
        return redirect(url_for('login'))
        
    jobs, freelancers, interactions, _ = load_data()
    
    proposals_df, users_df, _ = load_extra_data()
    proposals = proposals_df
        
    # Get Company Jobs (For demo, we might show all or filter by 'comp_new_registered' plus seeded ones)
    # Since we don't have persistent company IDs for seeded jobs, we will just show ALL jobs for the dashboard demo,
    # or filter if the user just created one.
    
    company_jobs = jobs[jobs['status'] != 'Closed'].to_dict('records')
    
    # Add Applicant Counts
    for job in company_jobs:
        count = len(proposals[proposals['job_id'] == job['job_id']])
        job['applicant_count'] = count
        
        # Format Budget/Date for display
        job['budget_display'] = f"${int(job['budget']):,}" if job['budget'] else '$0'
        
    # Recent Active Jobs for Table
    recent_jobs = company_jobs[:5]
    
    # AI Suggestions (Trigger on the most recent OPEN job)
    open_jobs = [j for j in company_jobs if j['status'] == 'Open']
    ai_suggestions = []
    target_job_title = "New Project"
    
    if open_jobs:
        latest_job = open_jobs[-1]
        target_job_title = latest_job['title']
        
        # Run Matching Engine
        try:
            recommendations = matching_engine.recommend_freelancers(
                latest_job['job_id'], 
                latest_job['company_id'], 
                jobs, 
                freelancers, 
                interactions
            )
            ai_suggestions = recommendations.head(3).to_dict('records')
        except Exception as e:
            print(f"Matching error: {e}")
            ai_suggestions = freelancers.head(3).to_dict('records') # Fallback
            
    # Simple Company Stats
    stats = {
        'total_users': len(freelancers),
        'active_jobs': len(company_jobs),
        'total_applicants': len(proposals)
    }
    
    return render_template('company_dashboard.html', stats=stats, recent_jobs=recent_jobs, ai_suggestions=ai_suggestions, target_job_title=target_job_title)
# Progress Tracking Routes
@app.route('/job/<job_id>/update', methods=['POST'])
def post_update(job_id):
    if not (session.get('company_logged_in') or session.get('user_logged_in')):
        return redirect(url_for('login'))
        
    content = request.form.get('content')
    update_type = request.form.get('type') # 'update' or 'milestone'
    current_user = session.get('user_id') if session.get('user_logged_in') else session.get('company_name')
    
    import uuid
    update_id = f"upd_{str(uuid.uuid4())[:8]}"
    
    new_update = {
        'update_id': update_id,
        'job_id': job_id,
        'user_id': current_user,
        'type': update_type,
        'content': content,
        'status': 'Pending' if update_type == 'milestone' else 'Posted',
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        try:
            df = pd.read_csv(UPDATES_FILE)
        except:
            df = pd.DataFrame(columns=['update_id', 'job_id', 'user_id', 'type', 'content', 'status', 'timestamp'])
            
        df = pd.concat([df, pd.DataFrame([new_update])], ignore_index=True)
        df.to_csv(UPDATES_FILE, index=False)
    except Exception as e:
        print(f"Error posting update: {e}")
        
    return redirect(url_for('view_job', job_id=job_id))

@app.route('/job/<job_id>/milestone/<update_id>/status', methods=['POST'])
def update_milestone_status(job_id, update_id):
    if not (session.get('company_logged_in') or session.get('user_logged_in')):
        return redirect(url_for('login'))
        
    new_status = request.form.get('status') # 'Completed', 'Approved'
    
    try:
        df = pd.read_csv(UPDATES_FILE)
        if update_id in df['update_id'].values:
            df.loc[df['update_id'] == update_id, 'status'] = new_status
            df.to_csv(UPDATES_FILE, index=False)
    except Exception as e:
        print(f"Error updating milestone: {e}")
        
    return redirect(url_for('view_job', job_id=job_id))

@app.route('/job/<job_id>')
def view_job(job_id):
    jobs, freelancers, _, updates_df = load_data()
    
    # Locate job
    job_row = jobs[jobs['job_id'] == job_id]
    if job_row.empty: return "Job not found", 404
    
    job = job_row.iloc[0].to_dict()
    
    # Simulate Company Info & Currency
    import random
    company_data = [
        {"name": "Nexus AI", "logo": "/static/images/logo_nexus_ai.png"},
        {"name": "Vertex Solutions", "logo": "/static/images/logo_vertex_solutions.png"},
        {"name": "Quantum Corp", "logo": "/static/images/logo_quantum_corp.png"},
        {"name": "BlueSky Digital", "logo": "/static/images/logo_bluesky_digital.png"}
    ]
    
    random.seed(job_id) 
    company = random.choice(company_data)
    job['company_name'] = company['name']
    job['company_logo'] = company['logo']
    
    # Currency
    inr_budget = int(float(job['budget']) * 85)
    job['budget_inr'] = f"{inr_budget:,}"
    job['deadline_date'] = "Dec 31, 2026"
    
    # Check if user has applied
    has_applied = False
    if session.get('user_logged_in'):
        try:
            user_id = session.get('user_id')
            match = proposals_coll.find_one({'job_id': job_id, 'freelancer_id': user_id})
            if match:
                has_applied = True
        except:
            pass
            
    # Owner Logic
    is_owner = False
    applicants = []
    if session.get('company_logged_in'):
        is_owner = True
        try:
            job_props = list(proposals_coll.find({'job_id': job_id}, {'_id': 0}))
            if job_props:
                job_props_df = pd.DataFrame(job_props)
                merged = pd.merge(job_props_df, freelancers, on='freelancer_id', how='left')
                applicants = merged.to_dict('records')
        except:
            pass

    # Progress / Timeline Data (Defaults)
    job_updates = []
    progress = 0
    if job['status'] in ['In Progress', 'Under Review', 'Closed']:
        if not updates_df.empty:
            job_updates = updates_df[updates_df['job_id'] == job_id].sort_values(by='timestamp', ascending=False).to_dict('records')
            
            # Calculate Progress
            milestones = [u for u in job_updates if u['type'] == 'milestone']
            if milestones:
                completed = len([m for m in milestones if m['status'] == 'completed'])
                progress = int((completed / len(milestones)) * 100)

    # Determine Job Tier
    is_quick_task = job['duration_days'] <= 14
    
    if job['status'] == 'Open':
        if is_owner:
            return render_template('active_job.html', job=job, is_owner=True, applicants=applicants, updates=[], progress=0)
        else:
            return render_template('job_details.html', job=job, has_applied=has_applied, is_quick_task=is_quick_task)
            
    elif job['status'] in ['In Progress', 'Under Review']:
        return render_template('active_job.html', job=job, is_owner=is_owner, applicants=applicants, updates=job_updates, progress=progress)
    else:
        return render_template('job_complete_view.html', job=job)

@app.route('/job/<job_id>/apply', methods=['POST'])
def apply_for_job(job_id):
    if not session.get('user_logged_in'):
        return redirect(url_for('login'))
        
    user_id = session.get('user_id')
    cover_letter = request.form.get('cover_letter')
    bid = request.form.get('bid_amount')
    
    import uuid
    prop_id = f"prop_{str(uuid.uuid4())[:8]}"
    
    new_prop = {
        'proposal_id': prop_id,
        'job_id': job_id,
        'freelancer_id': user_id,
        'cover_letter': cover_letter,
        'bid_amount': bid,
        'status': 'Pending',
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        proposals_coll.insert_one(new_prop)
    except Exception as e:
        print(f"Error applying: {e}")
        
    return redirect(url_for('view_job', job_id=job_id))

@app.route('/job/<job_id>/start', methods=['POST'])
def start_job(job_id):
    if not (session.get('company_logged_in') or session.get('user_logged_in')):
        return redirect(url_for('login'))

    target_freelancer_id = request.form.get('freelancer_id')
    
    # If no specific freelancer targeted (e.g. Instant Start by Worker)
    if not target_freelancer_id and session.get('user_logged_in'):
            target_freelancer_id = session.get('user_id')
    
    jobs_coll.update_one({'job_id': job_id}, {'$set': {'status': 'In Progress'}})
        
    return redirect(url_for('view_job', job_id=job_id))


@app.route('/job/<job_id>/update', methods=['POST'])
def update_job_progress(job_id):
    if not (session.get('company_logged_in') or session.get('user_logged_in')):
        return redirect(url_for('login'))
    
    update_type = request.form.get('type') # 'update' or 'milestone'
    content = request.form.get('content')
    
    import uuid
    update_id = f"upd_{str(uuid.uuid4())[:8]}"
    user_id = session.get('user_id') if session.get('user_logged_in') else 'company'
    
    new_update = {
        'update_id': update_id,
        'job_id': job_id,
        'user_id': user_id,
        'type': update_type,
        'content': content,
        'status': 'pending', # milestones start as pending
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        df = pd.read_csv(UPDATES_FILE)
        df = pd.concat([df, pd.DataFrame([new_update])], ignore_index=True)
        df.to_csv(UPDATES_FILE, index=False)
    except:
        pass
        
    return redirect(url_for('view_job', job_id=job_id))

@app.route('/job/milestone/<update_id>/complete', methods=['POST'])
def complete_milestone(update_id):
    # Toggle status: pending -> completed -> pending
    try:
        df = pd.read_csv(UPDATES_FILE)
        if update_id in df['update_id'].values:
            current_status = df.loc[df['update_id'] == update_id, 'status'].values[0]
            new_status = 'completed' if current_status != 'completed' else 'pending'
            df.loc[df['update_id'] == update_id, 'status'] = new_status
            df.to_csv(UPDATES_FILE, index=False)
            
            # Redirect back to job
            job_id = df.loc[df['update_id'] == update_id, 'job_id'].values[0]
            return redirect(url_for('view_job', job_id=job_id))
    except:
        pass
    return redirect(url_for('index'))


@app.route('/ai-solutions')
def ai_solutions():
    return render_template('index.html') # Placeholder: redirect to home or show specific page

@app.route('/trust-safety')
def trust_safety():
    return render_template('trust_safety.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
