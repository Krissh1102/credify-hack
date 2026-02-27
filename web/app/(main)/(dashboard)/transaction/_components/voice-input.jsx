"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useRef, useState } from "react";

export default function VoiceInput({ onResult }) {
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en-IN"); // default language
  const recognitionRef = useRef(null);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript;
      onResult(speech);
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error", err);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Language selector next to mic */}
      <select
        className="border rounded-md p-2"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="en-IN">English</option>
        <option value="hi-IN">Hindi</option>
        <option value="mr-IN">Marathi</option>
        <option value="gu-IN">Gujarati</option>
        {/* add more languages here */}
      </select>

      {/* Mic button */}
      <Button
        type="button"
        onClick={listening ? stopListening : startListening}
        variant={listening ? "destructive" : "secondary"}
        className="flex items-center gap-2"
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    </div>
  );
}
