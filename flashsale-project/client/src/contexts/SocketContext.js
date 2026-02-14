/**
 * Socket Context - Quản lý Socket connection và state
 * Cung cấp Socket service và connection status cho toàn app
 */
import { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [productStockUpdates, setProductStockUpdates] = useState(new Map());

  useEffect(() => {
    // Kết nối Socket khi component mount
    socketService.connect();

    // Đăng ký callbacks để update state
    const handleConnect = () => {
      setConnectionStatus('connected');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleReconnect = () => {
      setConnectionStatus('connected');
    };

    const handleReconnecting = () => {
      setConnectionStatus('reconnecting');
    };

    socketService.onConnect(handleConnect);
    socketService.onDisconnect(handleDisconnect);
    socketService.onReconnect(handleReconnect);

    // Lắng nghe update-stock event
    const unsubscribeStock = socketService.on('update-stock', (data) => {
      const { productId, quantity } = data;
      setProductStockUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(String(productId), quantity);
        return newMap;
      });
    });

    // Update connection status mỗi giây để catch reconnecting state
    const statusInterval = setInterval(() => {
      const status = socketService.getConnectionStatus();
      if (status === 'reconnecting') {
        setConnectionStatus('reconnecting');
      }
    }, 1000);

    return () => {
      unsubscribeStock();
      clearInterval(statusInterval);
      // Không disconnect Socket ở đây vì có thể các component khác đang dùng
    };
  }, []);

  const value = {
    connectionStatus,
    productStockUpdates,
    socket: socketService,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}