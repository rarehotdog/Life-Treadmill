import { Home, Map, TrendingUp, User } from 'lucide-react';
import { Button } from '../ui';

type Screen = 'home' | 'techTree' | 'progress' | 'profile';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const tabs = [
    { id: 'home' as Screen, label: 'Home', icon: Home },
    { id: 'techTree' as Screen, label: 'Journey', icon: Map },
    { id: 'progress' as Screen, label: 'Progress', icon: TrendingUp },
    { id: 'profile' as Screen, label: 'Profile', icon: User },
  ];

  return (
    <div
      data-testid="bottom-navigation"
      className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 safe-bottom z-50"
    >
      <div className="flex items-center justify-around h-20 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;

          return (
            <Button
              key={tab.id}
              data-testid={`nav-${tab.id}`}
              onClick={() => onNavigate(tab.id)}
              variant="ghost"
              className="h-full flex-1 flex-col items-center justify-center gap-1 rounded-none"
            >
              <Icon size={24} className={isActive ? 'text-[#7C3AED]' : 'text-gray-400'} strokeWidth={isActive ? 2.4 : 2} />
              <span className={`caption-12 ${isActive ? 'text-[#7C3AED] font-semibold' : 'text-gray-500'}`}>{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
