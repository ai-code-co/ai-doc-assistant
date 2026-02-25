import { useState, useRef, useEffect } from "react";
import { searchDocuments } from "../services/api";
import StructuredAnswer from "./StructuredAnswer";

const ChatWindow = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const speechRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  const startListening = () => {
    // Stop speaking if currently speaking
    if (speaking) {
      stopSpeaking();
    }

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

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;

      setQuery(transcript);

      // Immediately send query to backend
      handleSearchWithVoice(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    const userMessage = { role: "user", content: query };
    setLoading(true);
    const currentQuery = query;
    setQuery("");

    let assistantIndex;

    // Add user + assistant placeholder in ONE update
    setMessages((prev) => {
      assistantIndex = prev.length + 1;

      return [...prev, userMessage, { role: "assistant", content: "" }];
    });

    try {
      await searchDocuments(currentQuery, (chunk) => {
        setMessages((prev) => {
          // Defensive check
          if (!prev[assistantIndex]) return prev;

          const updated = [...prev];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: updated[assistantIndex].content + chunk,
          };

          return updated;
        });
      });
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const handleSearchWithVoice = async (voiceText) => {
    if (!voiceText.trim()) return;

    setLoading(true);

    const userMessage = { role: "user", content: voiceText };
    let assistantIndex;
    let fullResponse = "";

    // Add user + assistant placeholder together
    setMessages((prev) => {
      assistantIndex = prev.length + 1;

      return [...prev, userMessage, { role: "assistant", content: "" }];
    });

    try {
      await searchDocuments(voiceText, (chunk) => {
        fullResponse += chunk;

        setMessages((prev) => {
          if (!prev[assistantIndex]) return prev;

          const updated = [...prev];
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: updated[assistantIndex].content + chunk,
          };

          return updated;
        });
      });

      // Speak after streaming completes
      speakAnswer(fullResponse);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
    setQuery("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speakAnswer = (text) => {
    if (!text) return;

    // Stop any ongoing speech first
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";

    speech.onstart = () => {
      setSpeaking(true);
    };

    speech.onend = () => {
      setSpeaking(false);
    };

    speech.onerror = () => {
      setSpeaking(false);
    };

    speechRef.current = speech;

    window.speechSynthesis.speak(speech);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) =>
          msg.role === "user" ? (
            <div key={index} className="flex justify-end">
              <div className="bg-blue-600 px-4 py-2 rounded-lg max-w-lg">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={index} className="flex justify-start">
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
      <div className="p-4 border-t border-gray-800 bg-gray-900 flex gap-3">
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
          className="flex-1 p-3 rounded-lg bg-gray-800 
                     border border-gray-700 focus:outline-none"
        />

        <button
          onClick={startListening}
          className={`px-4 rounded-lg font-semibold ${
            listening ? "bg-red-600" : "bg-gray-700"
          }`}
        >
          🎤
        </button>

        {speaking && (
          <button
            onClick={stopSpeaking}
            className="bg-red-600 hover:bg-red-700 px-4 rounded-lg font-semibold"
          >
            ⏹ Stop
          </button>
        )}

        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 
             px-5 rounded-lg font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
