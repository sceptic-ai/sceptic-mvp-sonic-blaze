import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Upload,
  FileCode2,
  Trash2
} from 'lucide-react';
import { fadeIn, slideUp, successConfetti } from '../lib/animations';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AnimatedButton } from '../components/AnimatedButton';

interface AnalysisFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}

function AnalysisPage() {
  const [url, setUrl] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [files, setFiles] = React.useState<AnalysisFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && files.length === 0) return;
    
    setIsAnalyzing(true);
    
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsAnalyzing(false);
    successConfetti();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    
    const newFiles: AnalysisFile[] = uploadedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'text/plain',
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    const newFiles: AnalysisFile[] = droppedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'text/plain',
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      {...fadeIn}
    >
      <motion.div 
        className="max-w-4xl mx-auto"
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          variants={slideUp}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-200">
            Code Analysis
          </h1>
          <p className="text-xl text-secondary-950">
            Submit your code repository or files for AI-powered analysis
          </p>
        </motion.div>

        {/* Analysis Form */}
        <motion.div 
          className="card p-8 mb-8"
          variants={slideUp}
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="url" className="block text-sm font-medium text-secondary-950 mb-2">
                GitHub Repository URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="url"
                  className="input pl-10"
                  placeholder="https://github.com/username/repo"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-600" />
              </div>
            </div>

            {/* File Upload Section */}
            <div className="mb-6">
              <div
                className="border-2 border-dashed border-secondary-400 rounded-lg p-8 text-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.rb,.php,.sol"
                />
                <Upload className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-950 mb-2">Drag and drop your files here</p>
                <p className="text-secondary-600 text-sm mb-4">or</p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </button>
                <p className="text-secondary-600 text-sm mt-4">
                  Supported files: .js, .jsx, .ts, .tsx, .py, .java, .go, .rb, .php, .sol
                </p>
              </div>
            </div>

            {/* File List with animations */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div 
                  className="mb-6"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <h3 className="text-lg font-bold mb-4 text-primary-200">Files to Analyze</h3>
                  <div className="space-y-3">
                    {files.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="flex items-center justify-between p-3 bg-secondary-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileCode2 className="w-5 h-5 text-primary-200" />
                          <div>
                            <p className="text-secondary-950 font-medium">{file.name}</p>
                            <p className="text-sm text-secondary-600">{file.size}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="text-secondary-600 hover:text-secondary-950 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatedButton
              type="submit"
              className="w-full"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2">Analyzing...</span>
                </div>
              ) : (
                'Start Analysis'
              )}
            </AnimatedButton>
          </form>
        </motion.div>

        {/* Analysis Tips with animations */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={slideUp}
        >
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center text-primary-200">
              <CheckCircle className="w-5 h-5 text-primary-200 mr-2" />
              Best Practices
            </h2>
            <ul className="space-y-2 text-secondary-950">
              <li>Use version-controlled repositories</li>
              <li>Include all project dependencies</li>
              <li>Provide complete documentation</li>
              <li>Follow language-specific conventions</li>
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center text-primary-200">
              <AlertCircle className="w-5 h-5 text-primary-200 mr-2" />
              Common Issues
            </h2>
            <ul className="space-y-2 text-secondary-950">
              <li>Missing dependency management</li>
              <li>Inconsistent code style</li>
              <li>Poor error handling</li>
              <li>Security vulnerabilities</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default AnalysisPage;