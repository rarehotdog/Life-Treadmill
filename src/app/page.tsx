'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Target, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export default function LandingPage() {
  const router = useRouter();
  const { techTree, user } = useAppStore();

  // If user has already onboarded, redirect to dashboard
  useEffect(() => {
    if (techTree) {
      router.push('/dashboard');
    }
  }, [techTree, router]);

  const features = [
    {
      icon: Brain,
      title: '맥락 인식 AI',
      description: '당신의 상황, 에너지, 환경을 이해하고 최적의 다음 단계를 제안합니다',
    },
    {
      icon: Target,
      title: 'Tech-Tree 시스템',
      description: '목표를 게임처럼 시각화하고, 하나씩 열매를 맺어가는 성장 경험',
    },
    {
      icon: Zap,
      title: '실패 복구 루프',
      description: '실패해도 괜찮아요. AI가 즉시 대안을 찾고 경로를 수정합니다',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Life Treadmills</span>
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-12 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Pathfinder OS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            노력 없이
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              무엇이든 이루는 방법
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
          >
            결정을 삭제하면 성공이 시작됩니다.
            <br />
            AI가 당신의 삶을 읽고, 오늘 당장 할 수 있는
            <br />
            <span className="text-foreground font-medium">'진짜 다음 한 걸음'</span>을 설계합니다.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              onClick={() => router.push('/onboarding')}
            >
              시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="glass rounded-2xl p-6 hover:bg-card/80 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Philosophy Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-24 text-center"
        >
          <blockquote className="text-lg text-muted-foreground italic max-w-2xl mx-auto">
            "우리는 좋은 선택을 반복할 때 성장하는 게 아닙니다.
            <br />
            <span className="text-foreground not-italic font-medium">
              선택 자체가 사라졌을 때
            </span>
            <br />
            최고 성과를 내는 모드에 진입합니다."
          </blockquote>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-8 border-t border-border/50">
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <span>Made with ❤️ by Tyler & Poby</span>
        </div>
      </footer>
    </div>
  );
}
