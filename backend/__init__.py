"""
Sceptic AI Backend Module

This module provides the backend functionality for the Sceptic AI project,
including machine learning models for code analysis and API endpoints.
"""

__version__ = '0.1.0'

from .api import app
from .utils import setup_directories
from .ml import predict_code, analyze_code_vulnerabilities, load_model 