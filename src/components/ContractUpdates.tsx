import React, { useEffect, useState, ReactElement } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getContractUpdates, ContractUpdate } from '../lib/api';
import { Clock, ExternalLink } from 'lucide-react';

export function ContractUpdates(): ReactElement {
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['contractUpdates'],
    queryFn: getContractUpdates,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-primary-200" />
          Recent Contract Updates
        </h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-primary-200" />
          Recent Contract Updates
        </h2>
        <p className="text-gray-500 text-center py-8">No contract updates yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-primary-200" />
        Recent Contract Updates
      </h2>
      
      <div className="space-y-4">
        {updates.slice(0, 5).map((update, index) => (
          <div 
            key={index} 
            className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-medium">Project: {update.project_name}</h3>
              <span className="text-xs text-gray-500">
                {format(new Date(update.timestamp), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            
            <div className="font-mono text-xs text-gray-600 mb-1 truncate">
              Contract: {update.contract_address}
            </div>
            
            <div className="flex items-center">
              <span className="font-mono text-xs text-gray-600 truncate flex-1">
                Tx: {update.tx_hash}
              </span>
              <a 
                href={`https://testnet.sonicscan.org/tx/${update.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-200 hover:text-primary-300 ml-2"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 