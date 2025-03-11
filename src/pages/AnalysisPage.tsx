import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Code2,
  GitBranch,
  Star,
  GitFork,
  Clock,
  FileCode,
  FunctionSquare as Function,
  AlertTriangle,
  BarChart,
  FileText,
  Shield,
  Activity,
  User
} from 'lucide-react';
import { analyzeCode, analyzeGithubRepo, getAnalysisResult, AnalysisResult, Vulnerability } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AnimatedButton } from '../components/AnimatedButton';

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

interface RepositoryInfo {
  name: string;
  stars: number;
  forks: number;
  last_updated: string;
  description?: string;
}

interface AnalysisSummary {
  total_files: number;
  analyzed_files: number;
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  empty_lines: number;
  total_functions: number;
  total_classes: number;
  average_risk_score: number;
  languages: Record<string, number>;
  vulnerability_summary: {
    high: number;
    medium: number;
    low: number;
  };
}

interface FileAnalysis {
  file: string;
  language: string;
  analysis: {
    prediction: string;
    source: string;
    risk_score: number;
    security_analysis: {
      code_quality: {
        comment_ratio: number;
      };
      warnings: string[];
      vulnerabilities: Array<{
        name: string;
        description: string;
      }>;
    };
  };
}

interface AnalysisResponse {
  request_id: string;
  status: string;
  result: {
    repository_info?: RepositoryInfo;
    analysis_summary?: AnalysisSummary;
    analyses?: FileAnalysis[];
  };
}

function AnalysisPage() {
  const [analysisMethod, setAnalysisMethod] = useState<'repository' | 'code'>('code');
  const [formData, setFormData] = useState<AnalysisFormData>({
    repositoryUrl: '',
    code: '',
    files: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const { address, signAnalysisRequest } = useWallet();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    if (!address) {
      toast.error('Please connect your wallet first');
      setIsLoading(false);
      return;
    }
    
    try {
      if (analysisMethod === 'repository') {
        if (!formData.repositoryUrl) {
          toast.error('Please enter a GitHub URL');
          setIsLoading(false);
          return;
        }
        
        // Request signature before analysis
        const signature = await signAnalysisRequest(formData.repositoryUrl);
        
        const response = await analyzeGithubRepo({
          url: formData.repositoryUrl,
          max_files: 15,
          signature // Add signature to request
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
                setResult(analysisResult as AnalysisResponse);
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
          setResult(response as AnalysisResponse);
          setIsLoading(false);
          toast.success('Analysis completed successfully!');
        }
      } else {
        if (!formData.code) {
          toast.error('Please enter code to analyze');
          setIsLoading(false);
          return;
        }
        
        // Request signature for direct code analysis
        const signature = await signAnalysisRequest('direct-code-analysis');
        
        const response = await analyzeCode({
          code: formData.code,
          language: detectLanguage(formData.code),
          signature
        });
        
        if (response.status === 'completed') {
          setResult(response as AnalysisResponse);
          toast.success('Analysis completed successfully!');
        } else if (response.status === 'error') {
          toast.error(`Analysis error: ${response.error || 'Unknown error'}`);
        }
        
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      if (error.message === 'User rejected signature request') {
        toast.error('Analysis cancelled - signature rejected');
      } else {
        toast.error(error.message || 'Failed to analyze code. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const detectLanguage = (code: string): string => {
    if (code.includes('contract') && code.includes('solidity')) return 'solidity';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('function') || code.includes('const')) return 'javascript';
    return 'unknown';
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const renderRepositoryInfo = () => {
    if (!result?.result?.repository_info) return null;
    const info = result.result.repository_info as RepositoryInfo;

    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-4 text-white">Repository Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-gray-300">
            <GitBranch className="w-5 h-5" />
            <span>{info.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <Star className="w-5 h-5" />
            <span>{info.stars} stars</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <GitFork className="w-5 h-5" />
            <span>{info.forks} forks</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <Clock className="w-5 h-5" />
            <span>Last updated: {new Date(info.last_updated).toLocaleDateString()}</span>
          </div>
        </div>
        {info.description && (
          <p className="mt-4 text-gray-400">{info.description}</p>
        )}
      </div>
    );
  };

  const renderAnalysisSummary = () => {
    if (!result?.result?.analysis_summary) return null;
    const summary = result.result.analysis_summary as AnalysisSummary;

    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-4 text-white">Analysis Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Files</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileCode className="w-5 h-5 text-primary-200 mr-2" />
                <span className="text-2xl font-bold text-white">{summary.analyzed_files}</span>
              </div>
              <span className="text-sm text-gray-500">of {summary.total_files}</span>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Code Structure</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Function className="w-5 h-5 text-primary-200 mr-2" />
                <span className="text-2xl font-bold text-white">{summary.total_functions}</span>
              </div>
              <span className="text-sm text-gray-500">functions</span>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Risk Score</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-primary-200 mr-2" />
                <span className={`text-2xl font-bold ${getRiskColor(summary.average_risk_score)}`}>
                  {summary.average_risk_score}
                </span>
              </div>
              <span className="text-sm text-gray-500">average</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Code Metrics</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Total Lines</span>
                  <span className="text-white">{summary.total_lines}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Code Lines</span>
                  <span className="text-white">{summary.code_lines}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Comments</span>
                  <span className="text-white">{summary.comment_lines}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Empty Lines</span>
                  <span className="text-white">{summary.empty_lines}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-white mb-4">Languages</h4>
            <div className="space-y-2">
              {Object.entries(summary.languages).map(([lang, count]) => (
                <div key={lang} className="flex justify-between items-center">
                  <span className="text-gray-400">{lang}</span>
                  <span className="text-white bg-gray-800 px-2 py-1 rounded">{count} files</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-medium text-white mb-4">Vulnerabilities</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-red-400">High</span>
                <span className="text-red-400 font-bold">{summary.vulnerability_summary.high}</span>
              </div>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-yellow-400">Medium</span>
                <span className="text-yellow-400 font-bold">{summary.vulnerability_summary.medium}</span>
              </div>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-green-400">Low</span>
                <span className="text-green-400 font-bold">{summary.vulnerability_summary.low}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFileAnalyses = () => {
    if (!result?.result?.analyses) return null;
    const analyses = result.result.analyses as FileAnalysis[];

    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-4 text-white">File Analysis Results</h3>
        <div className="space-y-4">
          {analyses.map((fileResult: any, index: number) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary-200" />
                  <span className="text-white font-medium">{fileResult.file}</span>
                </div>
                <span className="text-sm text-gray-400">{fileResult.language}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-400 mb-2">AI Detection</h5>
                  <div className="flex items-center space-x-2">
                    {fileResult.analysis.prediction === "AI" ? (
                      <Activity className="w-4 h-4 text-primary-200" />
                    ) : (
                      <User className="w-4 h-4 text-green-400" />
                    )}
                    <span className="text-white">
                      {fileResult.analysis.source}
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Risk Score</h5>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-primary-200" />
                    <span className={getRiskColor(fileResult.analysis.risk_score)}>
                      {fileResult.analysis.risk_score}
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Code Quality</h5>
                  <div className="flex items-center space-x-2">
                    <BarChart className="w-4 h-4 text-primary-200" />
                    <span className="text-white">
                      {fileResult.analysis.security_analysis.code_quality.comment_ratio.toFixed(1)}% documented
                    </span>
                  </div>
                </div>
              </div>

              {fileResult.analysis.security_analysis.warnings.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Warnings</h5>
                  <div className="space-y-2">
                    {fileResult.analysis.security_analysis.warnings.map((warning: string, wIndex: number) => (
                      <div key={wIndex} className="flex items-start space-x-2 text-sm text-yellow-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fileResult.analysis.security_analysis.vulnerabilities.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Vulnerabilities</h5>
                  <div className="space-y-2">
                    {fileResult.analysis.security_analysis.vulnerabilities.map((vuln: any, vIndex: number) => (
                      <div key={vIndex} className="flex items-start space-x-2 text-sm text-red-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{vuln.name}</span>
                          <p className="text-gray-400">{vuln.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
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
              <Code2 className="w-4 h-4 mr-2" />
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
                  <Code2 className="w-4 h-4 mr-2" />
                  Analyze Code
                </>
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="space-y-6">
            {renderRepositoryInfo()}
            {renderAnalysisSummary()}
            {renderFileAnalyses()}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisPage;