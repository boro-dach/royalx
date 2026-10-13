import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { bjAudio } from '../../utils/blackjackAudio';
import { CloseIcon, TetherIcon } from '../common/Icons';
import GameHeader from './GameHeader';
import './Games.css';

const AUTOCASHOUT_PRESETS = [1.2, 1.5, 2.0, 3.0, 5.0, 10.0];

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

export default function CrashGame({ onBack }) {
  const {
    balance,
    setBalance,
    syncBalance,
    recordGameBet,
    showToast,
    processBetForCashback,
    processBetForPass,
    tgUser,
    userStats,
    userRtp,
    adminSettings,
    historyItems
  } = useApp();

  const currentUserId = tgUser?.id || '8281274109';

  const [betAmount, setBetAmount] = useState(1);
  const [autoCashout, setAutoCashout] = useState(() => {
    try {
      const saved = localStorage.getItem('crash_auto_cashout');
      return saved ? parseFloat(saved) : 2.0;
    } catch (e) {
      return 2.0;
    }
  });
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('crash_auto_cashout_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

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

  // Modal State
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isClosingBetModal, setIsClosingBetModal] = useState(false);

  // Result Box State (Matching Mines)
  const [showResultBox, setShowResultBox] = useState(false);
  const [isClosingResultBox, setIsClosingResultBox] = useState(false);
  const [resultBoxData, setResultBoxData] = useState({ isWin: false, amount: 0, mult: 1 });
  const resultBoxTimerRef = useRef(null);

  const dismissResultBox = () => {
    if (resultBoxTimerRef.current) clearTimeout(resultBoxTimerRef.current);
    setIsClosingResultBox(true);
    setTimeout(() => {
      setShowResultBox(false);
      setIsClosingResultBox(false);
    }, 200);
  };

  // Canvas & animation refs
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const multRef = useRef(1.00);
  const historyBarRef = useRef(null);

  const isCashingOutRef = useRef(false);
  const lastRenderedMultRef = useRef(1.00);
  const rocketImgRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/crash-rocket.png';
    img.onload = () => {
      rocketImgRef.current = img;
    };
  }, []);

  // Clock sync & stale packet guards
  const serverStartTimeRef = useRef(0);
  const clientClockOffsetRef = useRef(0);
  const lastServerRoundIdRef = useRef(0);
  const lastServerTimeRef = useRef(0);

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
  const processedRoundsRef = useRef(new Set());

  useEffect(() => {
    let evtSource = null;
    let pollTimer = null;
    let isSubscribed = true;

    const handleServerUpdate = (data) => {
      if (!isSubscribed || !data || typeof data.roundId !== 'number') return;
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

      // Drop stale / out-of-order packets
      if (roundId < lastServerRoundIdRef.current) return;
      if (roundId === lastServerRoundIdRef.current && serverTime && serverTime < lastServerTimeRef.current) return;

      const isNewRound = lastServerRoundIdRef.current !== 0 && lastServerRoundIdRef.current !== roundId;
      lastServerRoundIdRef.current = roundId;
      if (serverTime) lastServerTimeRef.current = serverTime;

      setServerRoundId(roundId);
      setGameState(status);
      setCountdown(sCountdown ?? 0);

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
      } else if (status === 'waiting') {
        serverStartTimeRef.current = 0;
      }

      // Transition to CRASHED - round crashed for everyone at target crash point!
      if (status === 'crashed') {
        const finalVal = crashedAt || sMult || 1.00;
        multRef.current = finalVal;
        setMultiplier(finalVal);

        if (!processedRoundsRef.current.has(roundId)) {
          processedRoundsRef.current.add(roundId);
          if (prevStatusRef.current === 'flying') {
            try { bjAudio.playExplosion(); } catch (e) {}
          }

          // Handle active bet with guaranteed auto-cashout check
          const curActive = activeBetRef.current;
          const isRtpLose = Boolean(
            userRtp === 'lose' ||
            (adminSettings && (adminSettings.globalRtp === 'lose' || adminSettings.crashRtp === 'lose'))
          );
          if (curActive && !curActive.cashedOut && curActive.roundId === roundId) {
            const targetAuto = curActive.autoCashout ? parseFloat(curActive.autoCashout) : null;
            if (targetAuto && finalVal >= targetAuto && !isRtpLose) {
              handleCashout(targetAuto);
            } else {
              processBetForCashback(curActive.amount);
              recordGameBet({
                game: 'Crash',
                betAmount: curActive.amount,
                winAmount: 0,
                isWin: false,
                multiplier: 0
              });
              // Show beautiful loss window (no top toast!)
              setResultBoxData({
                isWin: false,
                amount: curActive.amount,
                mult: 0
              });
              setIsClosingResultBox(false);
              setShowResultBox(true);
              if (resultBoxTimerRef.current) clearTimeout(resultBoxTimerRef.current);
              resultBoxTimerRef.current = setTimeout(dismissResultBox, 2600);

              setActiveBet(null);
              activeBetRef.current = null;
              localStorage.removeItem('crash_active_bet');
            }
          }
        }
      }

      // Transition to WAITING (New Round Countdown Started)
      if (status === 'waiting') {
        lastRenderedMultRef.current = 1.00;
        multRef.current = 1.00;
        setMultiplier(1.00);
        serverStartTimeRef.current = 0;

        // Clear expired bet from previous round
        if (activeBetRef.current && (activeBetRef.current.cashedOut || (activeBetRef.current.roundId && activeBetRef.current.roundId < roundId))) {
          setActiveBet(null);
          activeBetRef.current = null;
          localStorage.removeItem('crash_active_bet');
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
          localStorage.setItem('crash_active_bet', JSON.stringify(newActive));
          localStorage.removeItem('crash_queued_bet');
          try { bjAudio.playChip(); } catch (e) {}

          // Notify server of activated bet
          try {
            fetch('/api/crash/bet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUserId,
                amount: q.amount,
                autoCashout: q.autoCashout,
                roundId: roundId
              })
            }).catch(() => {});
          } catch (e) {}
        }
      }

      // Transition to FLYING
      if (status === 'flying') {
        // If it's a new round, or if multRef was still holding the old crashed multiplier (e.g. > sMult + 0.3)
        if (isNewRound || multRef.current > (sMult || 1.00) + 0.3 || (prevStatusRef.current !== 'flying' && sMult < multRef.current)) {
          multRef.current = sMult || 1.00;
          setMultiplier(sMult || 1.00);
        } else if (sMult && sMult > multRef.current) {
          multRef.current = sMult;
          setMultiplier(sMult);
        }

        // Real-time server packet auto-cashout check
        const curMult = sMult || multRef.current || 1.00;
        const curActive = activeBetRef.current;
        const isRtpLose = Boolean(
          userRtp === 'lose' ||
          (adminSettings && (adminSettings.globalRtp === 'lose' || adminSettings.crashRtp === 'lose'))
        );
        if (
          curActive &&
          !curActive.cashedOut &&
          curActive.autoCashout &&
          curMult >= curActive.autoCashout &&
          !isRtpLose
        ) {
          handleCashout(curActive.autoCashout);
        }

        if (prevStatusRef.current !== 'flying') {
          if (curActive && !curActive.cashedOut) {
            processBetForPass(curActive.amount, `crash_${roundId}`);
            try { bjAudio.playCard(); } catch (e) {}
          }
        }
      }

      prevStatusRef.current = status;
    };

    const fetchState = async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/crash/state?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        if (res.ok) {
          const data = await res.json();
          handleServerUpdate(data);
        }
      } catch (e) {}
    };

    const connectSSE = () => {
      if (!isSubscribed) return;
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
          if (isSubscribed) {
            setTimeout(connectSSE, 2000);
          }
        };
      } catch (e) {}
    };

    // Instant initial fetch + high-frequency heartbeat polling every 350ms
    fetchState();
    connectSSE();
    pollTimer = setInterval(fetchState, 350);

    // Refresh immediately on tab focus or screen wake
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchState();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchState);

    return () => {
      isSubscribed = false;
      if (evtSource) evtSource.close();
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchState);
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

  // Dedicated Silky-Smooth 60/120fps Continuous Trajectory Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let running = true;

    const render = (now) => {
      if (!running) return;

      // 1. Calculate Continuous Float Multiplier FIRST
      let continuousMult = multRef.current || 1.00;
      if (gameState === 'flying') {
        const sStart = serverStartTimeRef.current;
        if (sStart && sStart > 0) {
          const elapsed = Math.max(0, (Date.now() - (sStart - (clientClockOffsetRef.current || 0))) / 1000);
          continuousMult = Math.max(1.00, Math.pow(Math.E, 0.16 * elapsed));
        }
        multRef.current = continuousMult;

        // Auto-cashout trigger (continuous float check)
        const curActive = activeBetRef.current;
        const isRtpLose = Boolean(
          userRtp === 'lose' ||
          (adminSettings && (adminSettings.globalRtp === 'lose' || adminSettings.crashRtp === 'lose'))
        );
        if (
          curActive &&
          !curActive.cashedOut &&
          curActive.autoCashout &&
          continuousMult >= curActive.autoCashout &&
          !isRtpLose
        ) {
          handleCashout(curActive.autoCashout);
        }

        // Throttled UI state multiplier update (prevents React 60fps re-render lag)
        const rounded2 = parseFloat(continuousMult.toFixed(2));
        if (Math.abs(rounded2 - lastRenderedMultRef.current) >= 0.01) {
          lastRenderedMultRef.current = rounded2;
          setMultiplier(rounded2);
        }
      } else if (gameState === 'crashed') {
        continuousMult = multRef.current || 1.00;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);

        // Tech Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0c0f1a');
        bgGrad.addColorStop(0.55, '#080a13');
        bgGrad.addColorStop(1, '#05070d');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Center radial glow
        const radGlow = ctx.createRadialGradient(width * 0.5, height * 0.42, 10, width * 0.5, height * 0.42, width * 0.65);
        radGlow.addColorStop(0, 'rgba(25, 36, 60, 0.42)');
        radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGlow;
        ctx.fillRect(0, 0, width, height);

        // Layout Dimensions
        const paddingLeft = 24;
        const paddingRight = 36;
        const paddingTop = 42;
        const paddingBottom = 30;
        const drawWidth = width - paddingLeft - paddingRight;
        const drawHeight = height - paddingTop - paddingBottom;

        // Faint Grid Lines
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
        ctx.setLineDash([]);

        // Baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, height - paddingBottom);
        ctx.lineTo(width - paddingRight, height - paddingBottom);
        ctx.stroke();

        // Baseline ticks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = paddingLeft; x <= width - paddingRight; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, height - paddingBottom);
          ctx.lineTo(x, height - paddingBottom + 4);
          ctx.stroke();
        }

        if (gameState === 'waiting') {
          // Resting pulse line along baseline
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
          // FLYING or CRASHED: Ultra-smooth continuous aerodynamic curve
          const displayMult = continuousMult || 1.00;
          const tier = getMultiplierTier(displayMult);
          const isCrashed = gameState === 'crashed';
          const strokeColor = isCrashed ? '#ff3b3b' : tier.main;
          const glowColor = isCrashed ? 'rgba(255, 59, 59, 0.35)' : tier.glow;

          const dynamicMax = Math.max(10.0, displayMult * 1.35);
          const progress = Math.min(0.92, Math.max(0.015, Math.log(Math.max(1.0001, displayMult)) / Math.log(dynamicMax)));

          const headX = paddingLeft + drawWidth * progress;
          const headY = (height - paddingBottom) - drawHeight * Math.pow(progress, 0.82);

          // Smooth curve path (NO jittery sinusoidal ripple)
          const steps = Math.max(20, Math.floor(progress * 80));
          const curvePts = [];
          for (let s = 0; s <= steps; s++) {
            const p = (s / steps) * progress;
            const px = paddingLeft + drawWidth * p;
            const py = (height - paddingBottom) - drawHeight * Math.pow(p, 0.82);
            curvePts.push({ x: px, y: py });
          }

          // Glowing under-wave gradient area
          ctx.beginPath();
          ctx.moveTo(paddingLeft, height - paddingBottom);
          for (let i = 0; i < curvePts.length; i++) {
            ctx.lineTo(curvePts[i].x, curvePts[i].y);
          }
          ctx.lineTo(headX, height - paddingBottom);
          ctx.closePath();

          const fillGrad = ctx.createLinearGradient(0, headY, 0, height - paddingBottom);
          fillGrad.addColorStop(0, glowColor);
          fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = fillGrad;
          ctx.fill();

          // Smooth Neon Trajectory Line
          ctx.beginPath();
          ctx.moveTo(paddingLeft, height - paddingBottom);
          for (let i = 0; i < curvePts.length; i++) {
            ctx.lineTo(curvePts[i].x, curvePts[i].y);
          }
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3.2;
          ctx.shadowColor = strokeColor;
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Flight Angle Tangent
          const prevP = Math.max(0, progress - 0.02);
          const prevX = paddingLeft + drawWidth * prevP;
          const prevY = (height - paddingBottom) - drawHeight * Math.pow(prevP, 0.82);
          const flightAngle = Math.atan2(headY - prevY, headX - prevX);

          if (!isCrashed) {
            // Draw smooth glowing rocket / vessel at head of trajectory
            ctx.save();
            ctx.translate(headX, headY);
            ctx.rotate(flightAngle);

            // Radiant thruster exhaust flame behind rocket
            const exhaustLen = 14 + (Math.sin(now * 0.025) * 0.5 + 0.5) * 8;
            const exhaustGrad = ctx.createLinearGradient(-10, 0, -10 - exhaustLen, 0);
            exhaustGrad.addColorStop(0, '#ffffff');
            exhaustGrad.addColorStop(0.3, '#ffaa00');
            exhaustGrad.addColorStop(0.75, '#ff3b3b');
            exhaustGrad.addColorStop(1, 'rgba(255, 59, 59, 0)');
            ctx.fillStyle = exhaustGrad;
            ctx.beginPath();
            ctx.moveTo(-8, -3.5);
            ctx.lineTo(-8 - exhaustLen, 0);
            ctx.lineTo(-8, 3.5);
            ctx.closePath();
            ctx.fill();

            // Render rocket image or glowing futuristic jet
            if (rocketImgRef.current && rocketImgRef.current.complete) {
              const rSize = 36;
              ctx.drawImage(rocketImgRef.current, -rSize * 0.5, -rSize * 0.5, rSize, rSize);
            } else {
              // High-tech sleek beacon
              ctx.beginPath();
              ctx.arc(0, 0, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = strokeColor;
              ctx.shadowBlur = 12;
              ctx.fill();
            }
            ctx.restore();
          } else {
            // CRASHED: Flash blast burst at impact coordinates
            const blastR = 16 + (Math.sin(now * 0.015) * 0.5 + 0.5) * 8;
            ctx.beginPath();
            ctx.arc(headX, headY, blastR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 59, 59, 0.25)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(headX, headY, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3b3b';
            ctx.shadowColor = '#ff3b3b';
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
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

    let chosenAuto = null;
    const parsedAuto = parseFloat(String(autoCashout).replace(',', '.'));
    if (autoCashoutEnabled && !isNaN(parsedAuto) && parsedAuto >= 1.05) {
      chosenAuto = parseFloat(parsedAuto.toFixed(2));
    }

    const canBetActive = gameState === 'waiting' && countdown >= 1.0;

    const nextBal = Math.max(0, parseFloat((balance - betAmount).toFixed(2)));
    setBalance(nextBal);
    syncBalance(nextBal);

    if (canBetActive) {
      // Round is waiting with ample time: Place active bet immediately for this upcoming flight
      const newActive = {
        amount: betAmount,
        cashedOut: false,
        winAmount: 0,
        roundId: serverRoundId,
        autoCashout: chosenAuto
      };
      setActiveBet(newActive);
      activeBetRef.current = newActive;
      localStorage.setItem('crash_active_bet', JSON.stringify(newActive));
      try { bjAudio.playChip(); } catch (e) {}
      showToast(`✅ Ставка $${betAmount} принята!`);

      // Notify server of active bet immediately
      try {
        fetch('/api/crash/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            amount: betAmount,
            autoCashout: chosenAuto,
            roundId: serverRoundId
          })
        }).catch(() => {});
      } catch (e) {}
    } else {
      // Round is flying, crashed, or countdown is < 1.0s: Queue bet safely for the next round!
      const targetRound = (gameState === 'waiting' ? serverRoundId + 1 : (serverRoundId ? serverRoundId + 1 : 1));
      const newQueued = {
        amount: betAmount,
        targetRoundId: targetRound,
        autoCashout: chosenAuto
      };
      setQueuedBet(newQueued);
      queuedBetRef.current = newQueued;
      localStorage.setItem('crash_queued_bet', JSON.stringify(newQueued));
      try { bjAudio.playChip(); } catch (e) {}
      showToast(`⏳ Ставка $${betAmount} в очереди на следующий раунд!`);

      // Notify server of queued bet for next round
      try {
        fetch('/api/crash/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            amount: betAmount,
            autoCashout: chosenAuto,
            roundId: targetRound
          })
        }).catch(() => {});
      } catch (e) {}
    }

    closeBetModal();
  };

  // Cancel Queued Bet
  const handleCancelQueuedBet = () => {
    if (!queuedBet) return;
    const refundAmt = queuedBet.amount;
    setBalance(prev => {
      const next = parseFloat((prev + refundAmt).toFixed(2));
      syncBalance(next);
      return next;
    });
    setQueuedBet(null);
    queuedBetRef.current = null;
    localStorage.removeItem('crash_queued_bet');
    showToast(`✅ Ставка $${refundAmt} отменена, средства возвращены!`);
  };

  // Cancel Active Bet (only allowed during 'waiting' phase before launch)
  const handleCancelActiveBet = () => {
    if (!activeBet || gameState !== 'waiting') return;
    const refundAmt = activeBet.amount;
    setBalance(prev => {
      const next = parseFloat((prev + refundAmt).toFixed(2));
      syncBalance(next);
      return next;
    });
    setActiveBet(null);
    activeBetRef.current = null;
    localStorage.removeItem('crash_active_bet');
    showToast(`✅ Ставка $${refundAmt} отменена, средства возвращены!`);
  };

  // Cashout during flight
  const handleCashout = (currMult) => {
    const curActive = activeBetRef.current;
    if (!curActive || curActive.cashedOut) return;
    curActive.cashedOut = true;

    const isRtpLose = Boolean(
      userRtp === 'lose' ||
      (adminSettings && (adminSettings.globalRtp === 'lose' || adminSettings.crashRtp === 'lose'))
    );
    if (isRtpLose) {
      return;
    }

    const multToUse = parseFloat(Number(currMult || multRef.current || multiplier || 1.00).toFixed(2));
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

    const updated = { ...curActive, cashedOut: true, winAmount: winAmt, mult: multToUse };
    setActiveBet(updated);
    activeBetRef.current = updated;
    localStorage.setItem('crash_active_bet', JSON.stringify(updated));

    // Show beautiful win window (no top toast!)
    setResultBoxData({
      isWin: true,
      amount: winAmt,
      mult: multToUse
    });
    setIsClosingResultBox(false);
    setShowResultBox(true);
    if (resultBoxTimerRef.current) clearTimeout(resultBoxTimerRef.current);
    resultBoxTimerRef.current = setTimeout(dismissResultBox, 2600);

    try {
      confetti({
        particleCount: 55,
        spread: 70,
        startVelocity: 28,
        origin: { y: 0.55 },
        colors: ['#00e699', '#38ef7d', '#00ffc8', '#ffffff', '#ffd200'],
        zIndex: 999999
      });
    } catch (e) {}
  };

  // Modal Handlers
  const openBetModal = () => {
    dismissResultBox();
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
              {gameState === 'waiting' ? `${countdown}s` : `x${(Number(multiplier) || 1.00).toFixed(2)}`}
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

          {/* Central Result Box (Win or Loss like in Mines) */}
          {showResultBox && !isBetModalOpen && (
            <div
              className={`mines-win-box ${resultBoxData.isWin ? 'win' : 'loss'} ${isClosingResultBox ? 'closing' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                dismissResultBox();
              }}
            >
              <span className="mines-win-label">{resultBoxData.isWin ? 'Выигрыш' : 'Проигрыш'}</span>
              <span className="mines-win-value">
                {resultBoxData.isWin ? `+$${resultBoxData.amount.toFixed(2)}` : `-$${resultBoxData.amount.toFixed(2)}`}
              </span>
              <span className="mines-win-multiplier">
                {resultBoxData.isWin ? `x${Number(resultBoxData.mult.toFixed(2))}` : '0.00x'}
              </span>
            </div>
          )}
        </div>

        {/* History Pills Bar: Clean completed past rounds */}
        <div className="crash-history-pills-row" ref={historyBarRef}>
          {Array.isArray(history) && history.map((item, idx) => {
            const num = typeof item === 'number' ? item : (parseFloat(item?.mult) || 1.00);
            const tier = getMultiplierTier(num);
            return (
              <div
                key={item?.id || idx}
                className={`crash-history-pill ${tier.tier}`}
                style={{
                  color: tier.main,
                  borderColor: tier.border,
                  backgroundColor: tier.bg
                }}
              >
                x{Number(num).toFixed(2)}
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
              Забрать ${((Number(activeBet.amount) || 0) * (Number(multiplier) || 1.00)).toFixed(2)} (x${(Number(multiplier) || 1.00).toFixed(2)})
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
                +${(Number(activeBet.winAmount) || 0).toFixed(2)} 🏆
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
                  onClick={() => {
                    setAutoCashoutEnabled(prev => {
                      const next = !prev;
                      try { localStorage.setItem('crash_auto_cashout_enabled', JSON.stringify(next)); } catch (e) {}
                      return next;
                    });
                  }}
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
                        onClick={() => {
                          setAutoCashout(prev => {
                            const next = Math.max(1.1, parseFloat((prev - 0.1).toFixed(2)));
                            try { localStorage.setItem('crash_auto_cashout', String(next)); } catch (e) {}
                            return next;
                          });
                        }}
                      >
                        –
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        min="1.1"
                        max="100"
                        className="crash-ton-step-input"
                        value={autoCashout}
                        onChange={(e) => {
                          const raw = String(e.target.value).replace(',', '.');
                          const val = parseFloat(raw);
                          if (!isNaN(val)) {
                            const bounded = Math.max(1.1, Math.min(100, val));
                            setAutoCashout(bounded);
                            try { localStorage.setItem('crash_auto_cashout', String(bounded)); } catch (e) {}
                          }
                        }}
                      />
                      <span className="crash-ton-step-x">x</span>
                      <button
                        type="button"
                        className="crash-ton-step-btn"
                        onClick={() => {
                          setAutoCashout(prev => {
                            const next = Math.min(100, parseFloat((prev + 0.1).toFixed(2)));
                            try { localStorage.setItem('crash_auto_cashout', String(next)); } catch (e) {}
                            return next;
                          });
                        }}
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
                        onClick={() => {
                          setAutoCashout(preset);
                          setAutoCashoutEnabled(true);
                          try {
                            localStorage.setItem('crash_auto_cashout', String(preset));
                            localStorage.setItem('crash_auto_cashout_enabled', 'true');
                          } catch (e) {}
                        }}
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
                <span>{(Number(balance) || 0).toFixed(2)}</span>
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
                : (gameState === 'waiting' && countdown >= 1.0)
                ? `Сделать ставку (${betAmount} USDT)`
                : `В очередь на след. раунд (${betAmount} USDT)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
