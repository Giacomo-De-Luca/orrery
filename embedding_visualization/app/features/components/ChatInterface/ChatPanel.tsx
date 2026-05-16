'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, History, PanelRightIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/lib/ui-primitives/button';
import { Slider } from '@/lib/ui-primitives/slider';
import { useScrollToBottom } from '@/lib/hooks/useScrollToBottom';
import { useSteeringChat, type SteeringChatOptions } from '@/lib/hooks/useSteeringChat';
import { cn } from '@/lib/utils/utils';
import type { ChatMessage as ChatMessageType, ChatSessionSummary, SaeFeature, SteeringConfig, SteeringFeature, MessageVote } from '@/lib/types/types';
import { ChatGreeting } from './ChatGreeting';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { SteeringControls } from './SteeringControls';
import { ThinkingIndicator } from './ThinkingIndicator';

interface ChatPanelProps {
  steeringConfig: SteeringConfig;
  modelId: string | null;
  saeId: string | null;
  currentFeature: SaeFeature | null;
  onAddFeature: (feature: SteeringFeature) => void;
  onRemoveFeature: (key: string) => void;
  onUpdateStrength: (key: string, strength: number) => void;
  onClose?: () => void;
  // Chat history props
  sessions?: ChatSessionSummary[];
  sessionsLoading?: boolean;
  activeSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onNewChat?: () => void;
  onUserMessageSent?: (message: ChatMessageType) => void;
  onAssistantMessageComplete?: (message: ChatMessageType) => void;
  /** When set, replaces current messages (used for loading a session). Reset to null after load. */
  loadedMessages?: ChatMessageType[] | null;
}

export function ChatPanel({
  steeringConfig,
  modelId,
  saeId,
  currentFeature,
  onAddFeature,
  onRemoveFeature,
  onUpdateStrength,
  onClose,
  sessions = [],
  sessionsLoading = false,
  activeSessionId = null,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onUserMessageSent,
  onAssistantMessageComplete,
  loadedMessages,
}: ChatPanelProps) {
  const [maxTokens, setMaxTokens] = useState(256);
  const [showHistory, setShowHistory] = useState(false);
  const prevLoadedRef = useRef<ChatMessageType[] | null | undefined>(undefined);

  const chatOptions: SteeringChatOptions = useMemo(
    () => ({
      onUserMessageSent,
      onAssistantMessageComplete,
    }),
    [onUserMessageSent, onAssistantMessageComplete]
  );

  const { messages, status, error, send, stop, reset, regenerate, editAndResend, loadMessages } =
    useSteeringChat(steeringConfig, maxTokens, chatOptions);
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();
  const [votes, setVotes] = useState<Map<string, MessageVote>>(new Map());

  // Load messages when a session is selected from history
  useEffect(() => {
    if (loadedMessages && loadedMessages !== prevLoadedRef.current) {
      prevLoadedRef.current = loadedMessages;
      loadMessages(loadedMessages, steeringConfig);
    }
  }, [loadedMessages, loadMessages, steeringConfig]);

  const isEmpty = messages.length === 0;
  const isLoadingModel = status === 'loading_model';
  const isGenerating = status === 'generating';
  const isBusy = isLoadingModel || isGenerating;

  const handleVote = useCallback((messageId: string, isUpvoted: boolean) => {
    setVotes((prev) => {
      const next = new Map(prev);
      const existing = next.get(messageId);
      // Toggle off if same vote
      if (existing?.isUpvoted === isUpvoted) {
        next.delete(messageId);
      } else {
        next.set(messageId, { messageId, isUpvoted });
      }
      return next;
    });
  }, []);

  const handleRegenerate = useCallback((assistantMessageIndex: number) => {
    // Find the preceding user message and re-send via the hook's regenerate support
    for (let i = assistantMessageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        regenerate(assistantMessageIndex);
        return;
      }
    }
  }, [messages, regenerate]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        <h2 className="text-sm font-semibold">
          {showHistory ? 'History' : 'Steered Chat'}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant={showHistory ? 'secondary' : 'ghost'}
            onClick={() => setShowHistory((v) => !v)}
            className="size-7 text-muted-foreground"
          >
            <History className="size-3.5" />
            <span className="sr-only">Toggle history</span>
          </Button>
          {!isEmpty && !showHistory && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                reset();
                onNewChat?.();
              }}
              className="size-7 text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              <span className="sr-only">New chat</span>
            </Button>
          )}
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="size-7 text-muted-foreground"
            >
              <PanelRightIcon className="size-3.5" />
              <span className="sr-only">Close chat</span>
            </Button>
          )}
        </div>
      </div>
      {/* Steering controls */}
      <SteeringControls
        config={steeringConfig}
        onAddFeature={onAddFeature}
        onRemoveFeature={onRemoveFeature}
        onUpdateStrength={onUpdateStrength}
        currentFeature={currentFeature}
        currentModelId={modelId}
        currentSaeId={saeId}
      />

      {/* Max tokens control */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-2">
        <span className="shrink-0 text-[11px] text-muted-foreground">Max tokens</span>
        <Slider
          value={[maxTokens]}
          min={32}
          max={2048}
          step={32}
          onValueChange={([v]) => setMaxTokens(v)}
          className="flex-1"
        />
        <span className="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
          {maxTokens}
        </span>
      </div>

      {showHistory ? (
        <ChatHistory
          sessions={sessions}
          loading={sessionsLoading}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            onSelectSession?.(id);
            setShowHistory(false);
          }}
          onDeleteSession={(id) => onDeleteSession?.(id)}
          onNewChat={() => {
            reset();
            onNewChat?.();
            setShowHistory(false);
          }}
        />
      ) : (
        <>
          {/* Messages area */}
          <div className="relative flex-1 overflow-hidden">
            {isEmpty && (
              <ChatGreeting featureCount={steeringConfig.features.length} />
            )}

            <div
              ref={containerRef}
              className="absolute inset-0 overflow-y-auto"
            >
              <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-5 px-4 py-6 md:gap-7">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    messageIndex={i}
                    isGenerating={isBusy}
                    vote={votes.get(msg.id)}
                    onVote={handleVote}
                    onEdit={msg.role === 'user' ? editAndResend : undefined}
                    onRegenerate={msg.role === 'assistant' ? () => handleRegenerate(i) : undefined}
                  />
                ))}

                {isBusy && messages[messages.length - 1]?.content === '' && (
                  <ThinkingIndicator phase={isLoadingModel ? 'loading_model' : 'thinking'} />
                )}

                {error && (
                  <motion.div
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {error}
                  </motion.div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            {/* Scroll-to-bottom button */}
            <button
              onClick={() => scrollToBottom()}
              className={cn(
                'absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center',
                'size-7 rounded-full border border-border/50 bg-card/90',
                'shadow-[var(--shadow-float)] backdrop-blur-lg',
                'transition-all duration-200',
                isAtBottom
                  ? 'pointer-events-none scale-90 opacity-0'
                  : 'pointer-events-auto scale-100 opacity-100',
              )}
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </div>

          {/* Input area */}
          <ChatInput
            onSend={send}
            onStop={stop}
            isGenerating={isBusy}
            showSuggestions={isEmpty}
            onSuggest={send}
          />
        </>
      )}
    </div>
  );
}
