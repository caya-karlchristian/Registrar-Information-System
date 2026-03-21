import { useState, useEffect, useRef, useCallback } from 'react';

const useVoiceRecognition = ({
  onResult,
  onError,
  language = 'en-US',
  continuous = true,
  interimResults = true,
  silenceTimeout = 3000,
} = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isListeningRef = useRef(false);
  const transcriptRef = useRef('');

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
      }
    }, silenceTimeout);
  }, [clearSilenceTimer, silenceTimeout]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setIsSupported(!!SpeechRecognition);
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }

      if (finalText) {
        const updated = transcriptRef.current
          ? `${transcriptRef.current} ${finalText}`.trim()
          : finalText.trim();

        transcriptRef.current = updated;

        setTranscript(updated);
        setInterimTranscript('');

        queueMicrotask(() => {
          onResultRef.current?.(updated);
        });
      } else {
        setInterimTranscript(interimText);
      }

      startSilenceTimer();
    };

    recognition.onerror = (event) => {
      if (!['no-speech', 'aborted'].includes(event.error)) {
        onErrorRef.current?.(event.error);
      }
      clearSilenceTimer();
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      isListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      recognition.abort();
    };
  }, [language, continuous, interimResults, startSilenceTimer, clearSilenceTimer]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;
    recognitionRef.current.start();
    isListeningRef.current = true;
    setIsListening(true);
    startSilenceTimer();
  }, [startSilenceTimer]);

  const stop = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return;
    clearSilenceTimer();
    recognitionRef.current.stop();
    isListeningRef.current = false;
    setIsListening(false);
  }, [clearSilenceTimer]);

  const toggle = useCallback(() => {
    isListeningRef.current ? stop() : start();
  }, [start, stop]);

  const reset = useCallback(() => {
    stop();
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, [stop]);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    start,
    stop,
    toggle,
    reset,
  };
};

export default useVoiceRecognition;