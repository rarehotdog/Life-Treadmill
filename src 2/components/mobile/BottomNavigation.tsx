import { Home, Map, BarChart3, User } from 'lucide-react';
import { motion } from 'motion/react';

type Screen = 'home' | 'techTree' | 'progress' | 'profile';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems = [
  { id: 'home' as Screen, icon: Home, label: 'Home' },
  { id: 'techTree' as Screen, icon: Map, label: 'Journey' },
  { id: 'progress' as Screen, icon: BarChart3, label: 'Progress' },
  { id: 'profile' as Screen, icon: User, label: 'Profile' },
];

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-[#F3F4F6] z-50 safe-bottom">
      <div className="flex items-center justify-around pt-2 pb-5">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center gap-1 px-5 py-1.5"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-purple-50 rounded-2xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon
                className={`relative z-10 w-6 h-6 transition-colors ${
                  isActive ? 'text-[#7C3AED]' : 'text-gray-400'
                }`}
              />
              <span
                className={`relative z-10 text-11 font-medium transition-colors ${
                  isActive ? 'text-[#7C3AED]' : 'text-gray-400'
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
