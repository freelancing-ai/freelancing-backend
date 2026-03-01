import re

class FraudEngine:
    """
    AI Guardrails for the Smart Job Matching Platform.
    Analyzes profiles and content to detect suspicious patterns.
    """

    def analyze_profile(self, profile_data):
        """
        Analyzes a freelancer profile for authenticity.
        Returns: (safety_score, status, flags)
        """
        score = 100
        flags = []
        
        # 1. Bio Analysis (Simple Heuristics)
        bio = profile_data.get('bio', '')
        if len(bio) < 20:
            score -= 30
            flags.append("Bio too short")
        
        suspicious_keywords = ['guaranteed', '100% money back', 'call me', 'whatsapp']
        if any(kw in bio.lower() for kw in suspicious_keywords):
            score -= 40
            flags.append("Suspicious keywords in Bio")

        # 2. Skill Consistency (Simulated)
        # If they claim too many disparate skills (e.g., Medical + Coding + Law)
        skills = profile_data.get('skills', [])
        if len(skills) > 15:
            score -= 20
            flags.append("Unrealistic skill count")

        # Determine Status
        status = "Verified"
        if score < 50:
            status = "Flagged"
        elif score < 80:
            status = "Pending"
            
        return {
            "safety_score": score,
            "status": status,
            "flags": flags
        }

    def analyze_review(self, text, rating):
        """
        Analyzes a review for spam or fake patterns.
        Returns: (is_suspicious, reason)
        """
        if len(text.strip()) < 5:
            return True, "Review too short"
            
        # Check for repetition
        words = text.lower().split()
        if len(words) > 5 and len(set(words)) < len(words) * 0.5:
             return True, "Repetitive text patterns"
             
        # Check for generic bot-like phrasing
        generic_phrases = ["good job", "nice work", "ok", "good"]
        if text.lower().strip() in generic_phrases and rating == 5:
            return True, "Low-effort 5-star review"

        return False, None

# Singleton instance
fraud_guard = FraudEngine()
