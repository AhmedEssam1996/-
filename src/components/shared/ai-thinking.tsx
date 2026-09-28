import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiThinkingProps {
  messages?: string[];
  className?: string;
  isStreaming?: boolean;
}

export function AiThinking({ messages = [], className, isStreaming = true }: AiThinkingProps) {
  const displayMessages = messages.length > 0 ? messages : ['جارٍ التفكير...', 'يتم صياغة الفكرة...'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        'inline-flex items-start gap-3 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/8 p-4 pl-10',
        className,
      )}
    >
      <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-[var(--hd-pink)] shrink-0" />
      <div className="space-y-1">
        {displayMessages.map((msg, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.4 }}
            className="text-sm text-fg-muted"
          >
            {msg}
          </motion.p>
        ))}
        {isStreaming && (
          <motion.div
            className="flex gap-1"
            initial={{ width: 0 }}
            animate={{ width: 'auto' }}
            transition={{ delay: displayMessages.length * 0.4 }}
          >
            <span className="text-[var(--hd-pink)]">●</span>
            <span className="text-[var(--hd-pink)]">●</span>
            <span className="text-[var(--hd-pink)]">●</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
