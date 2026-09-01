class EventEmitter {
  constructor() { this._events = new Map(); }
  on(name, fn) { return this; }
  off(name, fn) { return this; }
  emit(name, ...args) { return true; }
}
export { EventEmitter };
export default EventEmitter;
