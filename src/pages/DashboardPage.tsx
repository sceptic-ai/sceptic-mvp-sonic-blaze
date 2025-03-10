import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  BarChart3,
  Users,
  GitPullRequest,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { format } from 'date-fns';
import { fetchAnalyses, fetchDailyMetrics } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import { NetworkInfo } from '../components/NetworkInfo';
import { ContractInteraction } from '../components/ContractInteraction';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function DashboardPage() {
  const { address } = useWallet();

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses'],
    queryFn: fetchAnalyses
  });

  const { data: dailyMetrics = [] } = useQuery({
    queryKey: ['dailyMetrics'],
    queryFn: fetchDailyMetrics
  });

  // Transform the data to match the original format for the metrics display
  const transformedAnalyses = analyses.map((analysis: any) => ({
    id: analysis.id,
    contractAddress: analysis.repoUrl || 'Unknown',
    riskScore: analysis.result?.risk_score || 0,
    findings: {
      high: analysis.result?.security_analysis?.vulnerabilities?.filter((v: any) => v.risk === 'high').length || 0,
      medium: analysis.result?.security_analysis?.vulnerabilities?.filter((v: any) => v.risk === 'medium').length || 0,
      low: analysis.result?.security_analysis?.vulnerabilities?.filter((v: any) => v.risk === 'low').length || 0
    }
  }));

  const metrics = [
    {
      title: 'Total Analyses',
      value: analyses.length.toString(),
      change: '+12.3%',
      icon: LineChart,
    },
    {
      title: 'Average Risk Score',
      value: transformedAnalyses.length > 0
        ? (transformedAnalyses.reduce((acc, curr) => acc + curr.riskScore, 0) / transformedAnalyses.length).toFixed(1)
        : '0',
      change: '-2.1%',
      icon: BarChart3,
    },
    {
      title: 'High Severity Findings',
      value: transformedAnalyses.reduce((acc, curr) => acc + curr.findings.high, 0).toString(),
      change: '+5.4%',
      icon: AlertTriangle,
    },
    {
      title: 'Analysis Success Rate',
      value: analyses.length > 0
        ? ((analyses.filter((a: any) => a.status === 'completed').length / analyses.length) * 100).toFixed(1) + '%'
        : '0%',
      change: '+8.7%',
      icon: CheckCircle,
    },
  ];

  const chartData = {
    labels: dailyMetrics.map(m => format(new Date(m.date), 'MMM d')),
    datasets: [
      {
        label: 'Analysis Count',
        data: dailyMetrics.map(m => m.analysisCount),
        borderColor: '#a8e6cf',
        backgroundColor: '#a8e6cf33',
        fill: true,
      },
      {
        label: 'Average Risk Score',
        data: dailyMetrics.map(m => m.averageRiskScore),
        borderColor: '#ff8b94',
        backgroundColor: '#ff8b9433',
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-700">{metric.title}</h3>
              <metric.icon className="w-8 h-8 text-primary-200" />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{metric.value}</div>
              <div className={`flex items-center ${
                metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change.startsWith('+') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                  </svg>
                )}
                {metric.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Analysis Trends</h2>
            <div className="h-80">
              <Line 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
        
        <div>
          <NetworkInfo />
          <ContractInteraction />
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="bg-white rounded-lg p-6 shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary-100">
                <th className="py-3 px-4 text-left font-semibold text-secondary-950">Contract</th>
                <th className="py-3 px-4 text-left font-semibold text-secondary-950">Risk Score</th>
                <th className="py-3 px-4 text-left font-semibold text-secondary-950">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-secondary-950">Date</th>
                <th className="py-3 px-4 text-left font-semibold text-secondary-950">Findings</th>
              </tr>
            </thead>
            <tbody>
              {transformedAnalyses.slice(0, 5).map((analysis, index) => (
                <tr key={analysis.id} className="border-b border-secondary-200">
                  <td className="py-3 px-4 text-secondary-950 font-mono">
                    {analysis.contractAddress.slice(0, 20)}...
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      analysis.riskScore >= 90 
                        ? 'bg-red-100 text-red-800'
                        : analysis.riskScore >= 70
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {analysis.riskScore}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-secondary-950">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      analyses[index].status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : analyses[index].status === 'pending'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {analyses[index].status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-secondary-950">
                    {format(new Date(analyses[index].timestamp), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">{analysis.findings.high} High</span>
                      <span className="text-yellow-600">{analysis.findings.medium} Med</span>
                      <span className="text-green-600">{analysis.findings.low} Low</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;