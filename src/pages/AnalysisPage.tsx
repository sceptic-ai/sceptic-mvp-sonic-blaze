import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Upload, AlertTriangle, CheckCircle2, XCircle, Code2 } from 'lucide-react';
import { analyzeCode, analyzeGithubRepo, getAnalysisResult } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface AnalysisFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}

interface AnalysisFormData {
  repositoryUrl: string;
  code: string;
  files: File[];
}

function AnalysisPage() {
  const [analysisMethod, setAnalysisMethod] = useState<'repository' | 'code'>('code');
  const [formData, setFormData] = useState<AnalysisFormData>({
    repositoryUrl: '',
    code: '',
    files: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const { address } = useWallet();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    try {
      if (analysisMethod === 'repository') {
        if (!formData.repositoryUrl) {
          toast.error('Please enter a GitHub URL');
          setIsLoading(false);
          return;
        }
        
        const response = await analyzeGithubRepo({
          url: formData.repositoryUrl,
          max_files: 15
        });
        
        if (response.status === 'processing') {
          let retries = 0;
          const maxRetries = 30; // 1 minute max wait time with 2 second intervals
          
          const checkResult = async () => {
            try {
              if (retries >= maxRetries) {
                toast.error('Analysis timed out. Please try again.');
                setIsLoading(false);
                return;
              }
              
              const analysisResult = await getAnalysisResult(response.request_id);
              
              if (analysisResult.status === 'completed') {
                setResult(analysisResult.result);
                setIsLoading(false);
                toast.success('Analysis completed successfully!');
                return;
              } else if (analysisResult.status === 'error') {
                toast.error(`Analysis error: ${analysisResult.error || 'Unknown error'}`);
                setIsLoading(false);
                return;
              }
              
              retries++;
              setTimeout(checkResult, 2000); // Check every 2 seconds
            } catch (error: any) {
              console.error('Error checking result:', error);
              toast.error(error.message || 'Failed to check analysis result');
              setIsLoading(false);
            }
          };
          
          checkResult();
        } else {
          setResult(response.result);
          setIsLoading(false);
          toast.success('Analysis completed successfully!');
        }
      } else {
        if (!formData.code) {
          toast.error('Please enter code to analyze');
          setIsLoading(false);
          return;
        }
        
        const response = await analyzeCode({
          code: formData.code,
          language: detectLanguage(formData.code)
        });
        
        if (response.status === 'completed') {
          setResult(response.result);
          toast.success('Analysis completed successfully!');
        } else if (response.status === 'error') {
          toast.error(`Analysis error: ${response.error || 'Unknown error'}`);
        }
        
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze code. Please try again.');
      setIsLoading(false);
    }
  };

  const detectLanguage = (code: string): string => {
    // Simple language detection based on file extensions or syntax
    if (code.includes('import React')) return 'typescript';
    if (code.includes('pragma solidity')) return 'solidity';
    if (code.includes('def ')) return 'python';
    if (code.includes('function ')) return 'javascript';
    return 'unknown';
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Code Analysis</h1>
          <p className="text-gray-400">
            Analyze code for AI detection and security vulnerabilities
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 shadow-xl mb-8">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setAnalysisMethod('code')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                analysisMethod === 'code'
                  ? 'bg-primary-200 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Code2 className="w-4 h-4 mr-2" />
              Direct Code
            </button>
            <button
              onClick={() => setAnalysisMethod('repository')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                analysisMethod === 'repository'
                  ? 'bg-primary-200 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Search className="w-4 h-4 mr-2" />
              GitHub Repository
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {analysisMethod === 'repository' ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={formData.repositoryUrl}
                  onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Code to Analyze
                </label>
                <textarea
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Paste your code here..."
                  rows={10}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-200 font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-200 text-white py-2 px-4 rounded-lg hover:bg-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Analyzing...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analyze Code
                </>
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Analysis Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2 text-white">Source Detection</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Prediction:</span>
                  <span className="font-medium text-white">{result.source}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400">Confidence:</span>
                  <span className="font-medium text-white">
                    {(result.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2 text-white">Risk Assessment</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Risk Score:</span>
                  <span className={`font-medium ${getRiskColor(result.risk_score)}`}>
                    {result.risk_score}
                  </span>
                </div>
              </div>
            </div>

            {result.security_analysis && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-white">Security Analysis</h3>
                  <div className="space-y-4">
                    {result.security_analysis.vulnerabilities.map((vuln: any, index: number) => (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white">{vuln.name}</h4>
                            <p className="text-gray-400 text-sm mt-1">{vuln.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-sm ${
                            vuln.risk === 'high' 
                              ? 'bg-red-900 text-red-200'
                              : vuln.risk === 'medium'
                              ? 'bg-yellow-900 text-yellow-200'
                              : 'bg-green-900 text-green-200'
                          }`}>
                            {vuln.risk.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisPage;