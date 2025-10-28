import React, { useState, useRef, useEffect } from "react";
import { sendAudio } from "../api/api";
import { FaMicrophone, FaStop, FaPlay, FaDownload } from "react-icons/fa";

export default function AudioRecorder({ inputLang, outputLang }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [audioBlob, setAudioBlob] = useState(null); // 🆕 keep last recording
  const [lastInputLang, setLastInputLang] = useState(inputLang);
  const [lastOutputLang, setLastOutputLang] = useState(outputLang);

  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  // 🔁 If output language changes, re-translate automatically
  useEffect(() => {
    if (
      audioBlob &&
      recognizedText &&
      lastOutputLang !== outputLang &&
      lastInputLang === inputLang
    ) {
      console.log("🔁 Retrying translation for new output language...");
      handleTranslation(audioBlob);
      setLastOutputLang(outputLang);
    }
  }, [outputLang]);

  // ⚠️ If input language changes, reset everything
  useEffect(() => {
    if (lastInputLang !== inputLang) {
      console.log("🆕 Input language changed — need to re-record");
      setAudioURL(null);
      setAudioBlob(null);
      setRecognizedText("");
      setTranslatedText("");
      setLastInputLang(inputLang);
    }
  }, [inputLang]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
        await handleTranslation(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("🎙️ Microphone error:", err);
      alert("Microphone access error!");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleTranslation = async (blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "input.webm");
      formData.append("input_lang", inputLang);
      formData.append("output_lang", outputLang);

      const result = await sendAudio(formData);
      setRecognizedText(result.recognized_text || "");
      setTranslatedText(result.translated_text || "");

      const audioFile = new Blob(
        [Uint8Array.from(atob(result.audio_base64), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );
      const url = URL.createObjectURL(audioFile);
      setAudioURL(url);
    } catch (err) {
      console.error("❌ Translation failed:", err);
      alert("Translation failed. Check backend console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="recorder">
      {isRecording ? (
        <button onClick={stopRecording} className="btn stop">
          <FaStop /> Stop
        </button>
      ) : (
        <button onClick={startRecording} className="btn record">
          <FaMicrophone /> Record
        </button>
      )}

      {isLoading && <p className="loader">⏳ Processing translation...</p>}

      {!audioBlob && !isRecording && (
        <p className="note">🎙️ Please record something to translate.</p>
      )}

      {recognizedText && (
        <div className="text-output">
          <p><strong>Recognized:</strong> {recognizedText}</p>
          <p><strong>Translated:</strong> {translatedText}</p>
        </div>
      )}

      {audioURL && (
        <div className="controls">
          <button onClick={() => new Audio(audioURL).play()} className="btn play">
            <FaPlay /> Play Translation
          </button>

          <a href={audioURL} download="translated.mp3" className="btn download">
            <FaDownload /> Download
          </a>
        </div>
      )}

      {/* If input language changed but not re-recorded yet */}
      {lastInputLang !== inputLang && (
        <p className="warning">⚠️ Input language changed — please record again!</p>
      )}
    </div>
  );
}
