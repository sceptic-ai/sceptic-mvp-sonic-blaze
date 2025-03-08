import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Copy, 
  ExternalLink, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Coins,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { fadeIn, slideUp } from '../lib/animations';
import { TokenPriceAnalysis } from '../components/TokenPriceAnalysis';
import { blockchainClient, type TokenData } from '../lib/sonic';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';

const networks = [
  { id: '1', name: 'Ethereum', icon: '🌐' },
  { id: '56', name: 'BSC', icon: '💎' },
  { id: '137', name: 'Polygon', icon: '🟣' },
  { id: '43114', name: 'Avalanche', icon: '❄️' },
  { id: '42161', name: 'Arbitrum', icon: '🔵' },
  { id: '10', name: 'Optimism', icon: '🔴' },
];

function TokenAnalysisPage() {
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]);
  const [tokenAddress, setTokenAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAddress) return;

    setIsLoading(true);
    try {
      const data = await blockchainClient.getTokenData(selectedNetwork.id, tokenAddress);
      setTokenData(data);
      toast.success('Token data loaded successfully');
    } catch (error) {
      console.error('Error fetching token data:', error);
      toast.error('Failed to load token data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      {...fadeIn}
    >
      <motion.div 
        className="max-w-6xl mx-auto"
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <motion.div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-200">
            Token Analysis
          </h1>
          <p className="text-xl text-secondary-950">
            Analyze any token across multiple blockchain networks
          </p>
        </motion.div>

        {/* Search Form */}
        <div className="card p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Network Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary-950 mb-2">
                  Network
                </label>
                <div className="relative">
                  <select
                    className="input pl-8"
                    value={selectedNetwork.id}
                    onChange={(e) => setSelectedNetwork(
                      networks.find(n => n.id === e.target.value) || networks[0]
                    )}
                  >
                    {networks.map((network) => (
                      <option key={network.id} value={network.id}>
                        {network.icon} {network.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Token Address Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-secondary-950 mb-2">
                  Token Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Enter token contract address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-600" />
                </div>
              </div>
            </div>

            <AnimatedButton
              type="submit"
              className="w-full md:w-auto"
              disabled={isLoading || !tokenAddress}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner />
                  <span className="ml-2">Analyzing...</span>
                </div>
              ) : (
                <>
                  <Coins className="w-5 h-5 mr-2" />
                  Analyze Token
                </>
              )}
            </AnimatedButton>
          </form>
        </div>

        {/* Token Data */}
        {tokenData && (
          <div className="space-y-8">
            {/* Token Summary Card */}
            <div className="card p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                {/* Basic Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-2xl font-bold">{tokenData.name}</h2>
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                      {tokenData.symbol}
                    </span>
                    {tokenData.contractVerified && (
                      <span className="flex items-center text-green-600">
                        <Shield className="w-4 h-4 mr-1" />
                        Verified
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-secondary-600 mb-4">
                    <span className="font-mono text-sm">{tokenData.address}</span>
                    <button 
                      onClick={() => copyToClipboard(tokenData.address)}
                      className="p-1 hover:text-primary-200 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a 
                      href={`https://etherscan.io/token/${tokenData.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:text-primary-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-secondary-600">Total Supply</p>
                      <p className="text-lg font-bold">{Number(tokenData.totalSupply).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-600">Holders</p>
                      <p className="text-lg font-bold">{tokenData.holders.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-600">Decimals</p>
                      <p className="text-lg font-bold">{tokenData.decimals}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex-1">
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm text-secondary-600">Current Price</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold">${tokenData.price.toFixed(6)}</p>
                        <span className={`flex items-center ${
                          tokenData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tokenData.priceChange24h >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 mr-1" />
                          )}
                          {Math.abs(tokenData.priceChange24h).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary-600">Market Cap</p>
                        <p className="text-lg font-bold">${tokenData.marketCap.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary-600">24h Volume</p>
                        <p className="text-lg font-bold">${tokenData.volume24h.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Analysis */}
            <TokenPriceAnalysis
              data={tokenData.priceHistory}
              symbol={tokenData.symbol}
              currentPrice={tokenData.price}
              priceChange24h={tokenData.priceChange24h}
              marketCap={tokenData.marketCap}
              volume24h={tokenData.volume24h}
              onTimeframeChange={(timeframe) => {
                console.log('Timeframe changed:', timeframe);
              }}
            />

            {/* Recent Transactions */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">Recent Transactions</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">From</th>
                      <th className="text-left py-3 px-4">To</th>
                      <th className="text-left py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenData.transactions.slice(0, 5).map((tx) => (
                      <tr key={tx.hash} className="border-b border-secondary-200">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === 'buy'
                              ? 'bg-green-100 text-green-800'
                              : tx.type === 'sell'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {Number(tx.value).toLocaleString()} {tokenData.symbol}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                        </td>
                        <td className="py-3 px-4">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Holders */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">Top Token Holders</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-3 px-4">Rank</th>
                      <th className="text-left py-3 px-4">Address</th>
                      <th className="text-left py-3 px-4">Balance</th>
                      <th className="text-left py-3 px-4">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenData.topHolders.map((holder, index) => (
                      <tr key={holder.address} className="border-b border-secondary-200">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4 font-mono">
                          {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                        </td>
                        <td className="py-3 px-4">
                          {Number(holder.balance).toLocaleString()} {tokenData.symbol}
                        </td>
                        <td className="py-3 px-4">
                          {holder.percentage.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default TokenAnalysisPage;