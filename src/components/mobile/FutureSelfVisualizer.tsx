import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X, WandSparkles } from 'lucide-react';
import { Button, Card, CardContent, Textarea } from '../ui';

interface FutureSelfVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  goal: string;
  initialPrompt?: string;
  onSave: (prompt: string) => void;
}

export default function FutureSelfVisualizer({
  isOpen,
  onClose,
  userName,
  goal,
  initialPrompt,
  onSave,
}: FutureSelfVisualizerProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');

  const palette = useMemo(() => {
    const seed = [...prompt].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 42;
    const palettes = [
      ['#0EA5E9', '#22D3EE', '#34D399'],
      ['#8B5CF6', '#EC4899', '#F97316'],
      ['#22C55E', '#84CC16', '#EAB308'],
      ['#6366F1', '#14B8A6', '#06B6D4'],
    ];
    return palettes[seed % palettes.length];
  }, [prompt]);

  const visionTitle = prompt.trim() || '미래의 나를 상상해보세요';

  const handleSave = () => {
    if (!prompt.trim()) return;
    onSave(prompt.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            data-testid="future-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />

          <motion.div
            data-testid="future-modal"
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
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-fuchsia-500" />
                  <h2 className="modal-title text-gray-900">Future Self</h2>
                </div>
                <Button data-testid="future-modal-close" onClick={onClose} variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              <p className="modal-subtle mb-2">달성한 미래의 나를 한 줄로 써보세요</p>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예) 올해 10kg 감량해서 하프 마라톤 완주"
                className="input-surface body-14 h-24 resize-none p-4"
              />

              <Card
                className="relative mb-5 mt-4 overflow-hidden rounded-3xl border-0 text-white"
                style={{ background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)` }}
              >
                <CardContent className="relative card-padding">
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20" />
                  <p className="caption-12 mb-1 text-white/80">Vision Card</p>
                  <p className="heading-3 mb-3 pr-6">{visionTitle}</p>
                  <p className="caption-12 text-white/85">{userName} · {goal}</p>
                </CardContent>
              </Card>

              <Button
                data-testid="future-modal-save"
                onClick={handleSave}
                disabled={!prompt.trim()}
                className="cta-primary w-full bg-[#111827] text-white disabled:opacity-40 hover:bg-[#111827]"
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                비전 저장하기
              </Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
