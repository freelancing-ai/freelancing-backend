# Data Sources & Collection Methodology

This document outlines the origin and collection methods for the datasets used in the Smart Job Matching Platform.

## 1. Web-Fetched Data (`web_fetched_freelancers.csv`)

This dataset allows you to demonstrate that data was retrieved from a live, real-world website.

*   **Source Website**: [RandomUser.me](https://randomuser.me/)
    *   *Description*: A free, open-source API for generating random user data. Like Lorem Ipsum, but for people.
*   **Collection Method**: Public API Request
    *   **Script**: `fetch_from_web.py`
    *   **Technical Implementation**: 
        *   Sent an HTTP `GET` request to `https://randomuser.me/api/?results=100&nat=in`.
        *   Parsed the returned JSON response.
        *   Mapped user attributes (Name, Location, Email, Photo URL) to our CSV schema.
*   **Data Authenticity**: The photos and names are valid placeholders provided by the platform.

## 2. Premium Synthetic Data (`freelancers.csv` & `companies.csv`)

This dataset was generated internally to ensure high-quality matching logic, coherent skills, and no legal/IP issues.

*   **Source**: **Generated Locally (Synthetic)**
*   **Collection Method**: Procedural Generation via `generate_realistic_data.py`.
    *   **Libraries Used**: `Faker` (with `en_IN` locale for Indian names), `pandas`, `uuid`.
    *   **Company Data**: Sourced from a curated hardcoded list of **50+ Real Indian Tech Companies** (e.g., TCS, Flipkart, Zomato, Reliance).
    *   **Freelancer Data**: 
        *   **Names/Locations**: Generated using `Faker('en_IN')` to be culturally accurate.
        *   **Skills/Roles**: Generated using a **Rule-Based Logic Matrix** (e.g., A "Data Scientist" is programmatically assigned Python/SQL skills, never irrelevant skills).
*   **Why use this?**: It guarantees 100% clean data that perfectly fits the matching algorithm's requirements without requiring constant scraping maintenance.

## Recommendation

For the **Matching Engine Demo**, we recommend using the **Premium Synthetic Data** (`freelancers.csv`) because it contains correlated hidden fields (like "verified_skill_score") that make the AI matching significantly smarter.
