import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingFlow from './src/components/OnboardingFlow';
import HomeScreen from './src/components/mobile/HomeScreen';
import TechTreeScreen from './src/components/mobile/TechTreeScreen';
import ProgressScreen from './src/components/mobile/ProgressScreen';
import ProfileScreen from './src/components/mobile/ProfileScreen';
import BottomNavigation from './src/components/mobile/BottomNavigation';

type Screen = 'onboarding' | 'home' | 'techTree' | 'progress' | 'profile';

export interface UserProfile {
  name: string;
  goal: string;
  deadline: string;
  routineTime: string;
  constraints: string;
  currentDay: number;
  streak: number;
  weeklyCompletion: number;
  estimatedGoalDate: string;
  joinedDate: string;
  daysUntilDeadline?: number;
}

export interface Quest {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  alternative?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  description?: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayQuests, setTodayQuests] = useState<Quest[]>([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedProfile = localStorage.getItem('ltr_profile');
    const savedQuests = localStorage.getItem('ltr_quests');
    const customized = localStorage.getItem('ltr_customized');

    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setIsCustomized(customized === 'true');
    } else {
      // Default guest profile
      const defaultProfile: UserProfile = {
        name: '게스트',
        goal: '하루 하루 성장하기',
        deadline: '무제한',
        routineTime: 'morning',
        constraints: '없음',
        currentDay: 1,
        streak: 0,
        weeklyCompletion: 0,
        estimatedGoalDate: '지속적',
        joinedDate: new Date().toISOString().split('T')[0],
      };
      setUserProfile(defaultProfile);
    }

    if (savedQuests) {
      setTodayQuests(JSON.parse(savedQuests));
    } else {
      // Default quests
      const defaultQuests: Quest[] = [
        {
          id: '1',
          title: '오늘의 목표 설정하기',
          duration: '5분',
          completed: false,
          timeOfDay: 'morning',
          description: '하루를 시작하기 전 목표를 정해보세요',
        },
        {
          id: '2',
          title: '집중 시간 갖기',
          duration: '25분',
          completed: false,
          timeOfDay: 'afternoon',
          description: '포모도로 타이머로 집중해보세요',
        },
        {
          id: '3',
          title: '하루 되돌아보기',
          duration: '10분',
          completed: false,
          timeOfDay: 'evening',
          description: '오늘 무엇을 이뤘는지 기록해보세요',
        },
      ];
      setTodayQuests(defaultQuests);
    }

    setIsLoading(false);
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    const newProfile = {
      ...profile,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    setUserProfile(newProfile);
    setIsCustomized(true);
    localStorage.setItem('ltr_profile', JSON.stringify(newProfile));
    localStorage.setItem('ltr_customized', 'true');

    // Generate customized quests
    const customQuests: Quest[] = [
      {
        id: '1',
        title: `${profile.goal} 첫 걸음`,
        duration: '30분',
        completed: false,
        alternative: '5분 브레인덤프',
        timeOfDay: profile.routineTime === 'morning' ? 'morning' : 'evening',
        description: '오늘 할 수 있는 가장 작은 행동부터 시작하세요',
      },
      {
        id: '2',
        title: '집중 세션',
        duration: '25분',
        completed: false,
        timeOfDay: 'afternoon',
        description: '타이머 맞추고 목표에 집중하세요',
      },
      {
        id: '3',
        title: '하루 기록하기',
        duration: '10분',
        completed: false,
        timeOfDay: 'evening',
        description: '오늘의 진전을 기록하세요',
      },
    ];

    setTodayQuests(customQuests);
    localStorage.setItem('ltr_quests', JSON.stringify(customQuests));
    setCurrentScreen('home');
  };

  const handleStartCustomization = () => {
    setCurrentScreen('onboarding');
  };

  const handleQuestToggle = (questId: string) => {
    if (!userProfile) return;

    const updatedQuests = todayQuests.map((q) =>
      q.id === questId ? { ...q, completed: !q.completed } : q
    );
    setTodayQuests(updatedQuests);
    localStorage.setItem('ltr_quests', JSON.stringify(updatedQuests));

    // Update streak if all quests completed
    const allCompleted = updatedQuests.every((q) => q.completed);
    if (allCompleted && !todayQuests.every((q) => q.completed)) {
      const updatedProfile = {
        ...userProfile,
        currentDay: userProfile.currentDay + 1,
        streak: userProfile.streak + 1,
        weeklyCompletion: Math.min(100, userProfile.weeklyCompletion + 14),
      };
      setUserProfile(updatedProfile);
      localStorage.setItem('ltr_profile', JSON.stringify(updatedProfile));
    }
  };

  const completedCount = todayQuests.filter((q) => q.completed).length;
  const totalCount = todayQuests.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 max-w-[430px] mx-auto">
      {/* Status Bar */}
      {currentScreen !== 'onboarding' && (
        <div className="fixed top-0 left-0 right-0 max-w-[430px] mx-auto h-11 bg-white z-50 flex items-center justify-between px-6 text-sm">
          <span className="font-semibold">
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-600">LTR</span>
            <div className="w-6 h-3 bg-emerald-500 rounded-sm flex items-center justify-end pr-0.5">
              <div className="w-0.5 h-2 bg-emerald-700 rounded-full" />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentScreen === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </motion.div>
        )}

        {currentScreen === 'home' && userProfile && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-11 pb-24"
          >
            <HomeScreen
              profile={userProfile}
              quests={todayQuests}
              onQuestToggle={handleQuestToggle}
              completionRate={completionRate}
            />
          </motion.div>
        )}

        {currentScreen === 'techTree' && userProfile && (
          <motion.div
            key="techTree"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-11 pb-24"
          >
            <TechTreeScreen profile={userProfile} />
          </motion.div>
        )}

        {currentScreen === 'progress' && userProfile && (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-11 pb-24"
          >
            <ProgressScreen
              profile={userProfile}
              completionRate={completionRate}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          </motion.div>
        )}

        {currentScreen === 'profile' && userProfile && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-11 pb-24"
          >
            <ProfileScreen
              profile={userProfile}
              onStartCustomization={handleStartCustomization}
              isCustomized={isCustomized}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {currentScreen !== 'onboarding' && (
        <BottomNavigation
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen as Screen)}
        />
      )}
    </div>
  );
}
