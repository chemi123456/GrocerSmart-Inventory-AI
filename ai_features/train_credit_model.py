import pandas as pd
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler

MODEL_PATH = "models/credit_model.pkl"

def generate_synthetic_credit_data():
    print("Generating synthetic credit risk data...")
    np.random.seed(42)
    
    n_samples = 1000
    
    # Features:
    # credit_limit: 1000 to 50000
    # outstanding_balance: 0 to credit_limit
    # payment_terms_days: 15, 30, 45, 60
    # days_past_due: 0 to 90
    # previous_defaults: 0 to 5
    
    data = []
    for _ in range(n_samples):
        limit = np.random.randint(1000, 50000)
        balance = np.random.randint(0, limit)
        terms = np.random.choice([15, 30, 45, 60, 90])
        
        # Risk factors
        base_risk = balance / limit
        
        if np.random.random() < 0.2: # 20% people are late
            dpd = np.random.randint(1, 90)
            defaults = np.random.randint(0, 3) if dpd > 30 else 0
        else:
            dpd = 0
            defaults = 0
            
        # Target Risk Label: 0=Low, 1=Medium, 2=High
        if dpd > 30 or defaults > 0 or base_risk > 0.8:
            risk = 2 # High
        elif dpd > 0 or base_risk > 0.5:
            risk = 1 # Medium
        else:
            risk = 0 # Low
            
        data.append({
            'credit_limit': limit,
            'outstanding_balance': balance,
            'payment_terms_days': terms,
            'days_past_due': dpd,
            'previous_defaults': defaults,
            'risk_level': risk
        })
        
    df = pd.DataFrame(data)
    return df

def train_model():
    df = generate_synthetic_credit_data()
    
    features = ['credit_limit', 'outstanding_balance', 'payment_terms_days', 'days_past_due', 'previous_defaults']
    target = 'risk_level'
    
    X = df[features]
    y = df[target]
    
    # Preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), features)
        ])
        
    # Pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42))
    ])
    
    print("Training Credit Risk Model...")
    pipeline.fit(X, y)
    print(f"Model Accuracy on training data: {pipeline.score(X, y):.4f}")
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
