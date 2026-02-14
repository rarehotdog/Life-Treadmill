import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, Square, X } from 'lucide-react';

type VoiceCheckInData = {
  text: string;
  createdAt: string;
};

interface VoiceCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VoiceCheckInData) => void;
  initialText?: string;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function VoiceCheckIn({ isOpen, onClose, onSave, initialText }: VoiceCheckInProps) {
  const [text, setText] = useState(initialText || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const recognition = useMemo(() => {
    const SpeechCtor = (window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition || (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition;

    if (!SpeechCtor) return null;

    const instance = new SpeechCtor();
    instance.lang = 'ko-KR';
    instance.interimResults = true;
    instance.continuous = true;
    return instance;
  }, []);

  const startRecording = () => {
    if (!recognition) {
      setIsSupported(false);
      return;
    }

    recognition.onresult = (event) => {
      let merged = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript;
        if (piece) merged += piece;
      }
      setText(merged.trim());
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognition?.stop();
    setIsRecording(false);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim(), createdAt: new Date().toISOString() });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-3xl z-[61] safe-bottom"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-22 font-bold text-gray-900">Voice Check-in</h2>
                <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <p className="text-13 text-[#6B7280] mb-3">오늘 상태를 30초로 기록해보세요</p>

              <div className="flex gap-2 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex-1 bg-[#111827] text-white rounded-14 py-3 text-14 font-semibold flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" /> 녹음 시작
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex-1 bg-red-500 text-white rounded-14 py-3 text-14 font-semibold flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4" /> 녹음 중지
                  </button>
                )}
              </div>

              {!isSupported && (
                <p className="text-12 text-amber-600 mb-3 flex items-center gap-1">
                  <MicOff className="w-3.5 h-3.5" /> 이 브라우저는 음성 인식을 지원하지 않아 텍스트 입력으로 대체합니다.
                </p>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예) 오늘은 피곤하지만 15분은 집중할 수 있어요. 저녁에 짧은 퀘스트부터 시작하고 싶어요."
                className="w-full h-28 bg-[#F3F4F6] rounded-2xl p-4 text-14 leading-relaxed resize-none"
              />

              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="w-full mt-4 bg-[#7C3AED] text-white rounded-14 py-3.5 text-14 font-semibold disabled:opacity-40"
              >
                체크인 저장
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
