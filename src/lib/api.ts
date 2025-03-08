import axios from 'axios';

export interface Analysis {
  id: string;
  contractAddress: string;
  riskScore: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  findings: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface DailyMetrics {
  date: string;
  analysisCount: number;
  averageRiskScore: number;
}

// Local data storage
const analyses: Analysis[] = [
  {
    id: '1',
    contractAddress: '0x1234567890abcdef',
    riskScore: 85,
    timestamp: new Date().toISOString(),
    status: 'completed',
    findings: { high: 2, medium: 3, low: 1 }
  },
  {
    id: '2',
    contractAddress: '0xabcdef1234567890',
    riskScore: 45,
    timestamp: new Date().toISOString(),
    status: 'completed',
    findings: { high: 0, medium: 2, low: 3 }
  }
];

const dailyMetrics: DailyMetrics[] = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  analysisCount: Math.floor(Math.random() * 50) + 10,
  averageRiskScore: Math.floor(Math.random() * 40) + 30
}));

export const fetchAnalyses = async (): Promise<Analysis[]> => {
  return Promise.resolve([...analyses]);
};

export const fetchDailyMetrics = async (): Promise<DailyMetrics[]> => {
  return Promise.resolve([...dailyMetrics]);
};

export const createAnalysis = async (data: Partial<Analysis>): Promise<Analysis> => {
  const newAnalysis: Analysis = {
    id: Math.random().toString(36).substr(2, 9),
    contractAddress: data.contractAddress || '',
    riskScore: data.riskScore || 0,
    timestamp: new Date().toISOString(),
    status: 'completed',
    findings: data.findings || { high: 0, medium: 0, low: 0 }
  };
  
  analyses.push(newAnalysis);
  return Promise.resolve(newAnalysis);
};

// Mock dataset storage
const datasets: any[] = [];

export const publishDataset = async (data: FormData): Promise<{ success: boolean; datasetId: string }> => {
  try {
    // Simulate API request delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create a new dataset object
    const dataset = {
      id: Math.random().toString(36).substr(2, 9),
      title: data.get('title'),
      description: data.get('description'),
      language: data.get('language'),
      sourceType: data.get('sourceType'),
      category: data.get('category'),
      price: data.get('price'),
      downloads: '0',
      rating: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      author: 'Current User',
      files: Array.from(data.getAll('files')).map(file => ({
        name: (file as File).name,
        size: (file as File).size
      }))
    };

    // Add to mock storage
    datasets.push(dataset);

    return {
      success: true,
      datasetId: dataset.id
    };
  } catch (error) {
    console.error('Error publishing dataset:', error);
    throw new Error('Failed to publish dataset');
  }
};