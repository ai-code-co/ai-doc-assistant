const BASE_URL = "https://ai-doc-assistant-n47h.onrender.com";

const getSessionId = () => {
  let sessionId = localStorage.getItem("sessionId");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("sessionId", sessionId);
  }

  return sessionId;
};

export const uploadFiles = async (files) => {
  const formData = new FormData();

  for (let file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  return response.json();
};

// export const searchDocuments = async (query, model, onChunk) => {
//   const sessionId = getSessionId();

//   const response = await fetch(`${BASE_URL}/upload/search`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ query, sessionId, model }),
//   });

//   if (!response.body) {
//     throw new Error("Streaming not supported in this browser.");
//   }

//   const reader = response.body.getReader();
//   const decoder = new TextDecoder("utf-8");

//   let done = false;

//   while (!done) {
//     const { value, done: doneReading } = await reader.read();
//     done = doneReading;

//     if (value) {
//       const chunk = decoder.decode(value, { stream: true });
//       onChunk(chunk);
//     }
//   }
// };

export const searchDocuments = async (query, model, onChunk) => {
  const sessionId = getSessionId();

  const response = await fetch(`${BASE_URL}/upload/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, sessionId, model }),
  });

  if (!response.body) {
    throw new Error("Streaming not supported in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;

    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }
};
