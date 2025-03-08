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
import { useWeb3Store } from '../lib/web3';

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
  const { address, connect } = useWeb3Store();

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses'],
    queryFn: fetchAnalyses
  });

  const { data: dailyMetrics = [] } = useQuery({
    queryKey: ['dailyMetrics'],
    queryFn: fetchDailyMetrics
  });

  const metrics = [
    {
      title: 'Total Analyses',
      value: analyses.length.toString(),
      change: '+12.3%',
      icon: LineChart,
    },
    {
      title: 'Average Risk Score',
      value: analyses.length > 0
        ? (analyses.reduce((acc, curr) => acc + curr.riskScore, 0) / analyses.length).toFixed(1)
        : '0',
      change: '-2.1%',
      icon: BarChart3,
    },
    {
      title: 'High Severity Findings',
      value: analyses.reduce((acc, curr) => acc + curr.findings.high, 0).toString(),
      change: '+5.4%',
      icon: AlertTriangle,
    },
    {
      title: 'Analysis Success Rate',
      value: analyses.length > 0
        ? ((analyses.filter(a => a.status === 'completed').length / analyses.length) * 100).toFixed(1) + '%'
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
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-primary-200">Dashboard</h1>
            <p className="text-secondary-950">Monitor your analysis metrics and project insights</p>
          </div>
          {!address ? (
            <button onClick={() => connect()} className="btn-primary">
              Connect Wallet
            </button>
          ) : (
            <div className="text-secondary-950">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.title} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-secondary-950 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-primary-200">{metric.value}</p>
                </div>
                <metric.icon className="w-6 h-6 text-primary-200" />
              </div>
              <div className="mt-2">
                <span className={`text-sm ${
                  metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
                <span className="text-sm text-secondary-950"> vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 text-primary-200">Analysis Trends</h2>
          <div className="h-[400px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Analysis */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 text-primary-200">Recent Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-300">
                  <th className="text-left py-3 px-4 text-secondary-950">Contract Address</th>
                  <th className="text-left py-3 px-4 text-secondary-950">Risk Score</th>
                  <th className="text-left py-3 px-4 text-secondary-950">Date</th>
                  <th className="text-left py-3 px-4 text-secondary-950">Status</th>
                  <th className="text-left py-3 px-4 text-secondary-950">Findings</th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(0, 5).map((analysis) => (
                  <tr key={analysis.id} className="border-b border-secondary-200">
                    <td className="py-3 px-4 text-secondary-950 font-mono">
                      {analysis.contractAddress.slice(0, 8)}...{analysis.contractAddress.slice(-6)}
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
                      {format(new Date(analysis.timestamp), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center">
                        {analysis.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        ) : analysis.status === 'failed' ? (
                          <XCircle className="w-4 h-4 text-red-600 mr-1" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-600 mr-1" />
                        )}
                        <span className={`text-sm ${
                          analysis.status === 'completed'
                            ? 'text-green-600'
                            : analysis.status === 'failed'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}>
                          {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                        </span>
                      </span>
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
    </div>
  );
}

export default DashboardPage;