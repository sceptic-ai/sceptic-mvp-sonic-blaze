import os
import logging
import json

def setup_backend_directories():
    """
    Set up necessary directories and initial files for the backend
    """
    # Define the base directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Create directories if they don't exist
    directories = [
        os.path.join(base_dir, 'analysis_results'),
        os.path.join(base_dir, 'ml', 'models'),
        os.path.join(base_dir, 'blockchain', 'abi'),
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logging.info(f"Created directory: {directory}")
    
    # Create empty contract_updates.json if it doesn't exist
    contract_updates_file = os.path.join(base_dir, 'contract_updates.json')
    if not os.path.exists(contract_updates_file):
        with open(contract_updates_file, 'w') as f:
            json.dump([], f)
        logging.info(f"Created empty contract updates file: {contract_updates_file}")
    
    # Create any other necessary files here
    
    logging.info("Backend directory setup complete")

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run setup
    setup_backend_directories() 