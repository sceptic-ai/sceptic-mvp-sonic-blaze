import React from 'react';
import { 
  Vote, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react';

const proposals = [
  {
    id: 1,
    title: 'Implement New Risk Assessment Algorithm',
    description: 'Proposal to upgrade the current risk assessment algorithm with improved ML models',
    votes: {
      for: 12500000,
      against: 2500000,
    },
    status: 'Active',
    endDate: '2024-03-20',
  },
  {
    id: 2,
    title: 'Expand Supported Blockchain Networks',
    description: 'Add support for analyzing smart contracts on additional blockchain networks',
    votes: {
      for: 15000000,
      against: 5000000,
    },
    status: 'Active',
    endDate: '2024-03-25',
  },
  {
    id: 3,
    title: 'Token Burn Mechanism Update',
    description: 'Modify the token burn mechanism to improve tokenomics',
    votes: {
      for: 8000000,
      against: 12000000,
    },
    status: 'Ended',
    endDate: '2024-03-01',
  },
];

const stats = [
  {
    title: 'Total Staked',
    value: '45.2M SCEP',
    icon: TrendingUp,
  },
  {
    title: 'Active Voters',
    value: '3,241',
    icon: Users,
  },
  {
    title: 'Active Proposals',
    value: '2',
    icon: Vote,
  },
];

function DAOPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Governance</h1>
        <p className="text-gray-600">
          Participate in Sceptic AI's decentralized governance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Proposals */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Proposals</h2>
        
        {proposals.map((proposal) => {
          const totalVotes = proposal.votes.for + proposal.votes.against;
          const forPercentage = (proposal.votes.for / totalVotes) * 100;
          const againstPercentage = (proposal.votes.against / totalVotes) * 100;

          return (
            <div key={proposal.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{proposal.title}</h3>
                  <p className="text-gray-600">{proposal.description}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  proposal.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {proposal.status === 'Active' ? (
                    <Clock className="w-4 h-4 mr-1" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  {proposal.status}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Votes</span>
                  <span>{proposal.endDate}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600"
                    style={{ width: `${forPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary-600 mr-1" />
                    <span className="font-medium">{forPercentage.toFixed(1)}%</span>
                    <span className="text-gray-600 ml-1">
                      ({(proposal.votes.for / 1000000).toFixed(1)}M SCEP)
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <XCircle className="w-4 h-4 text-red-600 mr-1" />
                    <span className="font-medium">{againstPercentage.toFixed(1)}%</span>
                    <span className="text-gray-600 ml-1">
                      ({(proposal.votes.against / 1000000).toFixed(1)}M SCEP)
                    </span>
                  </div>
                </div>
              </div>

              {proposal.status === 'Active' && (
                <div className="flex gap-4">
                  <button className="btn-primary flex-1">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Vote For
                  </button>
                  <button className="btn-outline flex-1">
                    <XCircle className="w-4 h-4 mr-2" />
                    Vote Against
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DAOPage;