import pandas as pd
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA_PATH = "data/train.csv"
MODEL_PATH = "models/demand_model.pkl"

def generate_dummy_data():
    print("train.csv not found. Generating dummy dataset for testing...")
    np.random.seed(42)
    dates = pd.date_range(start='2017-01-01', end='2017-08-15')
    families = ['GROCERY I', 'BEVERAGES', 'PRODUCE', 'CLEANING', 'DAIRY']
    
    data = []
    for date in dates:
        for store in range(1, 6): # 5 stores
            for family in families:
                onpromotion = np.random.randint(0, 50)
                # Sales depend heavily on family and promotion
                base_sales = {'GROCERY I': 500, 'BEVERAGES': 800, 'PRODUCE': 400, 'CLEANING': 200, 'DAIRY': 300}[family]
                sales = max(0, int(np.random.normal(base_sales, base_sales * 0.2)) + (onpromotion * 10))
                
                data.append({
                    'id': len(data),
                    'date': date,
                    'store_nbr': store,
                    'family': family,
                    'sales': sales,
                    'onpromotion': onpromotion
                })
                
    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    df.to_csv(DATA_PATH, index=False)
    print(f"Dummy data generated with {len(df)} rows.")

def train_model():
    if not os.path.exists(DATA_PATH):
        generate_dummy_data()
        
    print("Loading data...")
    df = pd.read_csv(DATA_PATH)
    
    # Feature engineering
    df['date'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.month
    df['day'] = df['date'].dt.day
    
    # We will use a smaller subset for faster training if it's huge
    if len(df) > 100000:
        print("Sampling 100k rows for faster training...")
        df = df.sample(100000, random_state=42)
    
    features = ['store_nbr', 'family', 'onpromotion', 'day_of_week', 'month', 'day']
    target = 'sales'
    
    X = df[features]
    y = df[target]
    
    # Preprocessing
    numeric_features = ['store_nbr', 'onpromotion', 'day_of_week', 'month', 'day']
    categorical_features = ['family']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
        
    # Pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=20, max_depth=10, n_jobs=-1, random_state=42))
    ])
    
    print("Training Demand Forecasting Model...")
    pipeline.fit(X, y)
    print(f"Model R^2 score on training data: {pipeline.score(X, y):.4f}")
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
