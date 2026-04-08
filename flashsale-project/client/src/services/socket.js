/**
 * Socket.io client service
 * Quản lý kết nối Socket và lắng nghe events từ backend
 */
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../contracts';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionStatus = 'disconnected'; // disconnected, connecting, connected, reconnecting
    this.hasLoggedConnectionError = false; // Flag để chỉ log error một lần
    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onReconnect: [],
      onReconnecting: [],
      onError: [],
    };
  }

  /**
   * Kết nối tới Socket server
   * @param {string} url - Socket server URL (default: http://localhost:3000)
   */
  connect(url = null) {
    if (this.socket?.connected) {
      console.log('🔌 Socket đã được kết nối');
      return;
    }

    const socketUrl = url || process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    console.log('🔌 Đang kết nối Socket:', socketUrl);

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  /**
   * Setup các event listeners cơ bản
   */
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connectionStatus = 'connected';
      this.hasLoggedConnectionError = false; // Reset flag khi connect thành công
      this.callbacks.onConnect.forEach(cb => cb());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.connectionStatus = 'disconnected';
      this.callbacks.onDisconnect.forEach(cb => cb(reason));
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.connectionStatus = 'connected';
      this.callbacks.onReconnect.forEach(cb => cb(attemptNumber));
    });

    this.socket.on('reconnect_attempt', () => {
      console.log('🔄 Socket reconnecting...');
      this.connectionStatus = 'reconnecting';
      this.callbacks.onReconnecting.forEach(cb => cb());
    });

    this.socket.on('connect_error', (error) => {
      // Chỉ log error một lần để tránh spam console
      if (!this.hasLoggedConnectionError) {
        console.warn('⚠️ Socket server chưa sẵn sàng. Đang thử kết nối lại...');
        this.hasLoggedConnectionError = true;
      }
      this.callbacks.onError.forEach(cb => cb(error));
    });

    // Lắng nghe update-stock event
    this.socket.on(SOCKET_EVENTS.UPDATE_STOCK, (data) => {
      console.log('📦 Received update-stock:', data);
      const listeners = this.listeners.get(SOCKET_EVENTS.UPDATE_STOCK) || [];
      listeners.forEach(callback => callback(data));
    });

    // Lắng nghe flash-sale-start event
    this.socket.on(SOCKET_EVENTS.FLASH_SALE_START, (data) => {
      console.log('🚀 Received flash-sale-start:', data);
      const listeners = this.listeners.get(SOCKET_EVENTS.FLASH_SALE_START) || [];
      listeners.forEach(callback => callback(data));
    });

    // Lắng nghe system-error (Case 3: BE sống, DB chết)
    this.socket.on(SOCKET_EVENTS.SYSTEM_ERROR, (data) => {
      console.warn('⚠️ System error from server:', data);
      const listeners = this.listeners.get(SOCKET_EVENTS.SYSTEM_ERROR) || [];
      listeners.forEach(callback => callback(data));
    });

    this.socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, (data) => {
      const listeners = this.listeners.get(SOCKET_EVENTS.ORDER_STATUS_UPDATED) || [];
      listeners.forEach((callback) => callback(data));
    });
  }

  /**
   * Đăng ký listener cho một event
   * @param {string} event - Tên event
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Hủy đăng ký listener
   * @param {string} event - Tên event
   * @param {function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Đăng ký callback cho connection events.
   * Trả về hàm unsubscribe để cleanup khi không dùng nữa.
   */
  onConnect(callback) {
    this.callbacks.onConnect.push(callback);
    return () => {
      const idx = this.callbacks.onConnect.indexOf(callback);
      if (idx > -1) this.callbacks.onConnect.splice(idx, 1);
    };
  }

  onDisconnect(callback) {
    this.callbacks.onDisconnect.push(callback);
    return () => {
      const idx = this.callbacks.onDisconnect.indexOf(callback);
      if (idx > -1) this.callbacks.onDisconnect.splice(idx, 1);
    };
  }

  onReconnect(callback) {
    this.callbacks.onReconnect.push(callback);
    return () => {
      const idx = this.callbacks.onReconnect.indexOf(callback);
      if (idx > -1) this.callbacks.onReconnect.splice(idx, 1);
    };
  }

  onReconnecting(callback) {
    this.callbacks.onReconnecting.push(callback);
    return () => {
      const idx = this.callbacks.onReconnecting.indexOf(callback);
      if (idx > -1) this.callbacks.onReconnecting.splice(idx, 1);
    };
  }

  onError(callback) {
    this.callbacks.onError.push(callback);
    return () => {
      const idx = this.callbacks.onError.indexOf(callback);
      if (idx > -1) this.callbacks.onError.splice(idx, 1);
    };
  }

  /**
   * Lấy connection status
   */
  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.disconnected) return 'disconnected';
    return this.connectionStatus;
  }

  /**
   * Ngắt kết nối
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  /**
   * Emit event (nếu cần)
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket chưa kết nối, không thể emit:', event);
    }
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;