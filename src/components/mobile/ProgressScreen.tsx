import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, RefreshCw, Upload, Wifi, WifiOff } from 'lucide-react';
import type {
  DecisionLogViewItem,
  DecisionQualitySnapshot,
  ExecutionMetrics,
  SafetyMetrics,
  SyncDiagnostics,
  SyncRetryResult,
  UserProfile,
} from '../../types/app';
import type { UserStats } from '../../lib/gamification';
import { getYearImage, setItemString, STORAGE_KEYS } from '../../lib/app-storage';
import { trackEvent } from '../../lib/telemetry';
import DecisionLogDetailSheet from './DecisionLogDetailSheet';
import DecisionLogSection from './DecisionLogSection';
import { Badge, Button, Card, CardContent, Progress } from '../ui';

interface ProgressScreenProps {
  profile: UserProfile;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  stats?: UserStats;
  decisionTerminalEnabled?: boolean;
  decisionQualitySnapshot?: DecisionQualitySnapshot | null;
  decisionQualityHistory?: DecisionQualitySnapshot[];
  executionMetrics?: ExecutionMetrics;
  safetyMetrics?: SafetyMetrics;
  decisionLogItems?: DecisionLogViewItem[];
  decisionLogWindowDays?: number;
  decisionLogLastUpdatedAt?: string | null;
  decisionLogUiEnabled?: boolean;
  syncStatusUiEnabled?: boolean;
  syncDiagnostics?: SyncDiagnostics;
  isSyncing?: boolean;
  onSyncRetry?: () => Promise<SyncRetryResult>;
  remoteSyncEnabled?: boolean;
}

function formatDateTime(value: string | null): string {
  if (!value) return '기록 없음';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ProgressScreen({
  profile,
  completionRate,
  completedCount,
  totalCount,
  stats,
  decisionTerminalEnabled = false,
  decisionQualitySnapshot,
  decisionQualityHistory = [],
  executionMetrics,
  safetyMetrics,
  decisionLogItems = [],
  decisionLogWindowDays = 14,
  decisionLogLastUpdatedAt = null,
  decisionLogUiEnabled = false,
  syncStatusUiEnabled = false,
  syncDiagnostics,
  isSyncing = false,
  onSyncRetry,
  remoteSyncEnabled = false,
}: ProgressScreenProps) {
  const [yearImage, setYearImage] = useState<string | null>(null);
  const [yearImageSaveError, setYearImageSaveError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isDecisionDetailOpen, setIsDecisionDetailOpen] = useState(false);
  const [selectedDecisionItem, setSelectedDecisionItem] = useState<DecisionLogViewItem | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decisionLogOpenedRef = useRef(false);
  const goalImageKey = profile.goal || 'default';

  const syncState = syncDiagnostics ?? {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    outboxSize: 0,
    lastDrain: null,
  };

  const last7Days = [
    { date: 'Mon', completed: 3, total: 3, rate: 100 },
    { date: 'Tue', completed: 2, total: 3, rate: 67 },
    { date: 'Wed', completed: 3, total: 3, rate: 100 },
    { date: 'Thu', completed: 3, total: 3, rate: 100 },
    { date: 'Fri', completed: 2, total: 3, rate: 67 },
    { date: 'Sat', completed: 3, total: 3, rate: 100 },
    { date: 'Sun', completed: completedCount, total: totalCount, rate: completionRate },
  ];

  const monthlyStats = [
    { month: 'Jan', completed: 78, total: 93, rate: 84 },
    { month: 'Feb', completed: 65, total: 84, rate: 77 },
    { month: 'Mar', completed: 82, total: 93, rate: 88 },
    { month: 'Apr', completed: 75, total: 90, rate: 83 },
  ];

  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const endOfYear = new Date(currentDate.getFullYear(), 11, 31);
  const totalDaysInYear = Math.ceil(
    (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysPassed = Math.ceil(
    (currentDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  );
  const yearProgress = (daysPassed / totalDaysInYear) * 100;

  const avgCompletionRate = last7Days.reduce((sum, day) => sum + day.rate, 0) / 7;
  const brightness = 0.3 + (avgCompletionRate / 100) * 0.7;

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setYearImage(result);
      const writeResult = setItemString(STORAGE_KEYS.yearImage(goalImageKey), result);
      if (!writeResult.success) {
        setYearImageSaveError('이미지 저장에 실패했어요. 저장공간 상태를 확인해 주세요.');
        trackEvent('storage.write_failed', {
          scope: 'progress_year_image',
          reason: writeResult.reason ?? 'unknown',
        });
        return;
      }
      setYearImageSaveError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenDecisionItem = (item: DecisionLogViewItem) => {
    setSelectedDecisionItem(item);
    setIsDecisionDetailOpen(true);
    trackEvent('ui.decision_log_item_opened', {
      decisionId: item.decisionId,
      status: item.execution.latestStatus,
      valid: item.validation.pass,
    });
  };

  const handleCloseDecisionDetail = () => {
    trackEvent('ui.decision_log_closed', {
      decisionId: selectedDecisionItem?.decisionId ?? null,
    });
    setIsDecisionDetailOpen(false);
    setSelectedDecisionItem(null);
  };

  const syncRetryDisabled =
    isSyncing || !onSyncRetry || !syncState.online || !remoteSyncEnabled;
  const syncRetryLabel = !remoteSyncEnabled
    ? '클라우드 미설정'
    : !syncState.online
      ? '오프라인 상태'
      : isSyncing
        ? '동기화 중...'
        : '지금 동기화';

  const handleSyncRetryClick = async () => {
    if (!onSyncRetry) return;
    const result = await onSyncRetry();

    if (result.status === 'succeeded') {
      setSyncFeedback({
        type: 'success',
        message: result.message,
      });
      return;
    }

    if (result.status === 'failed') {
      setSyncFeedback({
        type: 'error',
        message: result.message,
      });
      return;
    }

    setSyncFeedback({
      type: 'info',
      message: result.message,
    });
  };

  useEffect(() => {
    const savedImage = getYearImage(goalImageKey);
    if (savedImage) setYearImage(savedImage);
  }, [goalImageKey]);

  useEffect(() => {
    if (!decisionTerminalEnabled || !decisionLogUiEnabled || decisionLogOpenedRef.current) {
      return;
    }
    decisionLogOpenedRef.current = true;
    trackEvent('ui.decision_log_opened', {
      count: decisionLogItems.length,
      windowDays: decisionLogWindowDays,
    });
  }, [
    decisionLogItems.length,
    decisionLogUiEnabled,
    decisionLogWindowDays,
    decisionTerminalEnabled,
  ]);

  return (
    <div data-testid="screen-progress" className="min-h-screen bg-gray-50 pb-24">
      <div className="border-b border-gray-100 bg-white screen-wrap-tight">
        <div className="flex items-center justify-between">
          <h1 className="heading-1 text-gray-900">Progress</h1>
          <Button variant="secondary" className="h-8 rounded-lg px-3 body-14 text-gray-600">
            This Week
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="screen-wrap-tight space-y-4">
        <Card className="relative overflow-hidden rounded-2xl border-0 shadow-sm">
          <div className="absolute inset-0 overflow-hidden">
            {yearImage ? (
              <div
                className="h-full w-full bg-cover bg-center transition-all duration-1000"
                style={{
                  backgroundImage: `url(${yearImage})`,
                  filter: `brightness(${brightness}) grayscale(${1 - avgCompletionRate / 100})`,
                }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <CardContent className="relative z-10 space-y-4 card-padding">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 label-12 font-medium text-white/90">Year Progress</p>
                <h2 className="heading-1 text-white">{currentDate.getFullYear()}</h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 rounded-lg border border-white/20 bg-white/20 px-3 caption-12 text-white/90 backdrop-blur-sm hover:bg-white/30"
              >
                <Upload className="h-3.5 w-3.5" />
                이미지
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {yearImageSaveError ? (
              <p className="caption-12 text-rose-100">{yearImageSaveError}</p>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="caption-12 text-white/80">
                  {daysPassed} / {totalDaysInYear} days
                </span>
                <span className="body-14 font-bold text-white">{yearProgress.toFixed(1)}%</span>
              </div>
              <Progress value={yearProgress} className="h-1.5 bg-white/20 [&>div]:bg-white" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/15 p-2.5">
                <p className="caption-11 mb-0.5 text-white/70">Day</p>
                <p className="stat-18 font-bold text-white">{profile.currentDay}</p>
              </div>
              <div className="rounded-lg bg-white/15 p-2.5">
                <p className="caption-11 mb-0.5 text-white/70">Completion</p>
                <p className="stat-18 font-bold text-white">{avgCompletionRate.toFixed(0)}%</p>
              </div>
              <div className="rounded-lg bg-white/15 p-2.5">
                <p className="caption-11 mb-0.5 text-white/70">Streak</p>
                <p className="stat-18 font-bold text-white">
                  {stats?.currentStreak ?? profile.streak}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="card-padding">
            <h3 className="heading-3 mb-4 text-gray-900">Weekly Overview</h3>
            <div className="relative mb-3 h-40">
              <div className="absolute inset-0 flex items-end justify-around gap-1">
                {last7Days.map((day, index) => (
                  <div key={day.date + index} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      className="relative w-full rounded-t-lg bg-gradient-to-t from-[#7C3AED] to-[#8B5CF6]"
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.rate / 100) * 120}px` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                    <span
                      className={`caption-12 ${index === 6 ? 'font-bold text-[#7C3AED]' : 'text-gray-500'}`}
                    >
                      {day.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
              <div className="text-center">
                <p className="caption-12 mb-1 text-gray-500">Completed</p>
                <p className="stat-18 font-bold text-gray-900">
                  {last7Days.reduce((sum, day) => sum + day.completed, 0)}
                </p>
              </div>
              <div className="border-x border-gray-100 text-center">
                <p className="caption-12 mb-1 text-gray-500">Total</p>
                <p className="stat-18 font-bold text-gray-900">
                  {last7Days.reduce((sum, day) => sum + day.total, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="caption-12 mb-1 text-gray-500">Avg Rate</p>
                <p className="stat-18 font-bold text-[#7C3AED]">{avgCompletionRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="card-padding">
            <h3 className="heading-3 mb-4 text-gray-900">Monthly Breakdown</h3>
            <div className="space-y-3">
              {monthlyStats.map((month, index) => (
                <motion.div
                  key={month.month}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="body-14 font-semibold text-gray-700">{month.month}</span>
                    <span className="body-14 font-bold text-gray-900">{month.rate}%</span>
                  </div>
                  <Progress value={month.rate} className="h-2 bg-gray-100 [&>div]:bg-[#7C3AED]" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {decisionTerminalEnabled && decisionQualitySnapshot ? (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="card-padding">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="heading-3 text-gray-900">Decision Quality Breakdown</h3>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 body-13 font-semibold text-violet-700">
                  DQI {decisionQualitySnapshot.score}
                </span>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: 'Structure',
                    value: decisionQualitySnapshot.structureScore,
                    max: 40,
                  },
                  {
                    label: 'Execution',
                    value: decisionQualitySnapshot.executionScore,
                    max: 35,
                  },
                  {
                    label: 'Recovery',
                    value: decisionQualitySnapshot.recoveryScore,
                    max: 15,
                  },
                  {
                    label: 'Safety',
                    value: decisionQualitySnapshot.safetyScore,
                    max: 10,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="body-14 text-gray-700">{item.label}</span>
                      <span className="body-13 font-semibold text-gray-900">
                        {item.value}/{item.max}
                      </span>
                    </div>
                    <Progress
                      value={(item.value / item.max) * 100}
                      className="h-2 bg-gray-100 [&>div]:bg-violet-500"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <p className="caption-12 text-emerald-500">Applied</p>
                  <p className="body-15 font-semibold text-emerald-700">
                    {Math.round((executionMetrics?.appliedRate ?? 0) * 100)}%
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2.5">
                  <p className="caption-12 text-amber-500">Delayed</p>
                  <p className="body-15 font-semibold text-amber-700">
                    {Math.round((executionMetrics?.delayedRate ?? 0) * 100)}%
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="caption-12 text-slate-500">On Time</p>
                  <p className="body-15 font-semibold text-slate-700">
                    {Math.round((executionMetrics?.onTimeRate ?? 0) * 100)}%
                  </p>
                </div>
              </div>
              {decisionQualityHistory.length > 0 ? (
                <p className="caption-12 mt-3 text-gray-500">
                  최근 {Math.min(7, decisionQualityHistory.length)}개 스냅샷 기반
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {decisionTerminalEnabled && decisionLogUiEnabled ? (
          <DecisionLogSection
            items={decisionLogItems}
            windowDays={decisionLogWindowDays}
            lastUpdatedAt={decisionLogLastUpdatedAt}
            onOpenItem={handleOpenDecisionItem}
          />
        ) : null}

        {syncStatusUiEnabled ? (
          <Card data-testid="sync-reliability-card" className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="card-padding">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="heading-3 text-gray-900">Sync Reliability</h3>
                <Badge
                  className={`rounded-full caption-11 font-semibold ${
                    syncState.online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {syncState.online ? (
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />
                      offline
                    </span>
                  )}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-violet-50 p-2.5">
                  <p className="caption-12 text-violet-600">Pending outbox</p>
                  <p className="stat-18 font-semibold text-violet-800">{syncState.outboxSize}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="caption-12 text-slate-600">Dropped</p>
                  <p className="stat-18 font-semibold text-slate-800">
                    {syncState.lastDrain?.dropped ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="body-14 text-gray-700">Last drain</p>
                  <p className="caption-12 text-gray-500">
                    {formatDateTime(syncState.lastDrain?.runAt ?? null)}
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="caption-12 text-gray-500">Processed</p>
                  <p className="caption-12 font-semibold text-gray-700">
                    {syncState.lastDrain?.processed ?? 0}
                  </p>
                </div>
                {!syncState.online ? (
                  <p className="caption-12 mt-2 text-amber-700">
                    오프라인 상태예요. 온라인 복귀 후 자동 동기화되며, 수동 재시도도 가능합니다.
                  </p>
                ) : null}
                {!remoteSyncEnabled ? (
                  <p className="caption-12 mt-2 text-slate-600">
                    Supabase 미설정 상태입니다. 로컬 저장은 정상 동작합니다.
                  </p>
                ) : null}
              </div>

              <Button
                data-testid="sync-retry-button"
                onClick={() => {
                  void handleSyncRetryClick();
                }}
                disabled={syncRetryDisabled}
                className="mt-3 w-full cta-secondary"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {syncRetryLabel}
              </Button>
              {syncFeedback ? (
                <div
                  className={`mt-2 rounded-lg px-3 py-2 caption-12 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : syncFeedback.type === 'error'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {syncFeedback.message}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {decisionTerminalEnabled && safetyMetrics ? (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="card-padding">
              <h3 className="heading-3 mb-4 text-gray-900">Governance Risk Trend</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-green-50 p-3">
                  <p className="caption-12 text-green-600">Low</p>
                  <p className="heading-3 text-green-700">{safetyMetrics.riskCounts.low}</p>
                </div>
                <div className="rounded-xl bg-yellow-50 p-3">
                  <p className="caption-12 text-yellow-600">Medium</p>
                  <p className="heading-3 text-yellow-700">{safetyMetrics.riskCounts.medium}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="caption-12 text-red-600">High</p>
                  <p className="heading-3 text-red-700">{safetyMetrics.riskCounts.high}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="body-14 text-gray-700">
                  High-risk violation rate:{' '}
                  <span className="font-semibold text-gray-900">
                    {Math.round(safetyMetrics.highRiskViolationRate * 100)}%
                  </span>
                </p>
                <p className="caption-12 mt-1 text-gray-500">
                  감사 로그 {safetyMetrics.totalAudits}건(최근 {safetyMetrics.windowDays}일)
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <DecisionLogDetailSheet
        isOpen={isDecisionDetailOpen}
        item={selectedDecisionItem}
        onClose={handleCloseDecisionDetail}
      />
    </div>
  );
}
