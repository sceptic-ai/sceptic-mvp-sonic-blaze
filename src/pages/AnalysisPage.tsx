import React, { useState, useRef, ReactNode } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AnimatedButton } from '../components/AnimatedButton';
import { truncateAddress } from '../lib/utils';
import { analyzeGithubRepo, analyzeCode, getAnalysisResult, GithubAnalysisRequest, CodeAnalysisRequest } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { successConfetti } from '../lib/animations';

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

// Güvenlik analizi için tip tanımlamaları
interface Vulnerability {
  type: string;
  name: string;
  risk: string;
  description: string;
  score: number;
}

interface CodeQualityIssue {
  value: number;
  description: string;
  score: number;
}

interface SecurityAnalysis {
  vulnerabilities: Vulnerability[];
  code_quality: Record<string, CodeQualityIssue>;
  risk_level: number;
  high_risk: boolean;
  medium_risk: boolean;
  low_risk: boolean;
}

function AnalysisPage() {
  const [analysisMethod, setAnalysisMethod] = useState<'repository' | 'code' | 'file'>('repository');
  const [formData, setFormData] = useState<AnalysisFormData>({
    repositoryUrl: '',
    code: '',
    files: []
  });
  const [files, setFiles] = useState<AnalysisFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const { address } = useWallet();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    try {
      if (analysisMethod === 'repository') {
        // GitHub repo analizi
        if (!formData.repositoryUrl) {
          toast.error('Lütfen bir GitHub URL\'si girin');
          setIsLoading(false);
          return;
        }
        
        const request: GithubAnalysisRequest = {
          url: formData.repositoryUrl,
          max_files: 15
        };
        
        const response = await analyzeGithubRepo(request);
        
        if (response.status === 'processing') {
          // Analiz tamamlanana kadar bekle ve sonuçları periyodik olarak kontrol et
          const checkResult = async () => {
            try {
              const analysisResult = await getAnalysisResult(response.request_id);
              if (analysisResult.status === 'completed') {
                setResult(analysisResult.result);
                setIsLoading(false);
                successConfetti();
                return;
              } else if (analysisResult.status === 'error') {
                toast.error(`Analiz hatası: ${analysisResult.error || 'Bilinmeyen hata'}`);
                setIsLoading(false);
                return;
              }
              
              // Sonuç hazır değilse 2 saniye sonra tekrar kontrol et
              setTimeout(checkResult, 2000);
            } catch (error) {
              console.error('Analiz sonucu kontrol hatası:', error);
              toast.error('Analiz sonucu kontrol edilirken bir hata oluştu.');
              setIsLoading(false);
            }
          };
          
          // İlk kontrolü başlat
          setTimeout(checkResult, 2000);
        } else if (response.status === 'completed') {
          setResult(response.result);
          setIsLoading(false);
          successConfetti();
        } else {
          toast.error('Analiz başlatılırken bir hata oluştu.');
          setIsLoading(false);
        }
      } else if (analysisMethod === 'code') {
        // Doğrudan kod analizi
        if (!formData.code.trim()) {
          toast.error('Lütfen analiz edilecek kod girin');
          setIsLoading(false);
          return;
        }
        
        try {
          const request: CodeAnalysisRequest = {
            code: formData.code,
            language: detectLanguage(formData.code)
          };
          
          const response = await analyzeCode(request);
          
          if (response.status === 'processing') {
            // Analiz tamamlanana kadar bekle ve sonuçları periyodik olarak kontrol et
            const checkResult = async () => {
              try {
                const analysisResult = await getAnalysisResult(response.request_id);
                if (analysisResult.status === 'completed') {
                  setResult(analysisResult.result);
                  setIsLoading(false);
                  successConfetti();
                  return;
                } else if (analysisResult.status === 'error') {
                  toast.error(`Analiz hatası: ${analysisResult.error || 'Bilinmeyen hata'}`);
                  setIsLoading(false);
                  return;
                }
                
                // Sonuç hazır değilse 2 saniye sonra tekrar kontrol et
                setTimeout(checkResult, 2000);
              } catch (error) {
                console.error('Analiz sonucu kontrol hatası:', error);
                toast.error('Analiz sonucu kontrol edilirken bir hata oluştu.');
                setIsLoading(false);
              }
            };
            
            // İlk kontrolü başlat
            setTimeout(checkResult, 2000);
          } else if (response.status === 'completed') {
            setResult(response.result);
            setIsLoading(false);
            successConfetti();
          } else {
            toast.error('Analiz başlatılırken bir hata oluştu.');
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Kod analiz hatası:', error);
          toast.error('Kod analiz edilirken bir hata oluştu.');
          setIsLoading(false);
        }
      } else {
        // Dosya analizi henüz tam implementasyon yapılmadı
        toast.error('Dosya analizi şu anda tam olarak desteklenmiyor');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Analiz hatası:', error);
      toast.error('Analiz sırasında bir hata oluştu');
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const newFiles: AnalysisFile[] = Array.from(uploadedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Form verilerine dosyaları ekle
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...Array.from(uploadedFiles)]
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (id: string) => {
    const fileIndex = files.findIndex(file => file.id === id);
    if (fileIndex !== -1) {
      const newFiles = [...files];
      newFiles.splice(fileIndex, 1);
      setFiles(newFiles);
      
      // Form verilerinden de dosyayı kaldır
      setFormData(prev => ({
        ...prev,
        files: prev.files.filter((_, index) => index !== fileIndex)
      }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove('border-blue-600', 'bg-blue-50');
    }
    
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles) return;
    
    const newFiles: AnalysisFile[] = Array.from(droppedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
    // Form verilerine dosyaları ekle
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...Array.from(droppedFiles)]
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add('border-blue-600', 'bg-blue-50');
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove('border-blue-600', 'bg-blue-50');
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Blockchain adresi kopyalama işlevi
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Adres kopyalandı');
  };

  // Analiz sonucu risk skoruna göre renk belirle
  const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-orange-500';
    if (score >= 25) return 'text-yellow-500';
    return 'text-green-500';
  };

  const renderFeatures = () => {
    if (!result?.features) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Kod Özellikleri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(result.features || {}).map(([key, value]: [string, any]) => (
            <div key={key} className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">{key}</div>
              <div className="font-medium">{value?.toString() || ""}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderVulnerabilities = () => {
    if (!result?.security_analysis?.vulnerabilities?.length) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2">Tespit Edilen Güvenlik Açıkları</h4>
        <div className="space-y-2">
          {result.security_analysis.vulnerabilities.map((vuln: Vulnerability, index: number) => (
            <div key={index} className={`p-3 rounded-lg ${
              vuln.risk === 'critical' ? 'bg-red-100 text-red-800' : 
              vuln.risk === 'high' ? 'bg-orange-100 text-orange-800' :
              vuln.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              <div className="font-medium">{vuln.name}</div>
              <div className="text-sm">{vuln.description}</div>
              <div className="text-xs mt-1">Risk: {vuln.risk.toUpperCase()} (Skor: {vuln.score})</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderCodeQualityIssues = () => {
    if (!result?.security_analysis?.code_quality) return null;
    
    const codeQualityEntries = Object.entries(result.security_analysis.code_quality);
    if (codeQualityEntries.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2">Kod Kalitesi Sorunları</h4>
        <div className="space-y-2">
          {codeQualityEntries.map(([key, value]: [string, any]) => (
            <div key={key} className="p-3 bg-gray-100 rounded-lg">
              <div className="font-medium">{key}</div>
              <div className="text-sm">{value?.description || ""}</div>
              <div className="text-xs mt-1">Değer: {value?.value || 0} (Skor: {value?.score || 0})</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Detect programming language from code
  const detectLanguage = (code: string): string => {
    // Check for common language indicators
    if (code.includes('import React') || code.includes('function') && code.includes('return') && (code.includes('jsx') || code.includes('<div'))) {
      return 'javascript';
    }
    if (code.includes('import') && code.includes('from') && (code.includes('interface') || code.includes('type '))) {
      return 'typescript';
    }
    if (code.includes('class') && code.includes('public') && code.includes('{') && code.includes('}')) {
      return 'java';
    }
    if (code.includes('def ') && code.includes(':') && !code.includes('{')) {
      return 'python';
    }
    if (code.includes('pragma solidity') || code.includes('contract ')) {
      return 'solidity';
    }
    if (code.includes('fn ') && code.includes('->') && code.includes('let mut')) {
      return 'rust';
    }
    if (code.includes('#include') && (code.includes('<stdio.h>') || code.includes('<iostream>'))) {
      return code.includes('class') ? 'cpp' : 'c';
    }
    
    // Default to generic
    return 'generic';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Kod Analizi</h1>
      
      {!address ? (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 mb-6">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">Cüzdan Gerekli</h2>
          <p className="mb-4">Tam analiz işlemleri için lütfen cüzdanınızı bağlayın.</p>
          <button 
            onClick={() => navigate('/profile')} 
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Cüzdan Bağla
          </button>
        </div>
      ) : null}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex border-b mb-6 pb-4">
          <button 
            className={`mr-4 py-2 px-4 font-medium rounded-md ${analysisMethod === 'repository' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setAnalysisMethod('repository')}
          >
            GitHub Repo
          </button>
          <button 
            className={`mr-4 py-2 px-4 font-medium rounded-md ${analysisMethod === 'code' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setAnalysisMethod('code')}
          >
            Kod Analizi
          </button>
          <button 
            className={`py-2 px-4 font-medium rounded-md ${analysisMethod === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setAnalysisMethod('file')}
          >
            Dosya Yükle
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {analysisMethod === 'repository' && (
            <div className="mb-4 relative">
              <label htmlFor="repositoryUrl" className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repository URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="repositoryUrl"
                  name="repositoryUrl"
                  value={formData.repositoryUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/username/repo"
                  className="w-full p-2 pl-10 border rounded-md"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
          )}
          
          {analysisMethod === 'code' && (
            <div className="mb-4">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Analiz Edilecek Kod
              </label>
              <textarea
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                rows={12}
                placeholder="Analiz edilecek kodu buraya yapıştırın..."
                className="w-full p-2 border rounded-md font-mono"
              ></textarea>
            </div>
          )}
          
          {analysisMethod === 'file' && (
            <div className="mb-4">
              <div
                ref={dropAreaRef}
                className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Dosyaları buraya sürükleyin veya</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Dosya Seçin
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              
              {files.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Yüklenen Dosyalar</h3>
                  <ul className="divide-y divide-gray-200">
                    {files.map(file => (
                      <li key={file.id} className="py-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{file.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {file.status === 'pending' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 mr-2">
                              Bekliyor
                            </span>
                          )}
                          {file.status === 'analyzing' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 mr-2">
                              Analiz Ediliyor
                            </span>
                          )}
                          {file.status === 'completed' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 mr-2">
                              Tamamlandı
                            </span>
                          )}
                          {file.status === 'error' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 mr-2">
                              Hata
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center">
            <AnimatedButton
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="px-6 py-2"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner />
                  <span className="ml-2">Analiz Ediliyor...</span>
                </div>
              ) : (
                'Analiz Et'
              )}
            </AnimatedButton>
          </div>
        </form>
      </div>
      
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Analiz Sonucu</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Tespit</h3>
              <div className="flex items-center">
                <div className={`text-2xl font-bold ${result.prediction === 'AI' ? 'text-red-600' : 'text-green-600'}`}>
                  {result.prediction === 'AI' ? 'Yapay Zeka' : 'İnsan'}
                </div>
                <div className="ml-4 text-gray-600">
                  %{Math.round(result.confidence * 100)} Güven
                </div>
              </div>
              {result.prediction === 'AI' && (
                <div className="mt-2 text-sm text-gray-700">
                  Olası Kaynak: <span className="font-semibold">{result.source}</span>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Risk Skoru</h3>
              <div className={`text-2xl font-bold ${getRiskColor(result.risk_score)}`}>
                {result.risk_score}/100
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="h-2.5 rounded-full" 
                  style={{
                    width: `${result.risk_score}%`,
                    backgroundColor: result.risk_score >= 75 ? '#DC2626' : 
                                      result.risk_score >= 50 ? '#F97316' : 
                                      result.risk_score >= 25 ? '#FBBF24' : '#10B981'
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          {renderVulnerabilities()}
          
          {renderCodeQualityIssues()}
          
          {result.blockchain_tx && (
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold mb-2">Blockchain Kaydı</h3>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">İşlem:</span>
                <span className="font-mono text-sm">{truncateAddress(result.blockchain_tx)}</span>
                <button 
                  onClick={() => copyAddress(result.blockchain_tx)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {result.explorer_url && (
                  <a 
                    href={result.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <span>Görüntüle</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              
              <div className="mt-4 text-sm">
                <p className="mb-2">
                  Bu kod analizi, dolandırıcılık veya güvenlik riski tespiti nedeniyle 
                  <span className="font-semibold"> Sonic Network</span> blockchain'inde kalıcı olarak saklanmıştır.
                </p>
                <p>
                  Bu kaydın değiştirilmesi veya silinmesi mümkün değildir ve herkes tarafından doğrulanabilir durumdadır.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalysisPage;