import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

export interface SpeechCues {
  muted: boolean;
  speechAvailable: boolean;
  toggleMuted: () => void;
  unlock: () => void;
  speak: (text: string) => void;
  beep: (frequency: number, durationMs?: number) => void;
}

function voicePrefix(language: string): string {
  return language.toLowerCase().startsWith('en') ? 'en' : 'sr';
}

function speechLocale(language: string): string {
  return language.toLowerCase().startsWith('en') ? 'en-US' : 'sr-Latn';
}

function findVoice(language: string): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  try {
    const prefix = voicePrefix(language);
    return window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(prefix)) ?? null;
  } catch {
    return null;
  }
}

function subscribeVoices(callback: () => void): () => void {
  if (!('speechSynthesis' in window)) return () => {};
  const synthesis = window.speechSynthesis;
  synthesis.addEventListener('voiceschanged', callback);
  const id = window.setInterval(callback, 1000);
  return () => {
    synthesis.removeEventListener('voiceschanged', callback);
    window.clearInterval(id);
  };
}

export function useSpeechCues(): SpeechCues {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [muted, setMuted] = useState(false);
  const speechAvailable = useSyncExternalStore(
    subscribeVoices,
    () => findVoice(language) !== null,
    () => false,
  );
  const mutedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handle = () => {
      const context = audioContextRef.current;
      if (!context) return;
      if (document.visibilityState === 'hidden') {
        context.suspend().catch(() => {});
      } else {
        context.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  const unlock = useCallback(() => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      audioContextRef.current.resume().catch(() => {});
    } catch {
      audioContextRef.current = null;
    }
    try {
      if ('speechSynthesis' in window) {
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      }
    } catch {
      return;
    }
  }, []);

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        return;
      }
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (mutedRef.current) return;
      const voice = findVoice(language);
      if (!voice) return;
      try {
        const synthesis = window.speechSynthesis;
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = speechLocale(language);
        utterance.voice = voice;
        synthesis.speak(utterance);
      } catch {
        return;
      }
    },
    [language],
  );

  const beep = useCallback((frequency: number, durationMs = 150) => {
    if (mutedRef.current) return;
    const context = audioContextRef.current;
    if (!context) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(context.destination);
      const startAt = context.currentTime;
      oscillator.start(startAt);
      oscillator.stop(startAt + durationMs / 1000);
    } catch {
      return;
    }
  }, []);

  return { muted, speechAvailable, toggleMuted, unlock, speak, beep };
}
