#!/usr/bin/env python3
"""
Script to train the ML model for Sceptic AI code analysis
"""

import os
import logging
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'logs/ml.log'))
    ]
)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import our modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    """Main entry point for training the model"""
    parser = argparse.ArgumentParser(description='Train the Sceptic AI code analysis model')
    parser.add_argument('--force', action='store_true', help='Force retraining even if model already exists')
    parser.add_argument('--data-dir', type=str, default=None, help='Directory containing CSV training data')
    args = parser.parse_args()
    
    try:
        # Set up directories first
        from backend.utils.setup import setup_directories
        setup_directories()
        
        # Import model training module
        from backend.ml.models.train_model import train_model
        
        # Check if the model already exists
        model_dir = os.path.join(os.path.dirname(__file__), 'ml/models')
        model_path = os.path.join(model_dir, 'code_analysis_model.h5')
        
        if os.path.exists(model_path) and not args.force:
            logger.info(f"Model already exists at {model_path}. Use --force to retrain.")
            return
        
        # Train the model
        logger.info("Starting model training...")
        model, tokenizer, scaler = train_model()
        logger.info("Model training completed successfully!")
        
        # Display model information
        logger.info(f"Model saved to: {model_path}")
        logger.info(f"Tokenizer and scaler saved to the same directory")
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 