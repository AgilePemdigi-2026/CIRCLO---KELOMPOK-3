export class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ChatError';
    this.status = status;
  }
}
