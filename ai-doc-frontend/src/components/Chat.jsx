import { useState } from "react";
import axios from "axios";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!question.trim()) return;

    const newMessages = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setQuestion("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/search", {
        question,
      });

      const aiResponse = response.data.answer;

      setMessages([...newMessages, { role: "assistant", content: aiResponse }]);
    } catch (error) {
      console.error(error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error getting response." },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h2>AI Document Assistant</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          height: "400px",
          overflowY: "auto",
          marginBottom: "15px",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              marginBottom: "10px",
            }}
          >
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong>
            <div>{msg.content}</div>
          </div>
        ))}

        {loading && <div>AI is thinking...</div>}
      </div>

      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        style={{ width: "80%", padding: "10px" }}
      />

      <button
        onClick={sendMessage}
        style={{ padding: "10px 20px", marginLeft: "10px" }}
      >
        Send
      </button>
    </div>
  );
}
