import os
import json
import logging
import shutil
from pathlib import Path

def setup_backend_directories():
    """
    Set up necessary directories and files for the backend
    """
    logging.basicConfig(level=logging.INFO)
    logging.info("Setting up backend directories")
    
    # Get the base directory paths
    backend_dir = Path(__file__).parent.parent
    project_root = Path(__file__).parent.parent.parent
    
    # Create necessary directories
    directories = [
        backend_dir / 'data',
        backend_dir / 'logs',
        backend_dir / 'ml' / 'models',
        backend_dir / 'data' / 'contract_updates',
        backend_dir / 'data' / 'analyses',
        backend_dir / 'data' / 'uploads'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logging.info(f"Created directory: {directory}")
    
    # Create empty contract_updates.json if it doesn't exist
    contract_updates_file = backend_dir / 'data' / 'contract_updates' / 'contract_updates.json'
    if not contract_updates_file.exists():
        with open(contract_updates_file, 'w') as f:
            json.dump([], f)
        logging.info(f"Created empty contract updates file: {contract_updates_file}")
    
    # Ensure ML models directory exists
    ml_models_dir = backend_dir / 'ml' / 'models'
    os.makedirs(ml_models_dir, exist_ok=True)
    logging.info(f"Created ML models directory: {ml_models_dir}")
    
    # Copy CSV files from project root data directory to backend/data if they exist
    project_data_dir = project_root / 'data'
    backend_data_dir = backend_dir / 'data'
    
    if project_data_dir.exists():
        for csv_file in project_data_dir.glob('*.csv'):
            target_file = backend_data_dir / csv_file.name
            if not target_file.exists():
                try:
                    shutil.copy2(csv_file, target_file)
                    logging.info(f"Copied {csv_file.name} to backend/data directory")
                except Exception as e:
                    logging.error(f"Error copying {csv_file.name}: {str(e)}")
    
    # Create example CSV files if they don't exist
    for csv_name in ['code_samples.csv', 'merged_AI_files.csv', 'merged_human_files.csv']:
        backend_csv = backend_data_dir / csv_name
        if not backend_csv.exists() and not (project_data_dir / csv_name).exists():
            # Create minimal example files with headers
            if csv_name == 'code_samples.csv':
                with open(backend_csv, 'w') as f:
                    f.write('code,is_ai_generated,language\n')
            else:
                with open(backend_csv, 'w') as f:
                    f.write('Content,License,Language\n')
            logging.info(f"Created empty CSV file: {backend_csv}")
    
    logging.info("Backend directory setup complete")

if __name__ == "__main__":
    setup_backend_directories() 