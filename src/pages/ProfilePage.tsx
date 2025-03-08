import React from 'react';
import { 
  User,
  Mail,
  Bell,
  Shield,
  Key,
  Download,
  ExternalLink
} from 'lucide-react';

function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-gray-600">
            Manage your account preferences and security settings
          </p>
        </div>

        {/* Profile Information */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                className="input"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="input"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                className="input"
                placeholder="Tell us about yourself..."
              />
            </div>
            <button className="btn-primary">
              Save Changes
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </h2>
          <div className="space-y-4">
            {[
              'Email notifications for new analysis results',
              'Security alerts and warnings',
              'Newsletter and updates',
              'DAO proposal notifications',
            ].map((setting) => (
              <div key={setting} className="flex items-center justify-between">
                <span className="text-gray-700">{setting}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Security Settings */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Settings
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Change Password</h3>
              <div className="space-y-4">
                <input
                  type="password"
                  className="input"
                  placeholder="Current Password"
                />
                <input
                  type="password"
                  className="input"
                  placeholder="New Password"
                />
                <input
                  type="password"
                  className="input"
                  placeholder="Confirm New Password"
                />
                <button className="btn-primary">
                  Update Password
                </button>
              </div>
            </div>
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
              <p className="text-gray-600 mb-4">
                Add an extra layer of security to your account
              </p>
              <button className="btn-outline">
                <Key className="w-4 h-4 mr-2" />
                Enable 2FA
              </button>
            </div>
          </div>
        </div>

        {/* API Access */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            API Access
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              Generate API keys to access Sceptic AI's analysis capabilities programmatically
            </p>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Production API Key</p>
                <p className="text-gray-600 text-sm">Last used: 2 hours ago</p>
              </div>
              <button className="btn-outline">
                <Key className="w-4 h-4 mr-2" />
                Generate New Key
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="btn-primary flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download SDK
              </button>
              <button className="btn-outline flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;