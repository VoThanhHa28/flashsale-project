/**
 * Socket Context - Quản lý Socket connection và state
 * Cung cấp Socket service và connection status cho toàn app
 */
import { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socket';
import { SOCKET_EVENTS } from '../contracts';
import * as api from '../services/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [productStockUpdates, setProductStockUpdates] = useState(new Map());
  const [lastFlashSaleStart, setLastFlashSaleStart] = useState(null);
  const [systemError, setSystemError] = useState(null);
  /** Tăng mỗi khi shop đổi trạng thái đơn của user (để OrderHistory / OrderDetail refetch) */
  const [orderStatusBump, setOrderStatusBump] = useState(0);

  useEffect(() => {
    socketService.connect();

    const markAttempted = () => setConnectionAttempted(true);
    const handleConnect = () => {
      setConnectionStatus('connected');
      markAttempted();
    };
    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      markAttempted();
    };
    const handleReconnect = () => setConnectionStatus('connected');
    const handleReconnecting = () => {
      setConnectionStatus('reconnecting');
      markAttempted();
    };
    const handleError = () => markAttempted();

    const unsubConnect = socketService.onConnect(handleConnect);
    const unsubDisconnect = socketService.onDisconnect(handleDisconnect);
    const unsubReconnect = socketService.onReconnect(handleReconnect);
    const unsubReconnecting = socketService.onReconnecting(handleReconnecting);
    const unsubError = socketService.onError(handleError);

    const unsubscribeStock = socketService.on(SOCKET_EVENTS.UPDATE_STOCK, (data) => {
      const { productId, remainingStock, quantity } = data;
      const stock = remainingStock != null ? remainingStock : quantity;
      setProductStockUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(String(productId), stock);
        return newMap;
      });
    });

    const unsubscribeFlashSaleStart = socketService.on(SOCKET_EVENTS.FLASH_SALE_START, (data) => {
      setLastFlashSaleStart(data || { productId: null, startTime: null });
    });

    const unsubscribeSystemError = socketService.on(SOCKET_EVENTS.SYSTEM_ERROR, (data) => {
      setSystemError(data && typeof data === 'object' ? data : { message: 'Hệ thống đang bảo trì' });
    });

    const unsubscribeOrderStatus = socketService.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, () => {
      setOrderStatusBump((n) => n + 1);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubReconnect();
      unsubReconnecting();
      unsubError();
      unsubscribeStock();
      unsubscribeFlashSaleStart();
      unsubscribeSystemError();
      unsubscribeOrderStatus();
    };
  }, []);

  /** Join socket room theo user đang đăng nhập (nhận order-status-updated từ shop) */
  useEffect(() => {
    const joinUserRoom = () => {
      const u = api.getUser();
      const uid = u && (u._id || u.id);
      if (uid) socketService.emit('join-user-room', String(uid));
    };
    const offConnect = socketService.onConnect(joinUserRoom);
    const offReconnect = socketService.onReconnect(joinUserRoom);
    joinUserRoom();
    return () => {
      offConnect();
      offReconnect();
    };
  }, []);

  const value = {
    connectionStatus,
    connectionAttempted,
    productStockUpdates,
    lastFlashSaleStart,
    systemError,
    orderStatusBump,
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