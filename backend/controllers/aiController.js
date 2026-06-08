const axios = require('axios');

// Determine AI service URL from env or default
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5000';

// @desc    Get demand forecast
// @route   POST /api/ai/forecast
// @access  Private (Manager/Admin)
exports.getDemandForecast = async (req, res, next) => {
  try {
    const { store_nbr, family } = req.body;
    
    // Call the Flask AI microservice
    const response = await axios.post(`${AI_SERVER_URL}/predict/forecast/14days`, {
      store_nbr: store_nbr || 1,
      family: family || 'GROCERY I'
    });
    
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to connect to AI Microservice for forecasting',
      error: error.message
    });
  }
};

// @desc    Assess credit risk
// @route   POST /api/ai/credit-risk
// @access  Private
exports.assessCreditRisk = async (req, res, next) => {
  try {
    const customerData = req.body;
    
    // Call the Flask AI microservice
    const response = await axios.post(`${AI_SERVER_URL}/predict/credit`, customerData);
    
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to connect to AI Microservice for credit risk assessment',
      error: error.message
    });
  }
};
