import { useState, useCallback } from 'react';

/**
 * Hook quản lý state kết quả đơn hàng (success/error modal, submitting, message).
 * Dùng trong ProductDetail để tách logic order result khỏi component chính.
 */
export function useOrderResult() {
  const [orderResult, setOrderResult] = useState(null);
  const [orderResultMessage, setOrderResultMessage] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  const resetOrderResult = useCallback(() => {
    setOrderResult(null);
    setOrderResultMessage('');
    setOrderError('');
    setOrderSuccess('');
  }, []);

  return {
    orderResult,
    setOrderResult,
    orderResultMessage,
    setOrderResultMessage,
    orderSubmitting,
    setOrderSubmitting,
    orderError,
    setOrderError,
    orderSuccess,
    setOrderSuccess,
    resetOrderResult,
  };
}
