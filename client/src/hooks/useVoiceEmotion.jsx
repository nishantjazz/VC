import { useRef, useState, useEffect } from "react";
import Meyda from "meyda";

export const useVoiceEmotion = (audioStream) => {
  const [emotion, setEmotion] = useState("Waiting...");
  const [isListening, setIsListening] = useState(false);

  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const meydaRef = useRef(null);
  const mfccBufferRef = useRef([]);
  const historyRef = useRef([]);
  const predictionIntervalRef = useRef(null);

  useEffect(() => {
    // stop when stream changes
    return () => stopListening();
    // eslint-disable-next-line
  }, [audioStream]);

  const startListening = async () => {
    if (isListening) return;
    if (!audioStream) {
      console.error("❌ No audio stream provided to emotion hook.");
      return;
    }

    try {
      console.log("🎧 Starting emotion detection using existing WebRTC stream...");

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(audioStream);

      audioContextRef.current = audioContext;
      sourceRef.current = source;

      const meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        source,
        bufferSize: 512,
        featureExtractors: ["mfcc"],
        callback: (features) => {
          if (!features || !features.mfcc) return;

          // push MFCC frame
          mfccBufferRef.current.push(features.mfcc);
          if (mfccBufferRef.current.length > 174) {
            mfccBufferRef.current.shift();
          }
        },
      });

      meydaRef.current = meydaAnalyzer;
      meydaAnalyzer.start();
      setIsListening(true);

      predictionIntervalRef.current = setInterval(async () => {
        const buffer = mfccBufferRef.current;

        if (buffer.length < 174) return;

        try {
          // flatten 174×13 → 2262
          let flat = mfccBufferRef.current.flat();

          // pad to 2376
          while (flat.length < 2376) flat.push(0);

          // if too long (shouldn't happen), cut
          if (flat.length > 2376) flat = flat.slice(0, 2376);

          const res = await fetch("http://localhost:4000/api/emotion/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ features: flat }),
          });


          const data = await res.json();

          if (data.emotion) {
            // Smooth predictions
            historyRef.current.push(data.emotion);
            if (historyRef.current.length > 5) historyRef.current.shift();

            const counts = historyRef.current.reduce((acc, val) => {
              acc[val] = (acc[val] || 0) + 1;
              return acc;
            }, {});

            const finalEmotion = Object.keys(counts).reduce((a, b) =>
              counts[a] > counts[b] ? a : b
            );

            setEmotion(finalEmotion);
          }
        } catch (err) {
          console.error("Prediction error:", err);
        }
      }, 4000);
    } catch (err) {
      console.error("❌ Emotion detection error:", err);
    }
  };

  const stopListening = () => {
    console.log("🛑 Stopping emotion detection...");
    setIsListening(false);

    if (meydaRef.current) {
      meydaRef.current.stop();
      meydaRef.current = null;
    }
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    mfccBufferRef.current = [];
    historyRef.current = [];
  };

  return { emotion, startListening, stopListening, isListening };
};
