import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
  ma7: number;
  ma25: number;
  ma99: number;
  rsi: number;
  macd: number;
  signal: number;
  histogram: number;
}

interface TokenPriceAnalysisProps {
  data: PriceData[];
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  onTimeframeChange: (timeframe: string) => void;
}

const timeframes = [
  { label: '1H', value: '1h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '1Y', value: '1y' },
  { label: 'ALL', value: 'all' },
];

const indicators = [
  { label: 'Moving Averages', value: 'ma' },
  { label: 'RSI', value: 'rsi' },
  { label: 'MACD', value: 'macd' },
  { label: 'Volume', value: 'volume' },
];

export function TokenPriceAnalysis({
  data,
  symbol,
  currentPrice,
  priceChange24h,
  marketCap,
  volume24h,
  onTimeframeChange,
}: TokenPriceAnalysisProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedIndicators, setSelectedIndicators] = useState(['ma']);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    onTimeframeChange(timeframe);
  };

  const formatValue = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-6">
        {/* Price Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Price Analysis</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${currentPrice.toFixed(6)}</span>
              <span className={`flex items-center ${
                priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {priceChange24h >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                {Math.abs(priceChange24h).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${
                chartType === 'line'
                  ? 'bg-primary-200 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={`p-2 rounded ${
                chartType === 'candlestick'
                  ? 'bg-primary-200 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeframe Selection */}
        <div className="flex flex-wrap gap-2">
          {timeframes.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleTimeframeChange(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === value
                  ? 'bg-primary-200 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Price Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => format(value, 'MMM d, HH:mm')}
              />
              <YAxis
                yAxisId="price"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `$${value.toFixed(6)}`}
              />
              {selectedIndicators.includes('volume') && (
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  tickFormatter={formatValue}
                />
              )}
              <Tooltip
                formatter={(value: number, name: string) => {
                  switch (name) {
                    case 'price':
                      return [`$${value.toFixed(6)}`, `${symbol} Price`];
                    case 'volume':
                      return [formatValue(value), 'Volume'];
                    case 'MA7':
                    case 'MA25':
                    case 'MA99':
                      return [`$${value.toFixed(6)}`, name];
                    case 'RSI':
                      return [value.toFixed(2), 'RSI'];
                    case 'MACD':
                    case 'Signal':
                    case 'Histogram':
                      return [value.toFixed(6), name];
                    default:
                      return [value, name];
                  }
                }}
                labelFormatter={(label) => format(label, 'MMM d, yyyy HH:mm')}
              />
              <Legend />

              {/* Price Line */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#a8e6cf"
                dot={false}
                yAxisId="price"
              />

              {/* Moving Averages */}
              {selectedIndicators.includes('ma') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="ma7"
                    stroke="#ff8b94"
                    dot={false}
                    yAxisId="price"
                    name="MA7"
                  />
                  <Line
                    type="monotone"
                    dataKey="ma25"
                    stroke="#ffd3b6"
                    dot={false}
                    yAxisId="price"
                    name="MA25"
                  />
                  <Line
                    type="monotone"
                    dataKey="ma99"
                    stroke="#dcedc1"
                    dot={false}
                    yAxisId="price"
                    name="MA99"
                  />
                </>
              )}

              {/* Volume */}
              {selectedIndicators.includes('volume') && (
                <Area
                  type="monotone"
                  dataKey="volume"
                  fill="#a8e6cf33"
                  stroke="#a8e6cf"
                  yAxisId="volume"
                  name="Volume"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Technical Indicators Selection */}
        <div className="flex flex-wrap gap-4">
          {indicators.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => toggleIndicator(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedIndicators.includes(value)
                  ? 'bg-primary-200 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Price Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary-100 rounded-lg">
          <div>
            <p className="text-sm text-secondary-600">Market Cap</p>
            <p className="text-lg font-bold">{formatValue(marketCap)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">24h Volume</p>
            <p className="text-lg font-bold">{formatValue(volume24h)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">Volume/Market Cap</p>
            <p className="text-lg font-bold">
              {((volume24h / marketCap) * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">Last Updated</p>
            <p className="text-lg font-bold flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {format(new Date(), 'HH:mm:ss')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}