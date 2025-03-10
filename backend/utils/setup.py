import os
import logging
import json
from pathlib import Path

def setup_directories():
    """
    Set up necessary directories and files for the backend
    """
    try:
        # Get the base directory
        base_dir = Path(__file__).parent.parent
        
        # Create directories
        directories = [
            base_dir / 'data',
            base_dir / 'logs',
            base_dir / 'ml' / 'models',
            base_dir / 'data' / 'contract_updates',
            base_dir / 'data' / 'analyses',
            base_dir / 'data' / 'uploads'
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            logging.info(f"Created directory: {directory}")
        
        # Create data directory in project root for CSV files
        project_root = base_dir.parent
        data_dir = project_root / 'data'
        data_dir.mkdir(exist_ok=True)
        logging.info(f"Ensured data directory exists: {data_dir}")
        
        # Initialize empty files if they don't exist
        init_files = [
            (base_dir / 'logs' / 'api.log', ''),
            (base_dir / 'logs' / 'ml.log', '')
        ]
        
        for file_path, content in init_files:
            if not file_path.exists():
                with open(file_path, 'w') as f:
                    f.write(content)
                logging.info(f"Created file: {file_path}")
        
        logging.info("Backend directories and files set up successfully")
        return True
    except Exception as e:
        logging.error(f"Error setting up directories: {str(e)}")
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run setup
    setup_directories() 