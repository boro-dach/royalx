import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { CloseIcon, SendIcon } from '@/shared/ui/Icons';

const PROOF_TASKS = [
  { id: 'tiktok', title: 'TikTok & Reels', icon: '🎬', placeholder: 'Ссылка на видео в TikTok / Reels' },
  { id: 'nickname', title: 'Ник в Telegram', icon: '✈️', placeholder: 'Ваш @username в Telegram' },
  { id: 'comment', title: 'Комментарии', icon: '💬', placeholder: 'Ссылка на видео или комментарий' },
  { id: 'other', title: 'Другое', icon: '📋', placeholder: 'Ссылка или детали задания' }
];

function compressImageToBase64(file, maxSize = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

export default function EarnProofModal({ initialTask = 'tiktok', onClose, onSuccess }) {
  const { tgUser, showToast, getAuthHeaders } = useApp();
  const [taskType, setTaskType] = useState(
    PROOF_TASKS.some(t => t.id === initialTask) ? initialTask : 'tiktok'
  );
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageName, setImageName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  const currentTask = PROOF_TASKS.find(t => t.id === taskType) || PROOF_TASKS[0];

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('❌ Пожалуйста, выберите изображение (JPG, PNG, WEBP)', true);
      return;
    }
    try {
      const compressed = await compressImageToBase64(file);
      setImageBase64(compressed);
      setImageName(file.name);
    } catch (err) {
      showToast('❌ Не удалось обработать скриншот', true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageBase64 && !link.trim() && caption.trim().length < 5) {
      showToast('⚠️ Прикрепите скриншот или укажите ссылку / описание', true);
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/earn/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          userId: tgUser?.id || '3982051',
          username: tgUser?.username || null,
          firstName: tgUser?.first_name || 'Игрок',
          taskType,
          link: link.trim(),
          caption: caption.trim(),
          imageBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Пруф отправлен на проверку!');
        if (onSuccess) onSuccess(data.proof);
        onClose();
      } else {
        showToast(`❌ ${data.error || 'Ошибка отправки пруфа'}`, true);
      }
    } catch (err) {
      showToast('❌ Ошибка сети при отправке пруфа', true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📸</span>
            <div>
              <div className="modal-title" style={{ fontSize: '15px' }}>Отправка пруфа</div>
              <div style={{ fontSize: '11px', color: '#8a8f99' }}>Проверка модератором 5–30 минут</div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            padding: '12px 16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Task Type Selector */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '7px', letterSpacing: '0.5px' }}>
              Тип задания
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {PROOF_TASKS.map((t) => {
                const active = taskType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTaskType(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: active ? '1px solid #00e699' : '1px solid rgba(255,255,255,0.08)',
                      background: active ? 'rgba(0,230,153,0.12)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#00e699' : '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <span>{t.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link Input */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
              Ссылка / Профиль
            </div>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={currentTask.placeholder}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '13px',
                padding: '10px 12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
              Скриншот (по желанию или для отчёта)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {imageBase64 ? (
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(0,230,153,0.3)',
                background: 'rgba(0,0,0,0.3)'
              }}>
                <img
                  src={imageBase64}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', display: 'block' }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(14,16,22,0.9)',
                  fontSize: '11px',
                  color: '#c0c5d0'
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {imageName || 'Скриншот'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageBase64('');
                      setImageName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'rgba(255,77,77,0.15)',
                      border: '1px solid rgba(255,77,77,0.3)',
                      color: '#ff6b6b',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#c0c5d0',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🖼️ Выбрать скриншот из галереи</span>
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
              Комментарий
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Например: Выложил видео, набрало 10к просмотров / Поставил @RoyalX_Win в ник..."
              rows={3}
              maxLength={400}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '13px',
                padding: '10px 12px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="banner-btn"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '13px',
              fontWeight: 800,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isSending ? 0.6 : 1
            }}
          >
            {isSending ? (
              <span>Отправка...</span>
            ) : (
              <>
                <SendIcon size={15} color="#05140d" />
                <span>Отправить пруф</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
