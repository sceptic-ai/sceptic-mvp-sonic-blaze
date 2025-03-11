import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Code2, 
  LineChart, 
  Database,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { createParticles } from '../components/ClickParticles';
import { LogoAnimation } from '../components/LogoAnimation';
import { ContractInteraction } from '../components/ContractInteraction.tsx';

const features = [
  {
    icon: Code2,
    title: 'AI Code Detection',
    description: 'Advanced machine learning algorithms to detect AI-generated code across multiple programming languages.',
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    description: 'Comprehensive risk assessment of code repositories, analyzing security vulnerabilities and code quality.',
  },
  {
    icon: LineChart,
    title: 'Real-time Analysis',
    description: 'Instant analysis results with detailed metrics and visualizations for both traditional and blockchain code.',
  },
  {
    icon: Database,
    title: 'Immutable Audit Logs',
    description: 'Blockchain-backed audit trail for all analysis results, ensuring transparency and accountability.',
  },
];

const useCases = [
  {
    title: 'For VCs & Investors',
    benefits: [
      'Technical due diligence automation',
      'Codebase quality assessment',
      'Portfolio monitoring',
    ],
  },
  {
    title: 'For Developers',
    benefits: [
      'Code quality verification',
      'Security vulnerability detection',
      'Best practices compliance',
    ],
  },
  {
    title: 'For Projects',
    benefits: [
      'Trust building',
      'Continuous monitoring',
      'Regulatory compliance',
    ],
  },
];

function HomePage() {
  const handleHeroClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) {
      createParticles(e);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-secondary-50 border-b border-secondary-300 overflow-hidden">
        <div className="container mx-auto px-4 py-24 relative">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary-200">
                AI-Powered Code Analysis Platform
              </h1>
              <p className="text-xl md:text-2xl text-secondary-950 mb-8">
                Detect AI-generated code, assess quality risks, and protect your investments with advanced code analysis for both traditional and blockchain projects.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/analysis" className="btn-primary text-lg">
                  Start Analysis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <a href="#features" className="btn-outline text-lg">
                  Learn More
                </a>
              </div>
            </div>
            <div className="flex-1 relative w-full h-[500px]">
              <LogoAnimation className="opacity-100" />
            </div>
          </div>
        </div>
      </section>

      {/* Smart Contract Interaction Section */}
      <section className="py-16 bg-secondary-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Smart Contract Dashboard</h2>
            <p className="text-center text-gray-600 mb-12">
              Interact with our deployed ScepticSimple contract on the Sonic Network.
              Connect your wallet to view and update the project name if you're the contract owner.
            </p>
            
            <ContractInteraction />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-secondary-50 border-b border-secondary-300">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-primary-200">
            Powerful Features for Code Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card p-6">
                <feature.icon className="w-12 h-12 text-primary-200 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-primary-200">{feature.title}</h3>
                <p className="text-secondary-950">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-secondary-50 border-b border-secondary-300">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-primary-200">
            How Sceptic AI Works
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute left-8 top-0 h-full w-0.5 bg-primary-200" />
              {[
                'Submit your code repository or GitHub URL',
                'Our AI analyzes the codebase and identifies patterns',
                'Receive detailed analysis and risk assessment',
                'View immutable audit logs on the blockchain',
              ].map((step, index) => (
                <div key={index} className="relative flex items-center mb-8">
                  <div className="absolute left-8 -translate-x-1/2 w-4 h-4 rounded-full bg-primary-200" />
                  <div className="ml-16">
                    <p className="text-lg font-medium text-secondary-950">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-secondary-50 border-b border-secondary-300">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-primary-200">
            Who Can Benefit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="card p-8">
                <h3 className="text-2xl font-bold mb-6 text-primary-200">{useCase.title}</h3>
                <ul className="space-y-4">
                  {useCase.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center text-secondary-950">
                      <CheckCircle2 className="w-5 h-5 text-primary-200 mr-2" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-secondary-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-200">
            Ready to Analyze Your Code?
          </h2>
          <p className="text-xl text-secondary-950 mb-8 max-w-2xl mx-auto">
            Start analyzing your codebase today and ensure quality, security, and reliability with our advanced AI-powered platform.
          </p>
          <Link to="/analysis" className="btn-primary text-lg">
            Get Started Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;