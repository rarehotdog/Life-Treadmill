import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, Square, X } from 'lucide-react';
import { Button, Textarea } from '../ui';

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
    const SpeechCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

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
      {isOpen ? (
        <>
          <motion.div
            data-testid="voice-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />

          <motion.div
            data-testid="voice-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="modal-sheet safe-bottom"
          >
            <div className="modal-handle-wrap">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            <div className="modal-body">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="modal-title text-gray-900">Voice Check-in</h2>
                <Button data-testid="voice-modal-close" onClick={onClose} variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              <p className="modal-subtle mb-3">오늘 상태를 30초로 기록해보세요</p>

              <div className="mb-4 flex gap-2">
                {!isRecording ? (
                  <Button data-testid="voice-modal-start" onClick={startRecording} className="flex-1 bg-[#111827] text-white">
                    <Mic className="mr-2 h-4 w-4" />
                    녹음 시작
                  </Button>
                ) : (
                  <Button data-testid="voice-modal-stop" onClick={stopRecording} className="flex-1 bg-red-500 text-white hover:bg-red-500">
                    <Square className="mr-2 h-4 w-4" />
                    녹음 중지
                  </Button>
                )}
              </div>

              {!isSupported ? (
                <p className="caption-12 mb-3 flex items-center gap-1 text-amber-600">
                  <MicOff className="h-3.5 w-3.5" /> 이 브라우저는 음성 인식을 지원하지 않아 텍스트 입력으로 대체합니다.
                </p>
              ) : null}

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예) 오늘은 피곤하지만 15분은 집중할 수 있어요. 저녁에 짧은 퀘스트부터 시작하고 싶어요."
                className="input-surface body-14 h-28 resize-none p-4"
              />

              <Button data-testid="voice-modal-save" onClick={handleSave} disabled={!text.trim()} className="cta-primary mt-4 w-full bg-[#7C3AED] text-white disabled:opacity-40 hover:bg-[#7C3AED]">
                체크인 저장
              </Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
