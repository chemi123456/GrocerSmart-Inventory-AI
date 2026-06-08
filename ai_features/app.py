from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

app = Flask(__name__)
CORS(app)

DEMAND_MODEL_PATH = "models/demand_model.pkl"
CREDIT_MODEL_PATH = "models/credit_model.pkl"

# Load models if they exist
demand_model = None
credit_model = None

try:
    if os.path.exists(DEMAND_MODEL_PATH):
        demand_model = joblib.load(DEMAND_MODEL_PATH)
except Exception as e:
    print(f"Error loading demand model: {e}")

try:
    if os.path.exists(CREDIT_MODEL_PATH):
        credit_model = joblib.load(CREDIT_MODEL_PATH)
except Exception as e:
    print(f"Error loading credit model: {e}")

@app.route('/')
def health_check():
    return jsonify({
        "status": "online",
        "models": {
            "demand": demand_model is not None,
            "credit": credit_model is not None
        }
    })

@app.route('/predict/forecast/14days', methods=['GET', 'POST'])
def forecast_demand():
    if not demand_model:
        return jsonify({"error": "Demand model not loaded"}), 500
        
    try:
        # We simulate receiving store and product families to forecast
        # For a real pipeline, we'd accept these as params
        data = request.json or {}
        store_nbr = data.get('store_nbr', 1)
        family = data.get('family', 'GROCERY I')
        
        # Generate next 14 days
        today = datetime.now()
        dates = [today + timedelta(days=i) for i in range(14)]
        
        forecast_input = pd.DataFrame({
            'store_nbr': [store_nbr] * 14,
            'family': [family] * 14,
            'onpromotion': [0] * 14, # assuming no promotions for simplicity
            'day_of_week': [d.weekday() for d in dates],
            'month': [d.month for d in dates],
            'day': [d.day for d in dates]
        })
        
        predictions = demand_model.predict(forecast_input)
        
        results = []
        for d, p in zip(dates, predictions):
            results.append({
                "date": d.strftime('%Y-%m-%d'),
                "predicted_sales": max(0, int(p))
            })
            
        return jsonify({
            "success": True,
            "store_nbr": store_nbr,
            "family": family,
            "forecast": results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict/credit', methods=['POST'])
def predict_credit():
    if not credit_model:
        return jsonify({"error": "Credit risk model not loaded"}), 500
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No input data provided"}), 400
            
        # Extract features
        limit = float(data.get('creditLimit', 10000))
        balance = float(data.get('outstandingBalance', 0))
        terms = int(data.get('paymentTermsDays', 30))
        
        # Optional data with defaults
        dpd = int(data.get('daysPastDue', 0))
        defaults = int(data.get('previousDefaults', 0))
        
        input_data = pd.DataFrame([{
            'credit_limit': limit,
            'outstanding_balance': balance,
            'payment_terms_days': terms,
            'days_past_due': dpd,
            'previous_defaults': defaults
        }])
        
        prediction = int(credit_model.predict(input_data)[0])
        probabilities = credit_model.predict_proba(input_data)[0].tolist()
        
        risk_labels = {0: "Low", 1: "Medium", 2: "High"}
        
        return jsonify({
            "success": True,
            "risk_score": prediction,
            "risk_label": risk_labels.get(prediction, "Unknown"),
            "probabilities": {
                "Low": probabilities[0] if len(probabilities) > 0 else 0,
                "Medium": probabilities[1] if len(probabilities) > 1 else 0,
                "High": probabilities[2] if len(probabilities) > 2 else 0
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start on port 5000 as expected by backend
    app.run(host='0.0.0.0', port=5000)
