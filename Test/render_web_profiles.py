import pandas as pd
import os

def generate_html():
    try:
        df = pd.read_csv("web_fetched_freelancers.csv")
    except FileNotFoundError:
        print("Error: web_fetched_freelancers.csv not found.")
        return

    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Web Data Verification</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f0f2f5; padding: 20px; }
            h1 { text-align: center; color: #333; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; }
            .card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }
            .card:hover { transform: translateY(-5px); }
            img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #3498db; margin-bottom: 15px; }
            .name { font-weight: bold; color: #2c3e50; font-size: 1.1em; }
            .role { color: #7f8c8d; font-size: 0.9em; margin: 5px 0; }
            .location { color: #95a5a6; font-size: 0.8em; }
            .source { text-align: center; margin-top: 30px; color: #7f8c8d; }
        </style>
    </head>
    <body>
        <h1>Live Fetched Profiles (RandomUser.me)</h1>
        <p style="text-align: center;">Displaying 50 samples from the downloaded CSV.</p>
        <div class="grid">
    """

    for _, row in df.head(50).iterrows():
        html_content += f"""
            <div class="card">
                <img src="{row['profile_picture']}" alt="{row['name']}">
                <div class="name">{row['name']}</div>
                <div class="role">{row['primary_role']}</div>
                <div class="location">{row['location']}</div>
            </div>
        """

    html_content += """
        </div>
        <div class="source">
            <p>Data Source: web_fetched_freelancers.csv</p>
        </div>
    </body>
    </html>
    """

    with open("web_profiles.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print(f"Successfully generated 'web_profiles.html' with {min(len(df), 50)} profiles.")

if __name__ == "__main__":
    generate_html()
