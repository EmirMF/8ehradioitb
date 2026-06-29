
declare global {
  var chatClients: Set<ReadableStreamDefaultController>;
  var chatMessages: { id: string; senderName: string; text: string; timestamp: string }[];
}

if (!globalThis.chatClients) {
  globalThis.chatClients = new Set();
}

if (!globalThis.chatMessages) {
  globalThis.chatMessages = [];
}

export const clients = globalThis.chatClients;
export const messages = globalThis.chatMessages;