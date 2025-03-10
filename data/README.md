# Training Data for Sceptic AI

This directory contains CSV files used to train the AI detection model in Sceptic AI.

## CSV File Format

The CSV files should have the following columns:

1. `code` - The source code sample to analyze
2. `is_ai_generated` - Binary label: 1 for AI-generated code, 0 for human-written code
3. `language` (optional) - Programming language of the code

Example:

```csv
code,is_ai_generated,language
"def hello_world(): print('Hello, world!')",1,python
"function add(a, b) { return a + b; }",0,javascript
```

## Adding Your Own Data

You can add your own CSV files to this directory to improve the model's accuracy. Follow these guidelines:

1. Ensure your CSV files have at least the `code` and `is_ai_generated` columns
2. Use a proper CSV format with quoted string values to handle multiline code
3. Try to maintain a balanced dataset with approximately equal numbers of AI and human examples
4. Include diverse programming languages for better generalization

## Training the Model

To train the model with your data, run:

```bash
cd backend
python train.py
```

To force retraining even if a model already exists:

```bash
python train.py --force
```

## Evaluating the Model

After training, the model's performance metrics will be displayed in the terminal and logged to `backend/logs/ml.log`. The trained model will be saved to `backend/ml/models/`. 