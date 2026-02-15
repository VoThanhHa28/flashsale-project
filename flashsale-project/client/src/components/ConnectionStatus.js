/**
 * Connection Status Component
 * Hiển thị trạng thái kết nối Socket (reconnecting indicator)
 */
import { useSocket } from '../contexts/SocketContext';
import './ConnectionStatus.css';

function ConnectionStatus() {
  const { connectionStatus, connectionAttempted } = useSocket();

  // Hiển thị khi mất kết nối hoặc đang thử kết nối lại (và đã từng có attempt, tránh hiện lúc mới load)
  const showBanner =
    connectionAttempted &&
    (connectionStatus === 'reconnecting' || connectionStatus === 'disconnected');
  if (!showBanner) {
    return null;
  }

  return (
    <div className="connection-status" role="alert" aria-live="polite">
      <span className="connection-status-icon">⚠️</span>
      <span className="connection-status-text">Đang kết nối lại...</span>
    </div>
  );
}

export default ConnectionStatus;  