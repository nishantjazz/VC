import React, { useState } from "react";
import { useVoiceEmotion } from "../hooks/useVoiceEmotion";

export default function EmotionDetector({ audioStream }) {
  const { emotion, startListening, stopListening, isListening } =
    useVoiceEmotion(audioStream);

  return (
    <div className="text-center p-6">
      <h1 className="text-2xl font-bold mb-4">🎙 Voice Emotion Detection</h1>
      <p className="text-lg mb-4">
        Detected Emotion: <strong>{emotion}</strong>
      </p>

      {!isListening ? (
        <button
          onClick={startListening}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Start Microphone
        </button>
      ) : (
        <button
          onClick={stopListening}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Stop Microphone
        </button>
      )}
    </div>
  );
}
