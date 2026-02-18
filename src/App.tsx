import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import OnboardingFlow from './components/OnboardingFlow';
import HomeScreen from './components/mobile/HomeScreen';
import TechTreeScreen from './components/mobile/TechTreeScreen';
import ProgressScreen from './components/mobile/ProgressScreen';
import ProfileScreen from './components/mobile/ProfileScreen';
import BottomNavigation from './components/mobile/BottomNavigation';
import FailureSheet from './components/mobile/FailureSheet';
import EnergyCheckIn from './components/mobile/EnergyCheckIn';
import ShareCard from './components/mobile/ShareCard';
import FutureSelfVisualizer from './components/mobile/FutureSelfVisualizer';
import VoiceCheckIn from './components/mobile/VoiceCheckIn';
import LevelUpModal from './components/gamification/LevelUpModal';
import { isGeminiConfigured } from './lib/gemini';
import { useAppOrchestrator } from './app/hooks/useAppOrchestrator';
import type { Screen } from './types/app';

export type { Quest, UserProfile } from './types/app';

export default function App() {
  const app = useAppOrchestrator();
  const [clockLabel, setClockLabel] = useState(() =>
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setClockLabel(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  if (app.isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="app-shell" className="app-shell">
      {app.currentScreen !== 'onboarding' ? (
        <div data-testid="top-system-bar" className="top-system-bar flex items-center justify-between px-6 body-14">
          <span className="font-semibold text-gray-900">
            {clockLabel}
          </span>
          <div className="flex items-center gap-2">
            <span className="caption-11 font-semibold text-[#7C3AED]">Lv.{app.stats.level}</span>
            <div className="w-6 h-3 bg-[#7C3AED] rounded-sm flex items-center justify-end pr-0.5">
              <div className="w-0.5 h-2 bg-violet-900 rounded-full" />
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {app.currentScreen === 'onboarding' ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OnboardingFlow onComplete={app.handleOnboardingComplete} />
          </motion.div>
        ) : null}

        {app.currentScreen === 'home' && app.userProfile ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <HomeScreen
              profile={app.userProfile}
              quests={app.todayQuests}
              onQuestToggle={app.handleQuestToggle}
              onQuestFail={app.handleQuestFail}
              completionRate={app.completionRate}
              isGeneratingQuests={app.isGeneratingQuests}
              onRegenerateQuests={app.handleRegenerateQuests}
              aiMessage={app.aiMessage}
              isAiEnabled={isGeminiConfigured()}
              stats={app.stats}
              energy={app.energy}
              onOpenShare={() => app.setIsShareOpen(true)}
              onOpenEnergy={() => app.setIsEnergyOpen(true)}
              onOpenFutureSelf={() => app.setIsFutureSelfOpen(true)}
              futureSelfPrompt={app.futureSelfPrompt}
              onOpenVoiceCheckIn={() => app.setIsVoiceCheckInOpen(true)}
              latestVoiceCheckIn={app.latestVoiceCheckIn?.text}
            />
          </motion.div>
        ) : null}

        {app.currentScreen === 'techTree' && app.userProfile ? (
          <motion.div key="techTree" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <TechTreeScreen
              profile={app.userProfile}
              techTree={app.techTree}
              onTechTreeUpdate={app.handleTechTreeUpdate}
            />
          </motion.div>
        ) : null}

        {app.currentScreen === 'progress' && app.userProfile ? (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <ProgressScreen
              profile={app.userProfile}
              completionRate={app.completionRate}
              completedCount={app.completedCount}
              totalCount={app.totalCount}
              stats={app.stats}
            />
          </motion.div>
        ) : null}

        {app.currentScreen === 'profile' && app.userProfile ? (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <ProfileScreen
              profile={app.userProfile}
              onStartCustomization={app.handleStartCustomization}
              isCustomized={app.isCustomized}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {app.currentScreen !== 'onboarding' ? (
        <BottomNavigation
          currentScreen={app.currentScreen}
          onNavigate={(screen) => app.setCurrentScreen(screen as Screen)}
        />
      ) : null}

      {app.userProfile ? (
        <>
          <FailureSheet
            isOpen={app.isFailureSheetOpen}
            onClose={() => app.setIsFailureSheetOpen(false)}
            quest={app.failureQuest}
            profile={app.userProfile}
            energy={app.energy}
            onAcceptRecovery={app.handleAcceptRecovery}
          />
          <EnergyCheckIn
            isOpen={app.isEnergyOpen}
            onClose={() => app.setIsEnergyOpen(false)}
            onSubmit={app.handleEnergySubmit}
          />
          <FutureSelfVisualizer
            isOpen={app.isFutureSelfOpen}
            onClose={() => app.setIsFutureSelfOpen(false)}
            userName={app.userProfile.name}
            goal={app.userProfile.goal}
            initialPrompt={app.futureSelfPrompt}
            onSave={app.handleFutureSelfSave}
          />
          <VoiceCheckIn
            isOpen={app.isVoiceCheckInOpen}
            onClose={() => app.setIsVoiceCheckInOpen(false)}
            initialText={app.latestVoiceCheckIn?.text}
            onSave={app.handleVoiceCheckInSave}
          />
          <ShareCard
            isOpen={app.isShareOpen}
            onClose={() => app.setIsShareOpen(false)}
            profile={app.userProfile}
            streak={app.stats.currentStreak}
            level={app.stats.level}
            completionRate={app.completionRate}
            questTitle={app.todayQuests.find((quest) => quest.completed)?.title}
          />
          <LevelUpModal
            isOpen={!!app.levelUpInfo}
            onClose={() => app.setLevelUpInfo(null)}
            newLevel={app.levelUpInfo?.level || 1}
            xpGained={app.levelUpInfo?.xp || 0}
          />
        </>
      ) : null}
    </div>
  );
}
