from setuptools import setup, find_packages

setup(
    name="sceptic-ai-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.95.0",
        "uvicorn>=0.20.0",
        "pydantic>=2.0.0",
        "numpy>=1.20.0",
        "tensorflow>=2.11.0",
        "pandas>=1.5.0",
        "scikit-learn>=1.2.0",
        "joblib>=1.2.0",
        "nltk>=3.8.0",
        "requests>=2.28.0",
        "python-multipart>=0.0.5",
        "aiofiles>=22.0.0",
        "python-jose>=3.3.0",
        "sqlalchemy>=2.0.0",
        "celery>=5.2.0",
        "redis>=4.5.0",
        "web3>=6.0.0",
        "eth-account>=0.8.0",
        "eth-typing>=3.0.0",
        "python-dotenv>=1.0.0"
    ],
) 