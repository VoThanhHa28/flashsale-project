/**
 * Socket Context - Quản lý Socket connection và state
 * Cung cấp Socket service và connection status cho toàn app
 */
import { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socket';
import { SOCKET_EVENTS } from '../contracts';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [productStockUpdates, setProductStockUpdates] = useState(new Map());
  const [lastFlashSaleStart, setLastFlashSaleStart] = useState(null);

  useEffect(() => {
    socketService.connect();

    const handleConnect = () => setConnectionStatus('connected');
    const handleDisconnect = () => setConnectionStatus('disconnected');
    const handleReconnect = () => setConnectionStatus('connected');
    const handleReconnecting = () => setConnectionStatus('reconnecting');

    const unsubConnect = socketService.onConnect(handleConnect);
    const unsubDisconnect = socketService.onDisconnect(handleDisconnect);
    const unsubReconnect = socketService.onReconnect(handleReconnect);
    const unsubReconnecting = socketService.onReconnecting(handleReconnecting);

    const unsubscribeStock = socketService.on(SOCKET_EVENTS.UPDATE_STOCK, (data) => {
      const { productId, quantity } = data;
      setProductStockUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(String(productId), quantity);
        return newMap;
      });
    });

    const unsubscribeFlashSaleStart = socketService.on(SOCKET_EVENTS.FLASH_SALE_START, (data) => {
      setLastFlashSaleStart(data || { productId: null, startTime: null });
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubReconnect();
      unsubReconnecting();
      unsubscribeStock();
      unsubscribeFlashSaleStart();
    };
  }, []);

  const value = {
    connectionStatus,
    productStockUpdates,
    lastFlashSaleStart,
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