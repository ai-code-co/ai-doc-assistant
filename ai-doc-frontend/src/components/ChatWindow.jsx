import { useState, useRef, useEffect } from "react";
import { searchDocuments } from "../services/api";
import StructuredAnswer from "./StructuredAnswer";

const ChatWindow = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  const bottomRef = useRef(null);
  const speechRef = useRef(null);
  const recognitionRef = useRef(null);

  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);

  // -------------------------------
  // TEXT SEARCH
  // -------------------------------
  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    const currentQuery = query;
    setQuery("");

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentQuery,
    };

    const assistantId = crypto.randomUUID();

    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      await searchDocuments(currentQuery, selectedModel, (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg,
          ),
        );
      });
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  // -------------------------------
  // VOICE SEARCH
  // -------------------------------
  const handleSearchWithVoice = async (voiceText) => {
    if (!voiceText.trim()) return;

    setLoading(true);

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: voiceText,
    };

    const assistantId = crypto.randomUUID();

    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    let fullResponse = "";

    try {
      await searchDocuments(voiceText, selectedModel, (chunk) => {
        fullResponse += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg,
          ),
        );
      });

      speakAnswer(fullResponse);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
    setQuery("");
  };

  // -------------------------------
  // SPEECH RECOGNITION
  // -------------------------------
  const startListening = () => {
    if (speaking) stopSpeaking();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearchWithVoice(transcript);
    };

    recognition.onerror = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  // -------------------------------
  // SPEECH SYNTHESIS
  // -------------------------------
  const speakAnswer = (text) => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";

    speech.onstart = () => setSpeaking(true);
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => setSpeaking(false);

    speechRef.current = speech;
    window.speechSynthesis.speak(speech);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // -------------------------------
  // AUTO SCROLL
  // -------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="bg-blue-600 px-4 py-2 rounded-lg max-w-lg">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-gray-800 p-4 rounded-lg max-w-2xl">
                <StructuredAnswer answer={msg.content} />
              </div>
            </div>
          ),
        )}

        {loading && <p className="text-gray-400">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-gray-900 flex gap-3 items-center">
        {/* Model Selector */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4.1">GPT-4.1</option>
          <option value="gpt-3.5-turbo">GPT-3.5</option>
          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
        </select>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Ask something about your documents..."
          className="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
        />

        {/* Mic */}
        <button
          onClick={startListening}
          className={`px-4 rounded-lg font-semibold ${
            listening ? "bg-red-600" : "bg-gray-700"
          }`}
        >
          🎤
        </button>

        {/* Stop Speech */}
        {speaking && (
          <button
            onClick={stopSpeaking}
            className="bg-red-600 hover:bg-red-700 px-4 rounded-lg font-semibold"
          >
            ⏹ Stop
          </button>
        )}

        {/* Send */}
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 px-5 rounded-lg font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
