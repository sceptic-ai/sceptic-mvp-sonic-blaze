#!/usr/bin/env python3
"""
Test script for ML model in Sceptic AI
This script loads the ML model and tests it on a few sample code snippets.
"""

import os
import sys
import logging
import time
from ml.model import load_model, predict_code

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_model():
    """Test the model with a few sample inputs"""
    
    # Load model
    logger.info("Loading model...")
    start_time = time.time()
    model, tokenizer, scaler = load_model()
    load_time = time.time() - start_time
    
    if model is None:
        logger.error("Failed to load model. Ensure the model has been trained.")
        return False
    
    logger.info(f"Model loaded in {load_time:.2f} seconds")
    
    # Test samples
    test_samples = [
        {
            "name": "AI Generated",
            "code": """
def calculate_fibonacci(n):
    \"\"\"
    Calculate the nth Fibonacci number using dynamic programming approach.
    
    Args:
        n: A positive integer
        
    Returns:
        The nth Fibonacci number
    \"\"\"
    if n <= 0:
        return 0
    elif n == 1:
        return 1
        
    # Initialize array to store Fibonacci numbers
    fib = [0] * (n + 1)
    fib[0] = 0
    fib[1] = 1
    
    # Calculate Fibonacci numbers bottom-up
    for i in range(2, n + 1):
        fib[i] = fib[i - 1] + fib[i - 2]
    
    return fib[n]
"""
        },
        {
            "name": "Human Written",
            "code": """
def fib(n):
    a, b = 0, 1
    for i in range(n):
        a, b = b, a + b
    return a
"""
        },
        {
            "name": "Edge Case - Empty Code",
            "code": ""
        },
        {
            "name": "Edge Case - Very Short Code",
            "code": "print('hello')"
        }
    ]
    
    # Test each sample
    for i, sample in enumerate(test_samples):
        logger.info(f"Testing sample {i+1}: {sample['name']}")
        
        start_time = time.time()
        result = predict_code(sample['code'], model, tokenizer, scaler)
        prediction_time = time.time() - start_time
        
        logger.info(f"Prediction: {result['prediction']} (Confidence: {result['confidence']:.3f})")
        logger.info(f"Source: {result['source']}")
        logger.info(f"Risk Score: {result['risk_score']}")
        logger.info(f"Prediction time: {prediction_time:.2f} seconds")
        logger.info("-" * 50)
    
    logger.info("Model testing completed")
    return True

if __name__ == "__main__":
    try:
        # Add project root to path to ensure imports work
        project_root = os.path.dirname(os.path.abspath(__file__))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        
        # Run test
        success = test_model()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1) 