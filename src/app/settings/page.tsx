'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, Moon, Sun, Bell, Shield, LogOut } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || 'User'} 
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-accent-primary" />
            </div>
          )}
          <div>
            <div className="font-medium text-text-primary">{session?.user?.name || 'User'}</div>
            <div className="text-sm text-text-secondary">{session?.user?.email}</div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-accent-primary" /> : <Sun className="w-5 h-5 text-accent-primary" />}
          <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-text-primary">Theme</div>
            <div className="text-sm text-text-secondary">Choose your preferred color scheme</div>
          </div>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              theme === 'dark' 
                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary' 
                : 'bg-background-tertiary border-border text-text-primary'
            }`}
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-text-primary">Email Notifications</div>
            <div className="text-sm text-text-secondary">Receive updates about your experiments</div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full transition-colors ${
              notifications ? 'bg-accent-primary' : 'bg-background-tertiary'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              notifications ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Security</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-text-primary">Two-Factor Authentication</div>
              <div className="text-sm text-text-secondary">Add an extra layer of security</div>
            </div>
            <button className="btn-secondary text-sm">
              Enable
            </button>
          </div>
          
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 text-accent-danger hover:text-accent-danger/80 transition-colors"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">About</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>Nova Research v1.0.0</p>
          <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
          <p>Powered by Claude Agent SDK</p>
        </div>
      </div>
    </div>
  );
}