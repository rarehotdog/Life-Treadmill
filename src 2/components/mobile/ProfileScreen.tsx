import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Target, Clock, Bell, ChevronRight, Sparkles, Trash2, Download, Info } from 'lucide-react';
import type { UserProfile } from '../../../App';
import { isGeminiConfigured } from '../../lib/gemini';
import { isSupabaseConfigured } from '../../lib/supabase';

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleExport = () => {
    const data = {
      profile: localStorage.getItem('ltr_profile'),
      quests: localStorage.getItem('ltr_quests'),
      techTree: localStorage.getItem('ltr_techTree'),
      history: localStorage.getItem('ltr_questHistory'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ltr-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const menuItems = [
    { icon: Target, label: '목표 변경', desc: '새로운 목표를 설정합니다', onClick: onStartCustomization },
    { icon: Clock, label: '루틴 시간', desc: profile.routineTime === 'morning' ? '아침형' : '저녁형', onClick: onStartCustomization },
    { icon: Bell, label: '알림 설정', desc: '준비 중', onClick: () => {} },
    { icon: Download, label: '데이터 내보내기', desc: 'JSON 파일로 백업', onClick: handleExport },
    { icon: Trash2, label: '데이터 초기화', desc: '모든 데이터를 삭제합니다', onClick: () => setShowResetConfirm(true), danger: true },
  ];

  return (
    <div className="px-5 pt-4 pb-6 bg-[#F9FAFB] min-h-screen">

      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="text-28 font-bold text-gray-900 tracking-tight-custom leading-tight">Profile</h1>
        <p className="text-14 text-[#9CA3AF] mt-0.5">설정을 관리하세요</p>
      </div>

      {/* ── Profile Card ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 border border-[#F3F4F6] mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#7C3AED] to-purple-600 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-22 font-bold text-gray-900">{profile.name}</h2>
            <p className="text-13 text-[#9CA3AF]">
              {profile.joinedDate ? `${profile.joinedDate}부터 시작` : '오늘 시작'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#F3F4F6]">
          <div className="text-center">
            <p className="text-22 font-bold text-gray-900">{profile.currentDay}</p>
            <p className="text-12 text-[#9CA3AF]">진행일</p>
          </div>
          <div className="text-center">
            <p className="text-22 font-bold text-gray-900">{profile.streak}</p>
            <p className="text-12 text-[#9CA3AF]">연속</p>
          </div>
          <div className="text-center">
            <p className="text-22 font-bold text-gray-900">{profile.weeklyCompletion}%</p>
            <p className="text-12 text-[#9CA3AF]">완료율</p>
          </div>
        </div>
      </motion.div>

      {/* ── Current Goal ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-4 border border-purple-100 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div className="flex-1">
            <p className="text-12 text-[#7C3AED] font-semibold mb-0.5">현재 목표</p>
            <p className="text-15 font-bold text-gray-900">{profile.goal}</p>
            <p className="text-13 text-[#9CA3AF] mt-1">
              목표일: {profile.deadline || '무제한'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Customization CTA ── */}
      {!isCustomized && (
        <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={onStartCustomization}
          className="w-full bg-gradient-to-r from-[#7C3AED] to-indigo-500 rounded-2xl p-4 mb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-15 font-bold text-white">나만의 여정 시작하기</p>
              <p className="text-13 text-white/70">AI가 맞춤 퀘스트를 설계해드려요</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>
        </motion.button>
      )}

      {/* ── Connection Status ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="bg-white rounded-2xl p-4 border border-[#F3F4F6] mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[#9CA3AF]" />
          <h3 className="text-14 font-semibold text-gray-900">연결 상태</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-13 text-[#6B7280]">Gemini AI</span>
            <span className={`text-12 font-medium px-2 py-0.5 rounded-lg ${
              isGeminiConfigured() ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {isGeminiConfigured() ? '연결됨' : '미연결'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-13 text-[#6B7280]">Supabase 클라우드</span>
            <span className={`text-12 font-medium px-2 py-0.5 rounded-lg ${
              isSupabaseConfigured() ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {isSupabaseConfigured() ? '연결됨' : '미연결'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-13 text-[#6B7280]">로컬 저장소</span>
            <span className="text-12 font-medium px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">
              활성
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Menu Items ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="bg-white rounded-2xl border border-[#F3F4F6] overflow-hidden mb-4">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-[#F3F4F6]' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              (item as any).danger ? 'bg-red-50' : 'bg-gray-100'
            }`}>
              <item.icon className={`w-5 h-5 ${(item as any).danger ? 'text-red-500' : 'text-gray-600'}`} />
            </div>
            <div className="flex-1 text-left">
              <span className={`text-15 font-medium ${(item as any).danger ? 'text-red-600' : 'text-gray-900'}`}>
                {item.label}
              </span>
              <p className="text-12 text-[#9CA3AF]">{item.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        ))}
      </motion.div>

      {/* ── Version ── */}
      <div className="text-center mt-6">
        <p className="text-13 text-[#9CA3AF]">Life Treadmills v1.0.0</p>
        <p className="text-11 text-gray-300 mt-1">Made with ❤️ by Tyler & Poby</p>
      </div>

      {/* ── Reset Confirm Modal ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-8">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-22 font-bold text-gray-900 mb-2">데이터 초기화</h3>
            <p className="text-14 text-[#6B7280] mb-6">
              모든 프로필, 퀘스트, 테크트리 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </p>
            <div className="space-y-2">
              <button onClick={handleReset}
                className="w-full bg-red-500 text-white rounded-14 py-3.5 text-15 font-semibold">
                초기화하기
              </button>
              <button onClick={() => setShowResetConfirm(false)}
                className="w-full bg-gray-100 text-gray-600 rounded-14 py-3.5 text-15 font-medium">
                취소
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
