#!/bin/bash

# Sceptic AI Project Runner
# This script helps set up and run the Sceptic AI project

# Function to print colored text
print_color() {
  local color=$1
  local text=$2
  case $color in
    "green") echo -e "\033[0;32m$text\033[0m" ;;
    "blue") echo -e "\033[0;34m$text\033[0m" ;;
    "red") echo -e "\033[0;31m$text\033[0m" ;;
    "yellow") echo -e "\033[0;33m$text\033[0m" ;;
    *) echo "$text" ;;
  esac
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
  print_color "blue" "Checking prerequisites..."
  
  local missing_requirements=0
  
  if ! command_exists node; then
    print_color "red" "Node.js is not installed. Please install Node.js."
    missing_requirements=1
  else
    print_color "green" "Node.js is installed: $(node --version)"
  fi
  
  if ! command_exists npm; then
    print_color "red" "npm is not installed. Please install npm."
    missing_requirements=1
  else
    print_color "green" "npm is installed: $(npm --version)"
  fi
  
  if ! command_exists python3; then
    print_color "red" "Python 3 is not installed. Please install Python 3."
    missing_requirements=1
  else
    print_color "green" "Python 3 is installed: $(python3 --version)"
  fi
  
  if ! command_exists pip3; then
    print_color "red" "pip3 is not installed. Please install pip3."
    missing_requirements=1
  else
    print_color "green" "pip3 is installed: $(pip3 --version)"
  fi
  
  if [ $missing_requirements -eq 1 ]; then
    print_color "red" "Please install missing requirements and try again."
    exit 1
  fi
  
  print_color "green" "All prerequisites are satisfied."
}

# Set up the environment
setup_environment() {
  print_color "blue" "Setting up environment..."
  
  # Create directories if they don't exist
  mkdir -p data
  mkdir -p backend/logs
  mkdir -p backend/ml/models
  mkdir -p backend/data/contract_updates
  
  # Copy sample CSV files to ensure they're in the right location if they aren't already
  if [ -f "data/merged_AI_files.csv" ] && [ ! -f "backend/data/merged_AI_files.csv" ]; then
    mkdir -p backend/data
    cp data/merged_AI_files.csv backend/data/
    print_color "green" "Copied AI files to backend data directory"
  fi
  
  if [ -f "data/merged_human_files.csv" ] && [ ! -f "backend/data/merged_human_files.csv" ]; then
    mkdir -p backend/data
    cp data/merged_human_files.csv backend/data/
    print_color "green" "Copied human files to backend data directory"
  fi
  
  if [ -f "data/code_samples.csv" ] && [ ! -f "backend/data/code_samples.csv" ]; then
    mkdir -p backend/data
    cp data/code_samples.csv backend/data/
    print_color "green" "Copied code samples to backend data directory"
  fi

  # Check if .env file exists
  if [ ! -f .env ]; then
    print_color "yellow" "Creating default .env file..."
    cat > .env <<EOL
# API ve blockchain ayarları
VITE_API_URL=http://localhost:8000
SONIC_TESTNET_RPC="https://rpc.blaze.soniclabs.com"

# Proje ayarları
NODE_ENV=development
DEBUG=true

# Contract ayarları 
VITE_CONTRACT_ADDRESS=0xF9978A310aD03151E4B09d8D03b30F863eaD38eC
TOKEN_CONTRACT_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
AUDIT_CONTRACT_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8" 
EOL
    print_color "green" ".env file created."
  else
    print_color "green" ".env file already exists."
  fi
  
  # Check if there's a Python virtual environment
  if [ ! -d "venv" ]; then
    print_color "yellow" "Creating Python virtual environment..."
    python3 -m venv venv
    print_color "green" "Virtual environment created."
  else
    print_color "green" "Virtual environment already exists."
  fi
  
  # Activate virtual environment and install requirements
  print_color "yellow" "Installing Python dependencies..."
  if [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    venv/Scripts/activate
    pip install --upgrade pip
    pip install -r backend/requirements.txt
  else
    # macOS/Linux
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r backend/requirements.txt
  fi
  print_color "green" "Python dependencies installed."
  
  # Install npm dependencies
  print_color "yellow" "Installing npm dependencies..."
  npm install
  print_color "green" "npm dependencies installed."
}

# Train the model
train_model() {
  print_color "blue" "Training the model..."
  
  # Activate virtual environment
  source venv/bin/activate || source venv/Scripts/activate
  
  # Run the training script
  python backend/train.py
  
  if [ $? -eq 0 ]; then
    print_color "green" "Model training completed successfully."
  else
    print_color "red" "Model training failed."
    exit 1
  fi
}

# Start the backend
start_backend() {
  print_color "blue" "Starting the backend server..."
  
  # Activate virtual environment based on OS
  if [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    venv/Scripts/activate
  else
    # macOS/Linux
    source venv/bin/activate
  fi
  
  # Run setup to ensure directories and files exist
  print_color "blue" "Running backend setup..."
  python -m backend.api.setup
  
  if [ $? -ne 0 ]; then
    print_color "red" "Backend setup failed. Check logs for details."
    exit 1
  fi
  
  # Check for model files and train if missing
  MODEL_PATH="backend/ml/models/code_classifier_model.h5"
  if [ ! -f "$MODEL_PATH" ]; then
    print_color "yellow" "ML model not found. Running model training..."
    python -m backend.ml.models.train_model
    
    if [ $? -ne 0 ]; then
      print_color "yellow" "Model training had issues, but we'll try to start the backend anyway."
    else
      print_color "green" "Model training completed successfully."
    fi
  fi
  
  # Run the FastAPI server with increased wait time
  print_color "blue" "Starting FastAPI server..."
  uvicorn backend.api.app:app --reload --host 0.0.0.0 --port 8000 &
  BACKEND_PID=$!
  
  print_color "green" "Backend server started with PID: $BACKEND_PID"
  
  # Wait for backend to start
  print_color "yellow" "Waiting for backend to start (5 seconds)..."
  sleep 5
  
  # Check if backend is running
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_color "red" "Backend failed to start. Check logs for details."
    exit 1
  else
    print_color "green" "Backend server is running."
  fi
}

# Start the frontend
start_frontend() {
  print_color "blue" "Starting the frontend development server..."
  
  # Run the Vite development server
  npm run dev &
  FRONTEND_PID=$!
  
  print_color "green" "Frontend development server started with PID: $FRONTEND_PID"
}

# Main function
main() {
  print_color "blue" "==============================================="
  print_color "blue" "          Sceptic AI Project Runner           "
  print_color "blue" "==============================================="
  
  check_prerequisites
  setup_environment
  
  # Check if model exists, if not train it
  if [ ! -f "backend/ml/models/code_analysis_model.h5" ]; then
    print_color "yellow" "Model not found. Training model..."
    train_model
  else
    print_color "green" "Model already exists. Skipping training."
    print_color "yellow" "To force retraining, run: python backend/train.py --force"
  fi
  
  start_backend
  start_frontend
  
  print_color "green" "==============================================="
  print_color "green" "Sceptic AI is now running!"
  print_color "green" "Backend: http://localhost:8000"
  print_color "green" "Frontend: http://localhost:3000"
  print_color "green" "==============================================="
  print_color "yellow" "Press Ctrl+C to stop all servers"
  
  # Wait for user to stop the service
  wait $FRONTEND_PID
}

# Trap Ctrl+C and call cleanup
cleanup() {
  print_color "yellow" "Shutting down services..."
  
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
  fi
  
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null
  fi
  
  print_color "green" "All services stopped. Goodbye!"
  exit 0
}

trap cleanup INT

# Run the main function
main 