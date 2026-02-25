const sessions = {};

export function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }
  return sessions[sessionId];
}

export function addMessage(sessionId, role, content) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  sessions[sessionId].push({ role, content });

  // Limit short-term memory
  if (sessions[sessionId].length > 10) {
    sessions[sessionId] = sessions[sessionId].slice(-10);
  }
}

export function clearSession(sessionId) {
  delete sessions[sessionId];
}
