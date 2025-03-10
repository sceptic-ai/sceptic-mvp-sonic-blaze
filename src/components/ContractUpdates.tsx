import React, { useEffect, useState, ReactElement } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getContractUpdates, ContractUpdate } from '../lib/api';
import { Clock, ExternalLink } from 'lucide-react';

export function ContractUpdates(): ReactElement {
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['contractUpdates'],
    queryFn: () => getContractUpdates(5),
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-primary-200" />
        Recent Contract Updates
      </h2>
      
      {updates.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          No recent contract updates
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium truncate">
                    Contract: {update.contract_type}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    Address: {update.address?.substring(0, 10)}...
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(update.timestamp), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
                {update.transaction_hash && (
                  <a 
                    href={`https://testnet.sonicscan.org/tx/${update.transaction_hash}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 