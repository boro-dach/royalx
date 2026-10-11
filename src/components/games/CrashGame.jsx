import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { bjAudio } from '../../utils/blackjackAudio';
import { CloseIcon, TetherIcon } from '../common/Icons';
import GameHeader from './GameHeader';
import './Games.css';

// Color tiers matching black-green aesthetic: Green -> Emerald -> Gold -> Orange -> Magenta -> Cosmic Purple
export function getMultiplierTier(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 1.0;
  if (num < 1.50) {
    return {
      tier: 'tier-green',
      main: '#00e699',
      glow: 'rgba(0, 230, 153, 0.45)',
      border: 'rgba(0, 230, 153, 0.6)',
      bg: 'rgba(0, 230, 153, 0.12)'
    };
  }
  if (num < 2.00) {
    return {
      tier: 'tier-emerald',
      main: '#00cc88',
      glow: 'rgba(0, 204, 136, 0.45)',
      border: 'rgba(0, 204, 136, 0.6)',
      bg: 'rgba(0, 204, 136, 0.12)'
    };
  }
  if (num < 3.50) {
    return {
      tier: 'tier-gold',
      main: '#ffb800',
      glow: 'rgba(255, 184, 0, 0.5)',
      border: 'rgba(255, 184, 0, 0.65)',
      bg: 'rgba(255, 184, 0, 0.14)'
    };
  }
  if (num < 6.00) {
    return {
      tier: 'tier-orange',
      main: '#ff6b00',
      glow: 'rgba(255, 107, 0, 0.55)',
      border: 'rgba(255, 107, 0, 0.7)',
      bg: 'rgba(255, 107, 0, 0.15)'
    };
  }
  if (num < 10.00) {
    return {
      tier: 'tier-pink',
      main: '#ec4899',
      glow: 'rgba(236, 72, 153, 0.6)',
      border: 'rgba(236, 72, 153, 0.75)',
      bg: 'rgba(236, 72, 153, 0.16)'
    };
  }
  return {
    tier: 'tier-purple',
    main: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.7)',
    border: 'rgba(168, 85, 247, 0.8)',
    bg: 'rgba(168, 85, 247, 0.2)'
  };
}

export const AUTOCASHOUT_PRESETS = [1.2, 1.5, 2.0, 3.0, 5.0, 10.0];

export default function CrashGame({ onBack }) {
  const {
    balance,
    setBalance,
    syncBalance,
    recordGameBet,
    showToast,
    processBetForCashback,
    processBetForPass
  } = useApp();

  const [betAmount, setBetAmount] = useState(1);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);

  // Real-time server synchronized game state (24/7 continuous engine)
  const [serverRoundId, setServerRoundId] = useState(1);
  const [gameState, setGameState] = useState('waiting'); // 'waiting' | 'flying' | 'crashed'
  const [countdown, setCountdown] = useState(5);
  const [multiplier, setMultiplier] = useState(1.00);

  // Active bet in the current round & queued bet for next round
  const [activeBet, setActiveBet] = useState(() => {
    try {
      const saved = localStorage.getItem('crash_active_bet');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [queuedBet, setQueuedBet] = useState(() => {
    try {
      const saved = localStorage.getItem('crash_queued_bet');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Round outcomes history from server (cached in localStorage for instantaneous display without 2s delay)
  const [history, setHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('crash_server_history');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'h_1', mult: 1.83 },
      { id: 'h_2', mult: 2.45 },
      { id: 'h_3', mult: 1.35 },
      { id: 'h_4', mult: 3.12 },
      { id: 'h_5', mult: 1.60 },
      { id: 'h_6', mult: 4.80 },
      { id: 'h_7', mult: 2.15 },
      { id: 'h_8', mult: 1.42 }
    ];
  });

  // 2-second visual loading overlay upon entering Crash
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);

  useEffect(() => {
    let removeTimer = null;
    const fadeTimer = setTimeout(() => {
      setIsLoaderFading(true);
      removeTimer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 350);
    }, 2000); // Exactly 2 seconds visual overlay

    return () => {
      clearTimeout(fadeTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);

  // Modal State
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isClosingBetModal, setIsClosingBetModal] = useState(false);

  // Canvas & animation refs
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const multRef = useRef(1.00);
  const historyBarRef = useRef(null);

  // Clock sync refs
  const serverStartTimeRef = useRef(0);
  const clientClockOffsetRef = useRef(0);
  const crashedAtRef = useRef(null);

  // Mutable state refs to avoid effect re-creation
  const activeBetRef = useRef(activeBet);
  activeBetRef.current = activeBet;

  const queuedBetRef = useRef(queuedBet);
  queuedBetRef.current = queuedBet;

  const autoCashoutRef = useRef(autoCashout);
  autoCashoutRef.current = autoCashout;

  const autoCashoutEnabledRef = useRef(autoCashoutEnabled);
  autoCashoutEnabledRef.current = autoCashoutEnabled;

  const prevStatusRef = useRef(null);

  // Connect to 24/7 Server SSE Stream and Sync State
  useEffect(() => {
    let evtSource = null;
    let fallbackInterval = null;
    let sseReconnectTimer = null;

    const handleServerUpdate = (data) => {
      if (!data) return;
      const { 
        roundId, 
        status, 
        countdown: sCountdown, 
        multiplier: sMult, 
        startTime, 
        crashedAt, 
        history: sHistory, 
        serverTime 
      } = data;

      setServerRoundId(roundId);
      setGameState(status);
      setCountdown(sCountdown ?? 0);

      // Validate active bet round ID: if round has already passed, clear expired active bet!
      if (activeBetRef.current && activeBetRef.current.roundId && activeBetRef.current.roundId !== roundId) {
        setActiveBet(null);
        activeBetRef.current = null;
        try { localStorage.removeItem('crash_active_bet'); } catch (e) {}
      }

      // Validate queued bet: if target round has already passed while offline, refund!
      if (queuedBetRef.current && queuedBetRef.current.targetRoundId && queuedBetRef.current.targetRoundId < roundId) {
        const refundAmt = queuedBetRef.current.amount;
        setBalance(prev => {
          const next = parseFloat((prev + refundAmt).toFixed(2));
          syncBalance(next);
          return next;
        });
        setQueuedBet(null);
        queuedBetRef.current = null;
        try { localStorage.removeItem('crash_queued_bet'); } catch (e) {}
        showToast(`ℹ️ Раунд #${roundId} уже прошел. Ставка $${refundAmt} возвращена на баланс!`);
      }

      if (sHistory && Array.isArray(sHistory) && sHistory.length > 0) {
        setHistory(sHistory);
        try {
          localStorage.setItem('crash_server_history', JSON.stringify(sHistory));
        } catch (e) {}
      }

      if (startTime) {
        serverStartTimeRef.current = startTime;
        if (serverTime) {
          clientClockOffsetRef.current = serverTime - Date.now();
        }
      }

      // Transition to CRASHED
      if (status === 'crashed' && prevStatusRef.current !== 'crashed') {
        const finalVal = crashedAt || sMult || 1.00;
        crashedAtRef.current = finalVal;
        multRef.current = finalVal;
        setMultiplier(finalVal);
        if (prevStatusRef.current) {
          try { bjAudio.playExplosion(); } catch (e) {}
        }

        // Handle active bet: check if autoCashout was achieved before crash!
        const curActive = activeBetRef.current;
        if (curActive && !curActive.cashedOut && curActive.roundId === roundId) {
          if (curActive.autoCashout && finalVal >= curActive.autoCashout) {
            handleCashout(curActive.autoCashout);
          } else {
            processBetForCashback(curActive.amount);
            recordGameBet({
              game: 'Crash',
              betAmount: curActive.amount,
              winAmount: 0,
              isWin: false,
              multiplier: 0
            });
            showToast(`💥 Краш на x${finalVal.toFixed(2)}! Ставка потеряна`, true);
            setActiveBet(null);
            activeBetRef.current = null;
            try { localStorage.removeItem('crash_active_bet'); } catch (e) {}
          }
        }
      }

      // Transition to WAITING (New Round Countdown Started)
      if (status === 'waiting') {
        serverStartTimeRef.current = 0;
        crashedAtRef.current = null;
        multRef.current = 1.00;
        setMultiplier(1.00);

        // Clear finished active bet from previous round
        if (activeBetRef.current && activeBetRef.current.roundId !== roundId) {
          setActiveBet(null);
          activeBetRef.current = null;
          try { localStorage.removeItem('crash_active_bet'); } catch (e) {}
        }

        // Move queued bet to active bet for this newly started round!
        if (queuedBetRef.current) {
          const q = queuedBetRef.current;
          const newActive = {
            amount: q.amount,
            cashedOut: false,
            winAmount: 0,
            roundId: roundId,
            autoCashout: q.autoCashout
          };
          setActiveBet(newActive);
          activeBetRef.current = newActive;
          setQueuedBet(null);
          queuedBetRef.current = null;
          try {
            localStorage.setItem('crash_active_bet', JSON.stringify(newActive));
            localStorage.removeItem('crash_queued_bet');
          } catch (e) {}
          try { bjAudio.playChip(); } catch (e) {}
          showToast(`🎯 Ставка $${q.amount} активна в раунде #${roundId}!`);
        }
      }

      // Transition to FLYING
      if (status === 'flying' && prevStatusRef.current !== 'flying') {
        const curActive = activeBetRef.current;
        if (curActive && !curActive.cashedOut && curActive.roundId === roundId) {
          processBetForPass(curActive.amount, `crash_${roundId}`);
          try { bjAudio.playCard(); } catch (e) {}
        }
      }

      prevStatusRef.current = status;
    };

    const fetchState = async () => {
      try {
        const res = await fetch('/api/crash/state');
        if (res.ok) {
          const data = await res.json();
          handleServerUpdate(data);
        }
      } catch (e) {}
    };

    const connectSSE = () => {
      try {
        evtSource = new EventSource('/api/crash/stream');

        evtSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleServerUpdate(data);
          } catch (e) {}
        };

        evtSource.onerror = () => {
          if (evtSource) {
            evtSource.close();
            evtSource = null;
          }
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchState, 350);
          }
          if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
          sseReconnectTimer = setTimeout(connectSSE, 3000);
        };
      } catch (e) {
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchState, 350);
        }
      }
    };

    // Start active polling interval immediately to guarantee instant rounds on first launch
    fetchState();
    setTimeout(fetchState, 150);
    fallbackInterval = setInterval(fetchState, 500);

    connectSSE();

    return () => {
      if (evtSource) evtSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
    };
  }, []);

  // Auto-scroll history bar so newest result is always in view
  useEffect(() => {
    if (historyBarRef.current) {
      historyBarRef.current.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }
  }, [history, gameState]);

  // Handle Canvas Resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.max(1, Math.round(rect.width));
      const displayHeight = Math.max(1, Math.round(rect.height));

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    const ro = new ResizeObserver(syncCanvasSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Dedicated Upward-Rising Pulse Animation Loop (Smooth 60fps)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let running = true;

    const render = (now) => {
      if (!running) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);

        // 1. Sleek Minimalist Tech Background (Dark telemetry backdrop)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0c0f1a');
        bgGrad.addColorStop(0.55, '#080a13');
        bgGrad.addColorStop(1, '#05070d');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Ambient center radial glow
        const radGlow = ctx.createRadialGradient(width * 0.5, height * 0.42, 10, width * 0.5, height * 0.42, width * 0.65);
        radGlow.addColorStop(0, 'rgba(25, 36, 60, 0.42)');
        radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGlow;
        ctx.fillRect(0, 0, width, height);

        // Layout Grid Dimensions
        const paddingLeft = 24;
        const paddingRight = 24;
        const paddingTop = 42;
        const paddingBottom = 30;
        const drawWidth = width - paddingLeft - paddingRight;
        const drawHeight = height - paddingTop - paddingBottom;

        // Faint Minimalist Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        for (let i = 1; i <= 3; i++) {
          const y = paddingTop + (drawHeight * i) / 4;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(width - paddingRight, y);
          ctx.stroke();
        }
        ctx.setLineDash([]); // reset

        // Solid bottom baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, height - paddingBottom);
        ctx.lineTo(width - paddingRight, height - paddingBottom);
        ctx.stroke();

        // Tick marks along baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = paddingLeft; x <= width - paddingRight; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, height - paddingBottom);
          ctx.lineTo(x, height - paddingBottom + 4);
          ctx.stroke();
        }

        // 2. Upward Pulse Wave Dynamics
        if (gameState === 'waiting') {
          // Minimalist resting heartbeat EKG baseline pulse along bottom
          ctx.beginPath();
          const baseLineY = height - paddingBottom - 4;
          ctx.moveTo(paddingLeft, baseLineY);
          const travelPhase = (now * 0.00075) % 1;
          for (let x = paddingLeft; x <= width - paddingRight; x += 3) {
            const normX = (x - paddingLeft) / drawWidth;
            const distToBeat = Math.abs(((normX - travelPhase + 1) % 1) - 0.5);
            let spike = 0;
            if (distToBeat < 0.035) {
              const localPhase = (distToBeat / 0.035) * Math.PI;
              spike = Math.sin(localPhase * 2) * 9;
            }
            ctx.lineTo(x, baseLineY - spike);
          }
          ctx.strokeStyle = 'rgba(0, 230, 153, 0.55)';
          ctx.lineWidth = 2;
          ctx.shadowColor = 'rgba(0, 230, 153, 0.6)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          // FLYING or CRASHED: Upward-rising energy pulse wave
          const currentMult = multRef.current || 1.00;
          const tier = getMultiplierTier(currentMult);
          const isCrashed = gameState === 'crashed';
          const strokeColor = isCrashed ? '#ff3b3b' : tier.main;
          const glowColor = isCrashed ? 'rgba(255, 59, 59, 0.35)' : tier.glow;

          const dynamicMax = Math.max(10.0, currentMult * 1.35);
          const progress = Math.min(0.92, Math.max(0.02, Math.log(Math.max(1, currentMult)) / Math.log(dynamicMax)));

          const headX = paddingLeft + drawWidth * progress;
          const headY = (height - paddingBottom) - drawHeight * Math.pow(progress, 0.85);

          // Glowing area fill under wave
          const steps = Math.max(12, Math.floor(progress * 60));
          ctx.beginPath();
          ctx.moveTo(paddingLeft, height - paddingBottom);
          for (let s = 0; s <= steps; s++) {
            const p = (s / steps) * progress;
            const x = paddingLeft + drawWidth * p;
            const baseY = (height - paddingBottom) - drawHeight * Math.pow(p, 0.85);
            const ripple = !isCrashed ? Math.sin(p * 24 - now * 0.008) * 3.5 * p : 0;
            ctx.lineTo(x, baseY + ripple);
          }
          ctx.lineTo(headX, height - paddingBottom);
          ctx.closePath();

          const fillGrad = ctx.createLinearGradient(0, headY, 0, height - paddingBottom);
          fillGrad.addColorStop(0, glowColor);
          fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = fillGrad;
          ctx.fill();

          // Main Upward Rising Pulse Curve Line
          ctx.beginPath();
          ctx.moveTo(paddingLeft, height - paddingBottom);
          for (let s = 0; s <= steps; s++) {
            const p = (s / steps) * progress;
            const x = paddingLeft + drawWidth * p;
            const baseY = (height - paddingBottom) - drawHeight * Math.pow(p, 0.85);
            const ripple = !isCrashed ? Math.sin(p * 24 - now * 0.008) * 3.5 * p : 0;
            ctx.lineTo(x, baseY + ripple);
          }
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3.2;
          ctx.shadowColor = strokeColor;
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Leading Pulse Beacon & Radiating Rings at the tip
          if (!isCrashed) {
            const ring1R = 8 + (Math.sin(now * 0.009) * 0.5 + 0.5) * 12;
            ctx.beginPath();
            ctx.arc(headX, headY, ring1R, 0, Math.PI * 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = Math.max(0, 1 - ring1R / 20);
            ctx.stroke();
            ctx.globalAlpha = 1;

            const ring2R = 14 + (Math.sin(now * 0.009 + 1.6) * 0.5 + 0.5) * 14;
            ctx.beginPath();
            ctx.arc(headX, headY, ring2R, 0, Math.PI * 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.1;
            ctx.globalAlpha = Math.max(0, 1 - ring2R / 28);
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.arc(headX, headY, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = strokeColor;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Continuous flight growth loop synced to server timestamp
      if (gameState === 'flying') {
        const sStart = serverStartTimeRef.current || (Date.now() - 500);
        const elapsed = Math.max(0, (Date.now() - (sStart - (clientClockOffsetRef.current || 0))) / 1000);
        const currentMult = parseFloat(Math.pow(Math.E, 0.16 * elapsed).toFixed(2));
        
        multRef.current = Math.max(1.00, currentMult);
        setMultiplier(Math.max(1.00, currentMult));

        // Auto-cashout trigger
        const curActive = activeBetRef.current;
        if (
          curActive &&
          !curActive.cashedOut &&
          curActive.autoCashout &&
          currentMult >= curActive.autoCashout
        ) {
          handleCashout(curActive.autoCashout);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  // Place Bet Handler from Modal
  const handlePlaceBetFromModal = () => {
    if (balance < betAmount) {
      showToast('❌ Недостаточно средств!', true);
      return;
    }
    if (betAmount < 0.15) {
      showToast('❌ Минимальная ставка $0.15!', true);
      return;
    }

    // Prevent placing bet if active bet already exists for waiting round
    if (gameState === 'waiting' && activeBetRef.current && !activeBetRef.current.cashedOut) {
      showToast('⚠️ У вас уже есть активная ставка на этот раунд!', true);
      return;
    }

    // Prevent placing bet if already queued for next round
    if (gameState !== 'waiting' && queuedBetRef.current) {
      showToast('⚠️ У вас уже есть ставка в очереди на следующий раунд!', true);
      return;
    }

    const chosenAuto = autoCashoutEnabled && autoCashout ? parseFloat(Number(autoCashout).toFixed(2)) : null;

    if (gameState === 'waiting') {
      // Round is waiting: Place active bet immediately for this upcoming flight
      setBalance(prev => {
        const next = Math.max(0, parseFloat((prev - betAmount).toFixed(2)));
        syncBalance(next);
        return next;
      });
      const newActive = {
        amount: betAmount,
        cashedOut: false,
        winAmount: 0,
        roundId: serverRoundId,
        autoCashout: chosenAuto
      };
      setActiveBet(newActive);
      activeBetRef.current = newActive;
      try { localStorage.setItem('crash_active_bet', JSON.stringify(newActive)); } catch (e) {}
      try { bjAudio.playChip(); } catch (e) {}
      showToast(`✅ Ставка $${betAmount} принята!`);
    } else {
      // Round is flying or crashed: Queue bet for the next round!
      setBalance(prev => {
        const next = Math.max(0, parseFloat((prev - betAmount).toFixed(2)));
        syncBalance(next);
        return next;
      });
      const newQueued = {
        amount: betAmount,
        targetRoundId: serverRoundId + 1,
        autoCashout: chosenAuto
      };
      setQueuedBet(newQueued);
      queuedBetRef.current = newQueued;
      try { localStorage.setItem('crash_queued_bet', JSON.stringify(newQueued)); } catch (e) {}
      try { bjAudio.playChip(); } catch (e) {}
      showToast(`⏳ Ставка $${betAmount} в очереди на следующий раунд!`);
    }

    closeBetModal();
  };

  // Cancel Queued Bet
  const handleCancelQueuedBet = () => {
    const q = queuedBetRef.current;
    if (!q) return;
    const refundAmt = q.amount;
    queuedBetRef.current = null;
    setQueuedBet(null);
    try { localStorage.removeItem('crash_queued_bet'); } catch (e) {}
    setBalance(prev => {
      const next = parseFloat((prev + refundAmt).toFixed(2));
      syncBalance(next);
      return next;
    });
    showToast(`✅ Ставка $${refundAmt} отменена, средства возвращены!`);
  };

  // Cancel Active Bet (only allowed during 'waiting' phase before launch)
  const handleCancelActiveBet = () => {
    const cur = activeBetRef.current;
    if (!cur || cur.cashedOut || gameState !== 'waiting') return;
    const refundAmt = cur.amount;
    activeBetRef.current = null;
    setActiveBet(null);
    try { localStorage.removeItem('crash_active_bet'); } catch (e) {}
    setBalance(prev => {
      const next = parseFloat((prev + refundAmt).toFixed(2));
      syncBalance(next);
      return next;
    });
    showToast(`✅ Ставка $${refundAmt} отменена, средства возвращены!`);
  };

  // Cashout during flight
  const handleCashout = (currMult) => {
    const curActive = activeBetRef.current;
    if (!curActive || curActive.cashedOut) return;

    // Immediately mark cashed out synchronously to prevent race conditions
    curActive.cashedOut = true;
    activeBetRef.current = { ...curActive };

    const multToUse = currMult || multRef.current || multiplier;

    // If rocket already crashed, allow cashout ONLY if it was auto-cashout triggered before/at crash point
    if (gameState === 'crashed' && (!curActive.autoCashout || multToUse > (crashedAtRef.current || multRef.current))) {
      return;
    }

    const winAmt = parseFloat((curActive.amount * multToUse).toFixed(2));

    try { bjAudio.playCashout(); } catch (e) {}

    // recordGameBet optimistically adds winAmt to balance and persists to server
    recordGameBet({
      game: 'Crash',
      betAmount: curActive.amount,
      winAmount: winAmt,
      isWin: true,
      multiplier: multToUse
    });

    const updated = { ...curActive, cashedOut: true, winAmount: winAmt };
    setActiveBet(updated);
    activeBetRef.current = updated;
    try { localStorage.setItem('crash_active_bet', JSON.stringify(updated)); } catch (e) {}

    showToast(`🎉 Вы забрали $${winAmt.toFixed(2)} (x${multToUse.toFixed(2)})!`);
  };

  // Modal Handlers
  const openBetModal = () => {
    setIsBetModalOpen(true);
  };

  const closeBetModal = () => {
    setIsClosingBetModal(true);
    setTimeout(() => {
      setIsBetModalOpen(false);
      setIsClosingBetModal(false);
    }, 220);
  };

  const currentTier = getMultiplierTier(gameState === 'waiting' ? 1.00 : multiplier);

  return (
    <div className="game-screen crash-custom-screen">
      {/* 2-Second Visual Loading Overlay on top of Crash */}
      {isInitialLoading && (
        <div className={`crash-screen-loader ${isLoaderFading ? 'fade-out' : ''}`}>
          <div className="crash-loader-content">
            <div className="crash-loader-ring">
              <span className="crash-loader-rocket">🚀</span>
            </div>
            <div className="crash-loader-title">Загрузка Краш...</div>
            <div className="crash-loader-sub">Синхронизация с сервером 24/7</div>
            <div className="crash-loader-progress-track">
              <div className="crash-loader-progress-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <GameHeader title="Краш (Crash)" onBack={onBack} />

      {/* Main Single-Screen Layout */}
      <div className="crash-main-layout">
        {/* Space Flight Arena Card */}
        <div className="crash-space-card">
          <canvas ref={canvasRef} className="crash-space-canvas" />

          {/* Minimalist Multiplier HUD */}
          <div className="crash-minimalist-hud">
            <div
              className={`crash-huge-mult ${gameState === 'crashed' ? 'crashed' : ''}`}
              style={{
                color: gameState === 'crashed' ? '#ff3b3b' : currentTier.main,
                textShadow: gameState === 'crashed'
                  ? '0 0 28px rgba(255, 59, 59, 0.85)'
                  : `0 0 28px ${currentTier.glow}`
              }}
            >
              {gameState === 'waiting' ? `${countdown}s` : `x${multiplier.toFixed(2)}`}
            </div>
            <div className="crash-minimalist-status">
              {gameState === 'waiting' && `Ожидание ставок • Старт через ${countdown}с`}
              {gameState === 'flying' && `Раунд #${serverRoundId} в полете`}
              {gameState === 'crashed' && `Раунд #${serverRoundId} завершен`}
            </div>
          </div>

          {/* Crash Blast FX */}
          {gameState === 'crashed' && (
            <div className="crash-explosion-blast">
              <span className="crash-blast-emoji">💥</span>
            </div>
          )}
        </div>

        {/* History Pills Bar: Clean completed past rounds */}
        <div className="crash-history-pills-row" ref={historyBarRef}>
          {history.map((item, idx) => {
            const num = typeof item === 'number' ? item : item.mult;
            const tier = getMultiplierTier(num);
            return (
              <div
                key={item.id || idx}
                className={`crash-history-pill ${tier.tier}`}
                style={{
                  color: tier.main,
                  borderColor: tier.border,
                  backgroundColor: tier.bg
                }}
              >
                x{num.toFixed(2)}
              </div>
            );
          })}
        </div>

        {/* Bottom Betting Controls */}
        <div className="crash-bottom-controls-bar">
          {/* 1. In Flight with Active Bet -> CASHOUT */}
          {gameState === 'flying' && activeBet && !activeBet.cashedOut ? (
            <button
              className="crash-huge-action-btn btn-cashout"
              onClick={() => handleCashout(multiplier)}
            >
              Забрать ${(activeBet.amount * multiplier).toFixed(2)} (x{multiplier.toFixed(2)})
            </button>
          ) : /* 2. Waiting phase with Active Bet -> Status + CANCEL */
          gameState === 'waiting' && activeBet ? (
            <div className="crash-action-split-row">
              <button className="crash-huge-action-btn btn-waiting" disabled>
                Ставка ${activeBet.amount} • Старт {countdown}с
              </button>
              <button className="crash-cancel-btn" onClick={handleCancelActiveBet}>
                Отменить
              </button>
            </div>
          ) : /* 3. Queued Bet for Next Round -> Status + CANCEL */
          queuedBet ? (
            <div className="crash-action-split-row">
              <button className="crash-huge-action-btn btn-queued" disabled>
                В очереди на след. раунд (${queuedBet.amount})
              </button>
              <button className="crash-cancel-btn" onClick={handleCancelQueuedBet}>
                Отменить
              </button>
            </div>
          ) : /* 4. Cashed out in current flight -> Won badge + option to queue next round */
          activeBet && activeBet.cashedOut ? (
            <div className="crash-action-split-row">
              <button className="crash-huge-action-btn btn-cashed" disabled style={{ flex: 1 }}>
                +${activeBet.winAmount.toFixed(2)} 🏆
              </button>
              <button 
                className="mines-bet-trigger-btn" 
                style={{ flex: 1.25, height: '52px' }}
                onClick={openBetModal}
              >
                Ставка на след. раунд
              </button>
            </div>
          ) : /* 5. Default Idle -> Single Clean "Сделать ставку" Button */
          (
            <button
              className="mines-bet-trigger-btn"
              onClick={openBetModal}
            >
              Сделать ставку
            </button>
          )}
        </div>
      </div>

      {/* Slide-Up Bet & Settings Modal (TON Style, All on ONE Page, USD Centered Above Digits) */}
      {isBetModalOpen && (
        <div
          className={`modal-overlay ${isClosingBetModal ? 'closing' : ''} crash-ton-overlay`}
          onClick={closeBetModal}
        >
          <div
            className={`modal-container crash-ton-modal ${isClosingBetModal ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Centered Title + Round Dark Close Button */}
            <div className="crash-ton-header">
              <span className="crash-ton-title">
                {gameState === 'waiting' ? 'Сделать ставку' : 'Ставка на след. раунд'}
              </span>
              <button className="crash-ton-close-btn" onClick={closeBetModal}>
                <CloseIcon size={14} color="#8a8d98" />
              </button>
            </div>

            {/* Big Central Display Card: USD Centered Above Digits */}
            <div className="crash-ton-display-card">
              <span className="crash-ton-unit-above">USD</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.15"
                className="crash-ton-big-input"
                value={betAmount === 0 ? '' : betAmount}
                placeholder="0.15"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setBetAmount(0);
                    return;
                  }
                  const val = parseFloat(raw);
                  if (isNaN(val)) setBetAmount(0);
                  else setBetAmount(Math.min(balance, val));
                }}
              />
            </div>

            {/* Quick Chips Row for Bet */}
            <div className="crash-ton-chips-row">
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(0.15);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={14} /> 0.15</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(0.5);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={14} /> 0.5</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(1);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={14} /> 1</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.min(balance, parseFloat(((Number(prev) || 0) + 5).toFixed(2))));
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>+ <TetherIcon size={14} /> 5</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.min(balance, parseFloat(((Number(prev) || 0) * 2).toFixed(2))));
                }}
              >
                2X
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.max(0.15, parseFloat(((Number(prev) || 0) / 2).toFixed(2))));
                }}
              >
                ½
              </button>
            </div>

            {/* Auto-Cashout Section with Toggle */}
            <div className="crash-ton-sub-card">
              <div className="crash-ton-sub-header">
                <span className="crash-ton-sub-label">Автовывод</span>
                <button
                  type="button"
                  className={`crash-ton-toggle-switch ${autoCashoutEnabled ? 'active' : ''}`}
                  onClick={() => setAutoCashoutEnabled(prev => !prev)}
                >
                  <span className="crash-ton-toggle-knob" />
                </button>
              </div>

              {autoCashoutEnabled && (
                <div className="crash-ton-auto-body">
                  <div className="crash-ton-stepper-row">
                    <span className="crash-ton-stepper-title">Множитель</span>
                    <div className="crash-ton-stepper">
                      <button
                        type="button"
                        className="crash-ton-step-btn"
                        onClick={() => setAutoCashout(prev => Math.max(1.1, parseFloat((prev - 0.1).toFixed(2))))}
                      >
                        –
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        min="1.1"
                        max="100"
                        className="crash-ton-step-input"
                        value={autoCashout === 0 ? '' : autoCashout}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setAutoCashout('');
                            return;
                          }
                          const val = parseFloat(raw);
                          if (!isNaN(val)) setAutoCashout(Math.min(100, val));
                        }}
                        onBlur={() => {
                          const val = parseFloat(autoCashout);
                          if (isNaN(val) || val < 1.1) setAutoCashout(1.1);
                          else setAutoCashout(parseFloat(Math.min(100, val).toFixed(2)));
                        }}
                      />
                      <span className="crash-ton-step-x">x</span>
                      <button
                        type="button"
                        className="crash-ton-step-btn"
                        onClick={() => setAutoCashout(prev => Math.min(100, parseFloat((prev + 0.1).toFixed(2))))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="crash-ton-chips-row compact">
                    {AUTOCASHOUT_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className={`crash-ton-chip-pill ${autoCashout === preset ? 'active-chip' : ''}`}
                        onClick={() => setAutoCashout(preset)}
                      >
                        {preset}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Balance info */}
            <div className="crash-ton-balance-row">
              <span className="crash-ton-balance-title">Баланс:</span>
              <span className="crash-ton-balance-val">
                <TetherIcon size={22} />
                <span>{balance.toFixed(2)}</span>
              </span>
            </div>

            {/* Action Submit Button */}
            <button
              type="button"
              className="crash-ton-submit-btn"
              disabled={betAmount < 0.15 || betAmount > balance}
              onClick={handlePlaceBetFromModal}
            >
              {balance < betAmount
                ? 'Недостаточно средств'
                : gameState === 'waiting'
                ? `Сделать ставку (${betAmount} USDT)`
                : `В очередь на след. раунд (${betAmount} USDT)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
