'use client';

import { motion } from 'framer-motion';
import { User, Target, Clock, AlertTriangle, Settings, ChevronRight, Sparkles } from 'lucide-react';
import type { UserProfile } from '@/types';

interface ProfileScreenProps {
  profile: UserProfile;
  onStartCustomization: () => void;
  isCustomized: boolean;
}

export default function ProfileScreen({
  profile,
  onStartCustomization,
  isCustomized,
}: ProfileScreenProps) {
  const menuItems = [
    { icon: Target, label: '목표 변경', onClick: onStartCustomization },
    { icon: Clock, label: '루틴 시간 설정', onClick: () => {} },
    { icon: AlertTriangle, label: '알림 설정', onClick: () => {} },
    { icon: Settings, label: '앱 설정', onClick: () => {} },
  ];

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">프로필</h1>
        <p className="text-gray-500 text-sm">설정을 관리하세요</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 border border-gray-100 mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">
              {profile.joinedDate ? `${profile.joinedDate}부터 시작` : '오늘 시작'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{profile.currentDay}</p>
            <p className="text-xs text-gray-500">진행일</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{profile.streak}</p>
            <p className="text-xs text-gray-500">연속</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{profile.weeklyCompletion}%</p>
            <p className="text-xs text-gray-500">완료율</p>
          </div>
        </div>
      </motion.div>

      {/* Current Goal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 mb-6"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-emerald-600 font-medium mb-1">현재 목표</p>
            <p className="font-bold text-gray-900">{profile.goal}</p>
            <p className="text-sm text-gray-500 mt-1">
              목표일: {profile.deadline || '무제한'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Customization Prompt */}
      {!isCustomized && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={onStartCustomization}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 mb-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">나만의 여정 시작하기</p>
              <p className="text-sm text-purple-100">
                AI가 맞춤 퀘스트를 설계해드려요
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>
        </motion.button>
      )}

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <item.icon className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </motion.div>

      {/* App Version */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-400">Life Treadmills v1.0.0</p>
        <p className="text-xs text-gray-300 mt-1">Made with ❤️ by Tyler & Poby</p>
      </div>
    </div>
  );
}
