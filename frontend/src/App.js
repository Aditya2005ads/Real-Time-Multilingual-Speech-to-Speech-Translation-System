import React, { useState } from "react";
import AudioRecorder from "./components/AudioRecorder";
import LanguageSelector from "./components/LanguageSelector";
import "./App.css";

function App() {
  const [inputLang, setInputLang] = useState("en");
  const [outputLang, setOutputLang] = useState("hi");

  return (
    <div className="App">
      <h1>🌍 Real-Time Speech Translator</h1>

      <div className="selectors">
        <LanguageSelector
          label="Input Language:"
          value={inputLang}
          onChange={setInputLang}
        />
        <LanguageSelector
          label="Output Language:"
          value={outputLang}
          onChange={setOutputLang}
        />
      </div>

      <AudioRecorder inputLang={inputLang} outputLang={outputLang} />
    </div>
  );
}

export default App;
