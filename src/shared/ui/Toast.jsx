import React, { useState, useEffect } from 'react';

export default function Toast({ toast }) {
  const [currentToast, setCurrentToast] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast && toast.show) {
      setCurrentToast(toast);
      setIsExiting(false);

      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 2950);

      const removeTimer = setTimeout(() => {
        setCurrentToast(null);
        setIsExiting(false);
      }, 3350);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    } else {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setCurrentToast(null);
        setIsExiting(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!currentToast) return null;

  const rawMessage = currentToast.message || '';
  const isError = Boolean(
    currentToast.isError || 
    rawMessage.startsWith('❌') || 
    rawMessage.startsWith('💥')
  );

  const isSuccess = Boolean(
    !isError && (
      rawMessage.startsWith('🎉') ||
      rawMessage.startsWith('✅') ||
      rawMessage.toLowerCase().includes('зачислен') ||
      rawMessage.toLowerCase().includes('выигрыш') ||
      rawMessage.toLowerCase().includes('блэкджек') ||
      rawMessage.toLowerCase().includes('скопирован') ||
      rawMessage.toLowerCase().includes('добавлен')
    )
  );

  const toastType = isError ? 'error' : (isSuccess ? 'success' : 'info');

  // Strip harsh raw emojis from the beginning for modern minimalist aesthetic
  const cleanText = rawMessage.replace(/^[❌🎉💥✅⚡🚀📋⌛🔍📌💎👑]\s*/u, '').trim();

  return (
    <div className={`minimal-toast-wrapper ${isExiting ? 'exit' : 'enter'}`}>
      <div className={`minimal-toast-card ${toastType}`}>
        <div className="minimal-toast-icon-wrap">
          {toastType === 'success' && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00e699" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
          {toastType === 'error' && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          )}
          {toastType === 'info' && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          )}
        </div>
        <span className="minimal-toast-text">{cleanText || rawMessage}</span>
      </div>
    </div>
  );
}
