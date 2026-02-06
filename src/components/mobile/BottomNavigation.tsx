'use client';

import { Home, TreeDeciduous, BarChart3, User } from 'lucide-react';
import { motion } from 'framer-motion';

type Screen = 'home' | 'techTree' | 'progress' | 'profile';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems = [
  { id: 'home' as Screen, icon: Home, label: '홈' },
  { id: 'techTree' as Screen, icon: TreeDeciduous, label: '테크트리' },
  { id: 'progress' as Screen, icon: BarChart3, label: '진행' },
  { id: 'profile' as Screen, icon: User, label: '프로필' },
];

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-100 z-50">
      <div className="flex items-center justify-around py-2 pb-6">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center gap-1 px-4 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-emerald-50 rounded-2xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon
                className={`relative z-10 w-6 h-6 transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                }`}
              />
              <span
                className={`relative z-10 text-xs font-medium transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
