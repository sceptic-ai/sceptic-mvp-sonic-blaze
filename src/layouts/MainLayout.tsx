import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Search, 
  Coins,
  ShoppingBag, 
  Vote, 
  User,
  Menu,
  X,
  Wallet,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LogoAnimation } from '../components/LogoAnimation';
import { useWallet } from '../contexts/WalletContext';
import { AnimatedButton } from '../components/AnimatedButton';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Code Analysis', href: '/analysis', icon: Search },
  { name: 'Token Analysis', href: '/token-analysis', icon: Coins },
  { name: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { name: 'DAO', href: '/dao', icon: Vote },
  { name: 'Profile', href: '/profile', icon: User },
];

function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const { address, openModal, disconnect } = useWallet();

  return (
    <div className="min-h-screen flex flex-col bg-secondary-50 relative">
      <LogoAnimation className="opacity-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary-50/80 backdrop-blur-sm border-b border-secondary-300">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between relative">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 relative">
              <span className="absolute inset-0 font-grotesk font-bold text-3xl text-primary-200 transform -rotate-90 flex items-center justify-center">
                S
              </span>
            </div>
            <span className="font-grotesk font-bold text-xl text-secondary-950">Sceptic AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-1 text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "text-primary-200"
                    : "text-secondary-950 hover:text-primary-200"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}

            {address ? (
              <div className="flex items-center space-x-2 ml-6">
                <span className="text-sm font-medium text-secondary-950 bg-secondary-100 px-3 py-1.5 rounded-lg">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="p-2 text-secondary-950 hover:text-primary-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <AnimatedButton onClick={openModal} className="ml-6">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </AnimatedButton>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {address ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-secondary-950 bg-secondary-100 px-2 py-1 rounded-lg">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="p-1.5 text-secondary-950 hover:text-primary-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <AnimatedButton onClick={openModal} variant="outline" className="!py-1.5 !px-3">
                <Wallet className="w-4 h-4" />
              </AnimatedButton>
            )}
            <button
              className="text-secondary-950 p-1.5"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-secondary-50 border-t border-secondary-300">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-secondary-100 text-primary-200"
                    : "text-secondary-950 hover:bg-secondary-100 hover:text-primary-200"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-secondary-50 text-secondary-950 py-12 border-t border-secondary-300 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-12 h-12 relative">
                  <span className="absolute inset-0 font-grotesk font-bold text-3xl text-primary-200 transform -rotate-90 flex items-center justify-center">
                    S
                  </span>
                </div>
                <h3 className="font-grotesk text-lg font-bold text-primary-200">Sceptic AI</h3>
              </div>
              <p className="text-secondary-950">
                AI-powered code analysis and fraud detection platform for the blockchain ecosystem.
              </p>
            </div>
            <div>
              <h4 className="font-grotesk text-sm font-bold mb-4 text-primary-200">Quick Links</h4>
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-secondary-950 hover:text-primary-200 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-grotesk text-sm font-bold mb-4 text-primary-200">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-secondary-950 hover:text-primary-200 transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary-950 hover:text-primary-200 transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary-950 hover:text-primary-200 transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-grotesk text-sm font-bold mb-4 text-primary-200">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-secondary-950 hover:text-primary-200 transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary-950 hover:text-primary-200 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary-950 hover:text-primary-200 transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-secondary-300 text-center text-secondary-950">
            <p>&copy; {new Date().getFullYear()} Sceptic AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;