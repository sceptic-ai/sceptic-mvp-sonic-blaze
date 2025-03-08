import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Tag, 
  Users, 
  Calendar,
  Download,
  Star,
  Filter,
  Upload,
  Plus,
  Code2,
  FileCode2,
  DollarSign,
  CheckCircle,
  X,
  Search
} from 'lucide-react';
import { fadeIn, slideUp, successConfetti } from '../lib/animations';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { publishDataset } from '../lib/api';
import { toast } from 'sonner';

interface Dataset {
  id: number;
  title: string;
  description: string;
  price: string;
  downloads: string;
  rating: number;
  category: string;
  lastUpdated: string;
  language: string;
  sourceType: 'AI' | 'Human';
  sampleSize: string;
  author: string;
}

const datasets: Dataset[] = [
  {
    id: 1,
    title: 'Common Fraud Patterns',
    description: 'A comprehensive collection of identified fraud patterns in smart contracts',
    price: '500 SCEP',
    downloads: '1.2K',
    rating: 4.8,
    category: 'Security',
    lastUpdated: '2024-03-01',
    language: 'Solidity',
    sourceType: 'AI',
    sampleSize: '10,000 contracts',
    author: 'ScepticAI'
  },
  {
    id: 2,
    title: 'DeFi Vulnerability Database',
    description: 'Historical database of DeFi protocol vulnerabilities and exploits',
    price: '750 SCEP',
    downloads: '856',
    rating: 4.6,
    category: 'DeFi',
    lastUpdated: '2024-03-05',
    language: 'Solidity',
    sourceType: 'Human',
    sampleSize: '5,000 contracts',
    author: 'DeFi Security Group'
  },
  {
    id: 3,
    title: 'NFT Market Analysis',
    description: 'Analysis of NFT marketplace smart contracts and common issues',
    price: '300 SCEP',
    downloads: '2.1K',
    rating: 4.9,
    category: 'NFT',
    lastUpdated: '2024-03-08',
    language: 'Solidity',
    sourceType: 'AI',
    sampleSize: '8,000 contracts',
    author: 'NFT Research Lab'
  },
];

const categories = ['All', 'Security', 'DeFi', 'NFT', 'DAO', 'GameFi', 'Bridge'];
const languages = ['Solidity', 'Rust', 'Move', 'Cairo', 'Vyper'];
const sourceTypes = ['AI', 'Human', 'Mixed'];

function DataMarketplacePage() {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: languages[0],
    sourceType: sourceTypes[0],
    category: categories[1],
    price: '',
  });

  const handlePublishDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      selectedFiles.forEach(file => {
        data.append('files', file);
      });

      await publishDataset(data);
      successConfetti();
      toast.success('Dataset published successfully!');
      setIsPublishModalOpen(false);
      setFormData({
        title: '',
        description: '',
        language: languages[0],
        sourceType: sourceTypes[0],
        category: categories[1],
        price: '',
      });
      setSelectedFiles([]);
    } catch (error) {
      console.error('Failed to publish dataset:', error);
      toast.error('Failed to publish dataset. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      {...fadeIn}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Marketplace</h1>
          <p className="text-gray-600">
            Access and publish curated datasets of smart contract analysis
          </p>
        </div>
        <AnimatedButton
          onClick={() => setIsPublishModalOpen(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Publish Dataset
        </AnimatedButton>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col gap-6">
          <div className="relative">
            <input
              type="text"
              className="input pl-10"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-500 mr-2" />
              <span className="font-medium">Filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    category === selectedCategory
                      ? 'bg-primary-200 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.map((dataset) => (
          <motion.div
            key={dataset.id}
            className="card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold">{dataset.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dataset.sourceType === 'AI' 
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-secondary-100 text-secondary-800'
                  }`}>
                    {dataset.sourceType}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{dataset.description}</p>
              </div>
              <FileCode2 className="w-5 h-5 text-primary-600" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Code2 className="w-4 h-4" />
                {dataset.language}
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {dataset.downloads}
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                {dataset.rating}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {dataset.sampleSize}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{dataset.price}</span>
                <span className="text-xs text-gray-500">
                  Last updated: {dataset.lastUpdated}
                </span>
              </div>
              <AnimatedButton variant="primary">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Purchase
              </AnimatedButton>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Publish Dataset Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-secondary-50 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-between items-center p-6 border-b border-secondary-300 sticky top-0 bg-secondary-50">
                <h2 className="text-2xl font-bold text-primary-200">Publish New Dataset</h2>
                <button
                  onClick={() => setIsPublishModalOpen(false)}
                  className="text-secondary-950 hover:text-primary-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handlePublishDataset} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-950 mb-2">
                      Dataset Title
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Solidity Security Patterns"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-950 mb-2">
                      Description
                    </label>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Describe your dataset..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-950 mb-2">
                        Programming Language
                      </label>
                      <select 
                        className="input"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        required
                      >
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-950 mb-2">
                        Source Type
                      </label>
                      <select 
                        className="input"
                        value={formData.sourceType}
                        onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as any })}
                        required
                      >
                        {sourceTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-950 mb-2">
                        Category
                      </label>
                      <select 
                        className="input"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      >
                        {categories.filter(cat => cat !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-950 mb-2">
                        Price (SCEP)
                      </label>
                      <input
                        type="number"
                        className="input"
                        placeholder="e.g., 500"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-950 mb-2">
                      Upload Dataset Files
                    </label>
                    <div
                      className="border-2 border-dashed border-secondary-300 rounded-lg p-8 text-center"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".json,.csv,.zip"
                      />
                      <Upload className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
                      <p className="text-secondary-950 mb-2">
                        Drag and drop your files here or{' '}
                        <button
                          type="button"
                          className="text-primary-200 hover:text-primary-300 font-medium"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-secondary-600 text-sm">
                        Supported formats: .json, .csv, .zip (max 1GB)
                      </p>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-secondary-100 rounded-lg"
                          >
                            <div className="flex items-center">
                              <FileCode2 className="w-4 h-4 text-primary-200 mr-2" />
                              <span className="text-sm text-secondary-950">{file.name}</span>
                              <span className="text-xs text-secondary-600 ml-2">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-secondary-600 hover:text-secondary-950"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-secondary-300">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-secondary-950 hover:bg-secondary-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <AnimatedButton
                    type="submit"
                    disabled={isUploading || selectedFiles.length === 0}
                  >
                    {isUploading ? (
                      <div className="flex items-center">
                        <LoadingSpinner />
                        <span className="ml-2">Publishing...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Publish Dataset
                      </>
                    )}
                  </AnimatedButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DataMarketplacePage;