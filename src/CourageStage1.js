import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CourageStage1.css';
import {
  TILE_SIZE,
  calculateCourageConstants,
  COURAGE_IMAGE_ASSETS,
  COURAGE_AUDIO_ASSETS,
  TIMINGS,
  HEALTH,
  COLLISION_RANGES,
  SPEEDS,
  VOLUMES,
  UI_TEXT,
  getPositions,
} from './constants/courage-constants';

const asset = (name) => `${process.env.PUBLIC_URL || ''}/assets/courage/${name}`;

// Eagerly preload all CourageStage1 assets — runs only when this module is lazy-loaded at /courage
COURAGE_IMAGE_ASSETS.forEach(name => { const img = new Image(); img.src = asset(name); });

COURAGE_AUDIO_ASSETS.forEach(name => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'audio';
  link.href = asset(name);
  document.head.appendChild(link);
});

const { WORLD_WIDTH, GRASS_TILE_COUNT, MURIAL_X, HOME_X, SOIL_X } = calculateCourageConstants();

function CourageStage1() {
  const [player, setPlayer] = useState({ x: getPositions().PLAYER_START_X, y: getPositions().PLAYER_START_Y, vx: 0, vy: 0, onGround: true, facing: 'right', state: 'standing' });
  const [showIntro, setShowIntro] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showSlabDialog, setShowSlabDialog] = useState(false);
  const [hasFoundSlab, setHasFoundSlab] = useState(false);
  const [showPlayerThought, setShowPlayerThought] = useState(false);
  const [windGusts, setWindGusts] = useState([]);
  const [slabDiscoveryX, setSlabDiscoveryX] = useState(null);
  const [showSpider, setShowSpider] = useState(false);
  const [spiderX, setSpiderX] = useState(SOIL_X);
  const [showSuspenseMessage, setShowSuspenseMessage] = useState(false);
  const [showKingRamses, setShowKingRamses] = useState(false);
  const [showSurviveText, setShowSurviveText] = useState(false);
  const [kingRamsesHealth, setKingRamsesHealth] = useState(100);
  const [bats, setBats] = useState([]);
  const [nearbyBatId, setNearbyBatId] = useState(null);
  const [returnBats, setReturnBats] = useState([]);
  const [rollingTablet, setRollingTablet] = useState(null);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [kingRamsesFading, setKingRamsesFading] = useState(false);
  const [showBossDefeatedText, setShowBossDefeatedText] = useState(false);
  const [showReturnToMuriel, setShowReturnToMuriel] = useState(false);
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const [isMobile] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const nearbyBatIdRef = useRef(null);
  const kingRamsesHealthRef = useRef(100);
  const bossDefeatedRef = useRef(false);
  const showReturnToMurielRef = useRef(false);
  const bossDefeatedAudioRef = useRef(null);
  const spiderIntervalRef = useRef(null);
  const batSpawnIntervalRef = useRef(null);
  const gameOverRef = useRef(false);
  const spiderXRef = useRef(SOIL_X);
  const batsRef = useRef([]);
  const suspenseAudioRef = useRef(null);
  const pattharAudioRef = useRef(null);
  const thunderAudioRef = useRef(null);
  const isCinematicRef = useRef(false);
  const cinematicTargetXRef = useRef(null);
  const rollingTabletRef = useRef(null);
  const hasFoundSlabRef = useRef(false);
  const controlsRef = useRef({ left: false, right: false, shift: false });
  const joystickRef = useRef(null);
  const joystickKnobRef = useRef(null);
  const joystickActiveRef = useRef(false);
  const playerRef = useRef(player);
  const gameFrameRef = useRef(null);
  const audioRef = useRef(null);
  const screamAudioRef = useRef(null);
  const startedRef = useRef(false);
  const hasPlayedScreamRef = useRef(false);
  const windAudioRef = useRef(null);
  const thoughtTimerRef = useRef(null);

  // Update playerRef
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { spiderXRef.current = spiderX; }, [spiderX]);
  useEffect(() => { batsRef.current = bats; }, [bats]);
  useEffect(() => { nearbyBatIdRef.current = nearbyBatId; }, [nearbyBatId]);
  useEffect(() => { kingRamsesHealthRef.current = kingRamsesHealth; }, [kingRamsesHealth]);
  useEffect(() => { rollingTabletRef.current = rollingTablet; }, [rollingTablet]);
  useEffect(() => { hasFoundSlabRef.current = hasFoundSlab; }, [hasFoundSlab]);

  // Camera follows player, clamped to world bounds
  const cameraX = useMemo(() => {
    if ((showKingRamses || bossDefeated || isCinematic) && !showReturnToMuriel) return window.innerWidth * 2;
    const half = window.innerWidth / 2;
    const raw = player.x - half;
    return Math.max(0, Math.min(raw, WORLD_WIDTH - window.innerWidth));
  }, [player.x, showKingRamses, bossDefeated, showReturnToMuriel, isCinematic]);

  // Show Muriel speech bubble when player is nearby
  const showMurialText = useMemo(() => {
    const collisionRange = COLLISION_RANGES.MURIEL_TEXT;
    return Math.abs(player.x + 40 - (MURIAL_X + 50)) < collisionRange;
  }, [player.x]);

  // Show soil callout when player is nearby
  const showSoilCallout = useMemo(() => {
    if (hasFoundSlab) return false;
    const collisionRange = COLLISION_RANGES.SOIL_CALLOUT;
    return Math.abs(player.x + 40 - (SOIL_X + 40)) < collisionRange;
  }, [hasFoundSlab, player.x]);

  // Setup music
  useEffect(() => {
    const audio = new Audio(asset('courage-theme.mp3'));
    audio.loop = false;
    audio.volume = VOLUMES.MUSIC;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Setup scream audio
  useEffect(() => {
    const screamAudio = new Audio(asset('courage_scream.mp3'));
    screamAudio.volume = VOLUMES.SCREAM;
    screamAudioRef.current = screamAudio;

    return () => {
      screamAudioRef.current = null;
    };
  }, []);

  // Setup wind audio
  useEffect(() => {
    const windAudio = new Audio(asset('wind.mp3'));
    windAudio.volume = VOLUMES.WIND;
    windAudioRef.current = windAudio;
    return () => { windAudioRef.current = null; };
  }, []);

  // Setup boss defeated audio
  useEffect(() => {
    const bossAudio = new Audio(asset('boss_defeated.mp3'));
    bossAudio.volume = VOLUMES.BOSS_DEFEATED;
    bossDefeatedAudioRef.current = bossAudio;
    return () => { bossAudio.pause(); bossDefeatedAudioRef.current = null; };
  }, []);

  // Setup suspense audio
  useEffect(() => {
    const suspenseAudio = new Audio(asset('suspense.mp3'));
    suspenseAudio.volume = VOLUMES.SUSPENSE;
    suspenseAudioRef.current = suspenseAudio;
    return () => { suspenseAudioRef.current = null; };
  }, []);

  // Setup thunder audio
  useEffect(() => {
    const thunderAudio = new Audio(asset('thunder.mp3'));
    thunderAudio.loop = true;
    thunderAudio.volume = VOLUMES.THUNDER;
    thunderAudioRef.current = thunderAudio;
    return () => {
      thunderAudio.pause();
      thunderAudioRef.current = null;
    };
  }, []);

  // Setup patthar lauta do audio
  useEffect(() => {
    const pattharAudio = new Audio(asset('patthar_lauta_do.mp3'));
    pattharAudio.loop = true;
    pattharAudio.volume = VOLUMES.PATTHAR;
    pattharAudioRef.current = pattharAudio;
    return () => {
      pattharAudio.pause();
      pattharAudioRef.current = null;
    };
  }, []);

  // Handle music toggle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!showIntro && musicOn) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [showIntro, musicOn]);

  // Track portrait orientation for mobile
  useEffect(() => {
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === 'enter' && !startedRef.current) {
        startedRef.current = true;
        setShowIntro(false);
      }

      if (key === 'arrowleft' || key === 'a') {
        controlsRef.current.left = true;
      }

      if (key === 'arrowright' || key === 'd') {
        controlsRef.current.right = true;
        // Hide suspense message when right direction is pressed with Shift
        if (controlsRef.current.shift && showSuspenseMessage) {
          setShowSuspenseMessage(false);
        }
      }

      if (key === 'shift') {
        // Trigger scream on shift press only if moving (A/D/arrow + Shift)
        const isMoving = controlsRef.current.left || controlsRef.current.right;
        if (isMoving && !controlsRef.current.shift && !showIntro && !hasPlayedScreamRef.current) {
          hasPlayedScreamRef.current = true;

          // Play scream immediately
          if (screamAudioRef.current) {
            // Lower background music
            if (audioRef.current) {
              audioRef.current.volume = 0.1;
            }

            // Play scream
            screamAudioRef.current.currentTime = 0;
            screamAudioRef.current.play().catch(() => {});

            // Resume volume after 1500ms
            setTimeout(() => {
              if (audioRef.current && musicOn) {
                audioRef.current.volume = 0.35;
              }
            }, 1500);
          }
        }
        // Hide suspense message when Shift is pressed with right direction
        if (controlsRef.current.right && showSuspenseMessage) {
          setShowSuspenseMessage(false);
        }

        controlsRef.current.shift = true;
      }

      if ((key === 's' || key === 'arrowdown') && !showIntro) {
        const nearSoil = !hasFoundSlab && Math.abs(playerRef.current.x + 40 - (SOIL_X + 40)) < 80;
        if (nearSoil) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          if (screamAudioRef.current) {
            screamAudioRef.current.pause();
            screamAudioRef.current.currentTime = 0;
          }
          setMusicOn(false);
          setHasFoundSlab(true);
          setShowSlabDialog(true);
        }
      }

      if (key === 'enter' && showSlabDialog) {
        event.preventDefault();
        handleSlabOk();
      }

      if (key === 'f') {
        if (!hasFoundSlabRef.current) {
          const nearSoil = Math.abs(playerRef.current.x + 40 - (SOIL_X + 40)) < 80;
          if (nearSoil) {
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
            if (screamAudioRef.current) { screamAudioRef.current.pause(); screamAudioRef.current.currentTime = 0; }
            setMusicOn(false);
            hasFoundSlabRef.current = true;
            setHasFoundSlab(true);
            setShowSlabDialog(true);
          }
        } else if (kingRamsesHealthRef.current <= 0 && !bossDefeatedRef.current && !rollingTablet) {
          const px = playerRef.current.x;
          const krX = window.innerWidth * 2.75 + 60;
          setRollingTablet({
            id: Date.now(),
            startX: px,
            endX: krX,
            spawnedAt: Date.now(),
          });
        } else if (nearbyBatIdRef.current !== null) {
          const batId = nearbyBatIdRef.current;
          const px = playerRef.current.x;
          setBats((prev) => prev.filter((b) => b.id !== batId));
          setNearbyBatId(null);
          nearbyBatIdRef.current = null;
          const krX = window.innerWidth * 2.75 + 60;
          const returnBatId = Date.now();
          setReturnBats((prev) => [...prev, {
            id: returnBatId,
            startX: px,
            endX: krX,
            startY: window.innerHeight - 160,
            endY: window.innerHeight - 200,
            peakY: window.innerHeight - 350,
            spawnedAt: Date.now(),
          }]);
        }
      }

      if (['arrowleft', 'arrowright', 'a', 'd', 'shift', 'enter', 's', 'arrowdown'].includes(key)) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event) => {
      const key = event.key.toLowerCase();

      if (key === 'arrowleft' || key === 'a') {
        controlsRef.current.left = false;
      }

      if (key === 'arrowright' || key === 'd') {
        controlsRef.current.right = false;
      }

      if (key === 'shift') {
        controlsRef.current.shift = false;
        // Reset scream flag when shift is released
        hasPlayedScreamRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [hasFoundSlab, showIntro, musicOn, showSuspenseMessage]);

  // Game loop
  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      setPlayer((prev) => {
        let vx = 0;
        let x = prev.x;
        let facing = prev.facing;
        let newState = 'standing';

        // Cinematic walk override
        if (isCinematicRef.current && cinematicTargetXRef.current !== null) {
          const target = cinematicTargetXRef.current;
          const diff = target - x;
          if (Math.abs(diff) > SPEEDS.CINEMATIC_WALK) {
            x += diff < 0 ? -SPEEDS.CINEMATIC_WALK : SPEEDS.CINEMATIC_WALK;
            facing = diff < 0 ? 'left' : 'right';
            newState = 'walking';
          } else {
            x = target;
            newState = 'standing';
          }
          return { x, y: 0, vx: 0, vy: 0, onGround: true, facing, state: newState };
        }

        const speedScale = isMobile ? 0.55 : 1;
        const moveSpeed = SPEEDS.MOVE * speedScale;
        const runSpeed = SPEEDS.RUN * speedScale;

        if (controlsRef.current.left && !controlsRef.current.right) {
          vx = controlsRef.current.shift ? -runSpeed : -moveSpeed;
          facing = 'left';
          newState = controlsRef.current.shift ? 'running' : 'walking';
        }

        if (controlsRef.current.right && !controlsRef.current.left) {
          vx = controlsRef.current.shift ? runSpeed : moveSpeed;
          facing = 'right';
          newState = controlsRef.current.shift ? 'running' : 'walking';
        }

        x += vx;

        // Keep player within bounds
        let minX = 0;
        let maxX = WORLD_WIDTH - getPositions().PLAYER_WIDTH;
        if (slabDiscoveryX !== null && !showSpider) {
          maxX = Math.min(slabDiscoveryX + 150, WORLD_WIDTH - 80);
        }
        if ((showKingRamses || bossDefeatedRef.current) && !showReturnToMurielRef.current) {
          minX = window.innerWidth * 2;
          maxX = getPositions().KING_RAMSES_PAGE_X;
        }
        if (x < minX) x = minX;
        if (x > maxX) x = maxX;

        return { x, y: 0, vx, vy: 0, onGround: true, facing, state: newState };
      });

      // Collision detection
      if (!gameOverRef.current) {
        const p = playerRef.current;
        const pLeft = p.x;
        const pRight = p.x + getPositions().PLAYER_WIDTH;
        const pTop = window.innerHeight - 200;
        const pBottom = window.innerHeight - 50;

        // Spider collision
        if (showSpider) {
          const sx = spiderXRef.current;
          if (pRight > sx && pLeft < sx + 80) {
            triggerGameOverRef.current();
          }
        }

        // King Ramses collision
        if (showKingRamses && !bossDefeatedRef.current) {
          const krLeft = getPositions().KING_RAMSES_PAGE_X;
          if (pRight > krLeft && pLeft < krLeft + COLLISION_RANGES.KING_RAMSES) {
            triggerGameOverRef.current();
          }
        }

        // Muriel collision after boss defeated text clears
        if (showReturnToMurielRef.current) {
          const murielLeft = MURIAL_X;
          if (pRight > murielLeft && pLeft < murielLeft + 100) {
            if (!gameOverRef.current) {
              gameOverRef.current = true;
              setShowWinOverlay(true);
            }
          }
        }

        // Bat proximity detection (for F key throw-back)
        const now = Date.now();
        let foundNearby = null;
        for (const bat of batsRef.current) {
          const t = Math.min((now - bat.spawnedAt) / 1500, 1);
          const batX = bat.startX + (bat.endX - bat.startX) * t;
          const batTop = t <= 0.5
            ? bat.startY + (bat.peakY - bat.startY) * (t / 0.5)
            : bat.peakY + (bat.endY - bat.peakY) * ((t - 0.5) / 0.5);
          const inRange = pRight + COLLISION_RANGES.BAT_PROXIMITY.horizontal > batX && pLeft - COLLISION_RANGES.BAT_PROXIMITY.horizontal < batX + 30 && pBottom + COLLISION_RANGES.BAT_PROXIMITY.vertical > batTop && pTop - COLLISION_RANGES.BAT_PROXIMITY.vertical < batTop + 28;
          if (inRange) { foundNearby = bat.id; break; }
        }
        if (foundNearby !== nearbyBatIdRef.current) {
          nearbyBatIdRef.current = foundNearby;
          setNearbyBatId(foundNearby);
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [slabDiscoveryX, showSpider, showKingRamses]);

  // Stop bat spawning when King Ramses health hits 0
  useEffect(() => {
    if (kingRamsesHealth <= HEALTH.KING_RAMSES_MAX * 0) {
      if (batSpawnIntervalRef.current) clearInterval(batSpawnIntervalRef.current);
      setBats([]);
      setNearbyBatId(null);
      nearbyBatIdRef.current = null;
    }
  }, [kingRamsesHealth]);

  // Game over trigger
  const triggerGameOver = () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    if (spiderIntervalRef.current) clearInterval(spiderIntervalRef.current);
    if (batSpawnIntervalRef.current) clearInterval(batSpawnIntervalRef.current);
    if (thoughtTimerRef.current) clearTimeout(thoughtTimerRef.current);
    [audioRef, screamAudioRef, windAudioRef, suspenseAudioRef, pattharAudioRef, thunderAudioRef].forEach((ref) => {
      if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
    });
    setShowGameOver(true);
  };
  const triggerGameOverRef = useRef(triggerGameOver);
  useEffect(() => { triggerGameOverRef.current = triggerGameOver; });

  // Replay handler
  const handleReplay = () => {
    gameOverRef.current = false;
    setShowGameOver(false);
    setPlayer({ x: getPositions().PLAYER_START_X, y: getPositions().PLAYER_START_Y, vx: 0, vy: 0, onGround: true, facing: 'right', state: 'standing' });
    setShowIntro(true);
    setShowSlabDialog(false);
    setHasFoundSlab(false);
    setShowPlayerThought(false);
    setWindGusts([]);
    setSlabDiscoveryX(null);
    setShowSpider(false);
    setSpiderX(SOIL_X);
    setShowSuspenseMessage(false);
    setShowKingRamses(false);
    setShowSurviveText(false);
    setKingRamsesHealth(HEALTH.KING_RAMSES_MAX);
    setBats([]);
    setNearbyBatId(null);
    setReturnBats([]);
    setRollingTablet(null);
    setBossDefeated(false);
    setKingRamsesFading(false);
    setShowBossDefeatedText(false);
    setShowReturnToMuriel(false);
    setShowWinOverlay(false);
    setIsCinematic(false);
    nearbyBatIdRef.current = null;
    kingRamsesHealthRef.current = HEALTH.KING_RAMSES_MAX;
    bossDefeatedRef.current = false;
    showReturnToMurielRef.current = false;
    isCinematicRef.current = false;
    cinematicTargetXRef.current = null;
    startedRef.current = false;
    hasPlayedScreamRef.current = false;
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  // Get player sprite
  const getPlayerSprite = () => {
    if (player.state === 'running') {
      return asset('courage-running.gif');
    }
    if (player.state === 'walking') {
      return asset('courage-walking.gif');
    }
    return asset('courage-standing.gif');
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (thoughtTimerRef.current) clearTimeout(thoughtTimerRef.current);
      if (spiderIntervalRef.current) clearInterval(spiderIntervalRef.current);
      if (batSpawnIntervalRef.current) clearInterval(batSpawnIntervalRef.current);
    };
  }, []);

  const handleSlabOk = () => {
    setShowSlabDialog(false);

    // Spawn wind gusts once
    const count = 4 + Math.floor(Math.random() * 2);
    const gusts = Array.from({ length: count }, (_, i) => ({
      id: Date.now() * 100 + i,
      top: 60 + Math.random() * (window.innerHeight * 0.55),
      duration: TIMINGS.WIND_GUST_MIN_DURATION + Math.random() * TIMINGS.WIND_GUST_MAX_DURATION_OFFSET,
      delay: i * TIMINGS.WIND_GUST_DELAY,
    }));
    setWindGusts(gusts);

    if (windAudioRef.current) {
      windAudioRef.current.currentTime = 0;
      windAudioRef.current.play().catch(() => {});
    }

    const maxDur = Math.max(...gusts.map((g) => g.duration + g.delay));
    setTimeout(() => setWindGusts([]), maxDur + 200);

    // Show player thought after timing
    if (thoughtTimerRef.current) clearTimeout(thoughtTimerRef.current);
    thoughtTimerRef.current = setTimeout(() => {
      setShowPlayerThought(true);
      setTimeout(() => {
        setShowPlayerThought(false);
        // Show spider and animate it rightward
        setShowSpider(true);
        setShowSuspenseMessage(true);
        setSpiderX(SOIL_X);
        if (suspenseAudioRef.current) {
          suspenseAudioRef.current.currentTime = 0;
          suspenseAudioRef.current.play().catch(() => {});
        }
        if (thunderAudioRef.current) {
          thunderAudioRef.current.currentTime = 0;
          thunderAudioRef.current.play().catch(() => {});
        }
        if (spiderIntervalRef.current) clearInterval(spiderIntervalRef.current);
        let currentX = SOIL_X;
        const spiderSpeed = SPEEDS.SPIDER;
        const spiderExitX = SOIL_X + window.innerWidth;
        spiderIntervalRef.current = setInterval(() => {
          currentX += spiderSpeed;
          setSpiderX(currentX);
          if (currentX > spiderExitX) {
            clearInterval(spiderIntervalRef.current);
            setShowSpider(false);
            setShowSuspenseMessage(false);
            if (thunderAudioRef.current) { thunderAudioRef.current.pause(); thunderAudioRef.current.currentTime = 0; }
            setSlabDiscoveryX(null);
            // Cinematic: teleport player to center of screen 3, walk left over 3s
            isCinematicRef.current = true;
            cinematicTargetXRef.current = getPositions().CINEMATIC_TARGET_X;
            setIsCinematic(true);
            setPlayer((prev) => ({ ...prev, x: getPositions().CINEMATIC_SPAWN_X, facing: 'left', state: 'walking' }));
            // After cinematic duration: end cinematic and reveal King Ramses
            setTimeout(() => {
              isCinematicRef.current = false;
              cinematicTargetXRef.current = null;
              setIsCinematic(false);
              setShowKingRamses(true);
              setShowSurviveText(true);
              setTimeout(() => setShowSurviveText(false), TIMINGS.SURVIVE_TEXT_DURATION);
              setTimeout(() => {
                const spawnBat = () => {
                  const px = playerRef.current.x;
                  setBats((prev) => [...prev, {
                    id: Date.now(),
                    startX: getPositions().BAT_SPAWN_X,
                    endX: px,
                    startY: window.innerHeight - 200,
                    endY: window.innerHeight - 140,
                    peakY: window.innerHeight - 300,
                    spawnedAt: Date.now(),
                  }]);
                };
                spawnBat();
                batSpawnIntervalRef.current = setInterval(spawnBat, TIMINGS.BAT_SPAWN_INTERVAL);
              }, TIMINGS.BAT_SPAWN_DELAY);
              // After audio swap delay, swap suspense for patthar_lauta_do
              setTimeout(() => {
                if (suspenseAudioRef.current) {
                  suspenseAudioRef.current.pause();
                  suspenseAudioRef.current.currentTime = 0;
                }
                if (pattharAudioRef.current) {
                  pattharAudioRef.current.currentTime = 0;
                  pattharAudioRef.current.play().catch(() => {});
                }
              }, TIMINGS.AUDIO_SWAP_DELAY);
            }, TIMINGS.CINEMATIC_DURATION);
          }
        }, 30);
      }, TIMINGS.HIDE_THOUGHT_DELAY);
    }, TIMINGS.SHOW_THOUGHT_DELAY);
  };

  const handleMobileTouchStart = (control) => (e) => {
    e.preventDefault();
    controlsRef.current[control] = true;
    if (!startedRef.current) {
      startedRef.current = true;
      setShowIntro(false);
    }
  };

  const handleMobileRunStart = (e) => {
    e.preventDefault();
    // Trigger scream on first RUN press (no isMoving check — on mobile RUN and
    // the joystick are tapped independently, so movement state can't be assumed)
    if (!controlsRef.current.shift && !showIntro && !hasPlayedScreamRef.current) {
      hasPlayedScreamRef.current = true;

      if (screamAudioRef.current) {
        if (audioRef.current) {
          audioRef.current.volume = 0.1;
        }
        screamAudioRef.current.currentTime = 0;
        screamAudioRef.current.play().catch(() => {});
        setTimeout(() => {
          if (audioRef.current && musicOn) {
            audioRef.current.volume = 0.35;
          }
        }, 1500);
      }
    }
    controlsRef.current.shift = true;
    if (!startedRef.current) {
      startedRef.current = true;
      setShowIntro(false);
    }
  };

  const handleMobileTouchEnd = (control) => (e) => {
    e.preventDefault();
    controlsRef.current[control] = false;
  };

  const handleMobileTouchActionF = (e) => {
    e.preventDefault();
    if (!hasFoundSlabRef.current) {
      const nearSoil = Math.abs(playerRef.current.x + 40 - (SOIL_X + 40)) < COLLISION_RANGES.SOIL_INTERACT;
      if (nearSoil) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        if (screamAudioRef.current) { screamAudioRef.current.pause(); screamAudioRef.current.currentTime = 0; }
        setMusicOn(false);
        hasFoundSlabRef.current = true;
        setHasFoundSlab(true);
        setShowSlabDialog(true);
        return;
      }
    }
    if (kingRamsesHealthRef.current <= HEALTH.KING_RAMSES_MAX * 0 && !bossDefeatedRef.current && !rollingTabletRef.current) {
      const px = playerRef.current.x;
      const krX = getPositions().KING_RAMSES_PAGE_X + getPositions().KING_RAMSES_HEALTH_BAR_OFFSET;
      setRollingTablet({ id: Date.now(), startX: px, endX: krX, spawnedAt: Date.now() });
    } else if (nearbyBatIdRef.current !== null) {
      const px = playerRef.current.x;
      setBats((prev) => prev.filter((b) => b.id !== nearbyBatIdRef.current));
      setNearbyBatId(null);
      nearbyBatIdRef.current = null;
      const krX = getPositions().KING_RAMSES_PAGE_X + getPositions().KING_RAMSES_HEALTH_BAR_OFFSET;
      setReturnBats((prev) => [...prev, {
        id: Date.now(),
        startX: px,
        endX: krX,
        startY: window.innerHeight - 160,
        endY: window.innerHeight - 200,
        peakY: window.innerHeight - 350,
        spawnedAt: Date.now(),
      }]);
    }
  };

  const handleJoystickInput = (touch) => {
    if (!touch || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const deltaX = touch.clientX - (rect.left + rect.width / 2);
    const deadzone = 12;
    controlsRef.current.left = deltaX < -deadzone;
    controlsRef.current.right = deltaX > deadzone;
    if (joystickKnobRef.current) {
      const maxR = rect.width / 2 - 14;
      const cx = Math.max(-maxR, Math.min(maxR, deltaX));
      joystickKnobRef.current.style.transform = `translate(calc(-50% + ${cx}px), -50%)`;
    }
  };

  const handleJoystickStart = (e) => {
    e.preventDefault();
    if (!startedRef.current) { startedRef.current = true; setShowIntro(false); }
    joystickActiveRef.current = true;
    handleJoystickInput(e.touches[0]);
  };

  const handleJoystickMove = (e) => {
    if (!joystickActiveRef.current) return;
    e.preventDefault();
    handleJoystickInput(e.touches[0]);
  };

  const handleJoystickEnd = (e) => {
    e.preventDefault();
    joystickActiveRef.current = false;
    controlsRef.current.left = false;
    controlsRef.current.right = false;
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  };

  const handleMobileStartGame = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      setShowIntro(false);
    }
  };

  return (
    <div className="courage-stage-container">
      {isPortrait && isMobile && (
        <div className="courage-portrait-toast">{UI_TEXT.ROTATE_PORTRAIT}</div>
      )}
      {showIntro && (
        <div
          className="courage-intro-overlay"
          onClick={isMobile ? handleMobileStartGame : undefined}
          style={isMobile ? { cursor: 'pointer' } : undefined}
        >
          <img src={asset('intro.png')} alt="Intro" className="courage-intro-image" />
          <div className="courage-intro-text">
            {isMobile ? (
              <>
                <p className="courage-tap-hint">Tap anywhere to start</p>
                <p>
                  <a
                    href="https://www.linkedin.com/in/bitastudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="courage-by-pratik"
                    onClick={(e) => e.stopPropagation()}
                  >
                    by Pratik
                  </a>
                </p>
              </>
            ) : (
              <>
                Press <label className="courage-enter-highlight">Enter</label> to start
                <p>[W][A][S][D] or Arrow Keys to move. [Shift] to run</p>
                <p>
                  <a
                    href="https://www.linkedin.com/in/bitastudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="courage-by-pratik"
                  >
                    by Pratik
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      )}
      <div className="courage-stage" ref={gameFrameRef} style={{ backgroundColor: showKingRamses ? '#8B0000' : 'transparent' }}>
        {!showIntro && (
          <>
            <button
              className="courage-music-toggle"
              type="button"
              onClick={() => setMusicOn(!musicOn)}
              title={musicOn ? 'Mute music' : 'Unmute music'}
            >
              {musicOn ? '🔊' : '🔇'}
            </button>
            {isMobile && (
              <button
                className="courage-fullscreen-btn"
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? '✕' : '⤢'}
              </button>
            )}
            <a
              href={`${process.env.PUBLIC_URL || ''}/assets/pratik_ag_resume.pdf`}
              download="Pratik_Agarwal_Resume.pdf"
              className="courage-resume-btn courage-top-btn"
              title="Download resume"
            >
              📄 Resume
            </a>
            <a
              href="/"
              className="courage-corporate-journey-btn courage-top-btn"
              title="Back to Corporate Journey Game"
            >
              <img src={`${process.env.PUBLIC_URL || ''}/assets/mario-small-idle.png`} alt="Mario" className="courage-btn-icon" />
              Corporate Journey
            </a>
            <a
              href="https://www.linkedin.com/in/bitastudio"
              target="_blank"
              rel="noopener noreferrer"
              className="courage-linkedin-btn courage-top-btn"
              title="Visit LinkedIn profile"
            >
              <img src={`${process.env.PUBLIC_URL || ''}/assets/linkedin-icon.webp`} alt="" className="courage-btn-icon" />
              LinkedIn
            </a>
          </>
        )}
        {showKingRamses && (
          <div className="courage-king-ramses-health-bar-container">
            <div className="courage-king-ramses-health-bar-background">
              <div className="courage-king-ramses-health-bar-fill" style={{ width: `${kingRamsesHealth}%` }}></div>
            </div>
          </div>
        )}
        {/* Thunder flash overlay */}
        {showSpider && <div className="courage-thunder-overlay" />}

        <div className="courage-world" style={{ transform: `translateX(${-cameraX}px)`, width: WORLD_WIDTH }}>
          {/* Clouds - page 1 */}
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: 0, top: 20 }} />
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: 400, top: 60 }} />
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: 800, top: 40 }} />
          {/* Clouds - page 2 */}
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: window.innerWidth + 100, top: 30 }} />
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: window.innerWidth + 500, top: 70 }} />
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: window.innerWidth + 900, top: 20 }} />
          {/* Clouds - page 3 */}
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: window.innerWidth * 2 + 100, top: 40 }} />
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: window.innerWidth * 2 + 500, top: 50 }} />
          <img src={asset('clouds.png')} alt="" className="courage-clouds" style={{ left: window.innerWidth * 2 + 900, top: 30 }} />

          {/* Grass */}
          <div className="courage-grass-strip">
            {Array.from({ length: GRASS_TILE_COUNT }).map((_, index) => (
              <img
                key={`grass-${index}`}
                src={asset('grass.png')}
                alt=""
                className="courage-grass"
                style={{ left: index * TILE_SIZE }}
              />
            ))}
          </div>

          <div className="courage-windmill-strip">
            <img
              src={asset('windmill.png')}
              alt="Windmill"
              className="courage-windmill"
              style={{ left: getPositions().WINDMILL_START_X }}
            />
          </div>

          {/* Ground DOM */}
          <div className="courage-ground"></div>

          {/* Player */}
          <img
            src={getPlayerSprite()}
            alt="Player"
            className="courage-player"
            style={{
              left: player.x,
              transform: player.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
              bottom: `${getPositions().PLAYER_SPRITE_BOTTOM}px`,
            }}
          />
          {showPlayerThought && (
            <div
              className="courage-player-thought"
              style={{ left: player.x + 40, bottom: `${getPositions().PLAYER_THOUGHT_OFFSET_Y}px` }}
            >
              {UI_TEXT.PLAYER_THOUGHT}
            </div>
          )}

          {/* Courage Home */}
          <img
            src={asset('courage-home.png')}
            alt="Home"
            className="courage-home"
            style={{ left: HOME_X }}
          />

          {/* Soil */}
          <div className="courage-soil-container" style={{ left: SOIL_X}}>
            <img src={asset('soil.webp')} alt="Strange soil" className="courage-soil" />
            {showSoilCallout && (
              <div className="courage-soil-callout">
                {UI_TEXT.SOIL_CALLOUT}<br />{isMobile ? UI_TEXT.SOIL_CALLOUT_MOBILE : UI_TEXT.SOIL_CALLOUT_KEYBOARD}
              </div>
            )}
          </div>

          {/* Spider */}
          {showSpider && (
            <img
              src={asset('running-spider.gif')}
              alt="Spider"
              className="courage-spider"
              style={{ left: spiderX }}
            />
          )}

          {/* Survive text */}
          {showSurviveText && (
            <div
              className="courage-survive-text"
              style={{ left: player.x - 10, bottom: '165px' }}
            >{UI_TEXT.SURVIVE}</div>
          )}

          {/* Return to Muriel hint */}
          {showReturnToMuriel && (
            <div className="courage-press-f-hint" style={{ left: player.x - 30, bottom: '185px' }}>
              {UI_TEXT.RETURN_TO_MURIEL}
            </div>
          )}

          {/* Press F hint — throw tablet when health = 0 */}
          {showKingRamses && kingRamsesHealth <= 0 && !bossDefeated && !rollingTablet && (
            <div className="courage-press-f-hint courage-press-f-tablet" style={{ left: player.x - 30, bottom: '185px' }}>
              {UI_TEXT.THROW_TABLET}
            </div>
          )}

          {/* Press F hint — catch nearby bat */}
          {nearbyBatId !== null && kingRamsesHealth > 0 && (
            <div className="courage-press-f-hint" style={{ left: player.x - 20, bottom: '185px' }}>
              {UI_TEXT.THROW_BACK}
            </div>
          )}

          {/* King Ramses */}
          {showKingRamses && (
            <img
              src={asset('king-ramses.gif')}
              alt="King Ramses"
              className={`courage-king-ramses${kingRamsesFading ? ' courage-king-ramses-fading' : ''}`}
              style={{ left: window.innerWidth * 2.75 }}
            />
          )}

          {/* Bats thrown by King Ramses */}
          {bats.map((bat) => (
            <img
              key={bat.id}
              src={asset('bat.gif')}
              alt=""
              className="courage-bat"
              style={{
                '--bat-start-x': `${bat.startX}px`,
                '--bat-end-x': `${bat.endX}px`,
                '--bat-start-y': `${bat.startY}px`,
                '--bat-end-y': `${bat.endY}px`,
                '--bat-peak-y': `${bat.peakY}px`,
              }}
              onAnimationEnd={() => setBats((prev) => prev.filter((b) => b.id !== bat.id))}
            />
          ))}

          {/* Return bats thrown back at King Ramses */}
          {returnBats.map((bat) => (
            <img
              key={bat.id}
              src={asset('bat.gif')}
              alt=""
              className="courage-bat"
              style={{
                '--bat-start-x': `${bat.startX}px`,
                '--bat-end-x': `${bat.endX}px`,
                '--bat-start-y': `${bat.startY}px`,
                '--bat-end-y': `${bat.endY}px`,
                '--bat-peak-y': `${bat.peakY}px`,
              }}
              onAnimationEnd={() => {
                setReturnBats((prev) => prev.filter((b) => b.id !== bat.id));
                setKingRamsesHealth((prev) => Math.max(0, prev - HEALTH.BAT_DAMAGE));
              }}
            />
          ))}

          {/* Rolling tablet thrown at King Ramses */}
          {rollingTablet && (
            <img
              key={rollingTablet.id}
              src={asset('slab.png')}
              alt=""
              className="courage-rolling-tablet"
              style={{
                '--tablet-start-x': `${rollingTablet.startX}px`,
                '--tablet-end-x': `${rollingTablet.endX}px`,
              }}
              onAnimationEnd={() => {
                setRollingTablet(null);
                bossDefeatedRef.current = true;
                setBossDefeated(true);
                setKingRamsesFading(true);
                [audioRef, screamAudioRef, windAudioRef, suspenseAudioRef, pattharAudioRef, thunderAudioRef].forEach((ref) => {
                  if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
                });
                if (bossDefeatedAudioRef.current) {
                  bossDefeatedAudioRef.current.currentTime = 0;
                  bossDefeatedAudioRef.current.play().catch(() => {});
                }
                // After boss fade, show defeat text
                setTimeout(() => {
                  setKingRamsesFading(false);
                  setShowKingRamses(false);
                  setShowBossDefeatedText(true);
                  // After defeat text duration, show return to muriel
                  setTimeout(() => {
                    setShowBossDefeatedText(false);
                    setShowReturnToMuriel(true);
                    showReturnToMurielRef.current = true;
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play().catch(() => {});
                    }
                  }, TIMINGS.BOSS_DEFEATED_TEXT_DURATION);
                }, TIMINGS.BOSS_DEFEATED_FADE_DURATION);
              }}
            />
          )}

          {/* Muriel Character */}
          <div className="courage-muriel-container" style={{ left: MURIAL_X }}>
            <img
              src={asset('murial.png')}
              alt="Muriel"
              className="courage-muriel"
              style={{
                transform: player.x > MURIAL_X ? 'scaleX(-1)' : 'scaleX(1)',
              }}
            />
            {showMurialText && (
              <div className="courage-muriel-text">
                {UI_TEXT.MURIEL_GREETING}
              </div>
            )}
          </div>
        </div>
        {windGusts.map((gust) => (
          <img
            key={gust.id}
            src={asset('wind.gif')}
            alt=""
            className="courage-wind-gust"
            style={{
              top: `${gust.top}px`,
              animationDuration: `${gust.duration}ms`,
              animationDelay: `${gust.delay}ms`,
            }}
          />
        ))}
        {showSuspenseMessage && (
          <div className="courage-suspense-message">
            {isMobile ? 'RUN !!!' : UI_TEXT.SUSPENSE_MESSAGE}
          </div>
        )}
        {showSlabDialog && (
          <div className="courage-slab-overlay">
            <div className="courage-slab-dialog">
              <p>{UI_TEXT.FOUND_SLAB}</p>
              <img src={asset('slab.png')} alt="Stone slab" className="courage-slab-img" />
              <button className="courage-slab-ok" onClick={handleSlabOk}>{UI_TEXT.SLAB_OK}</button>
            </div>
          </div>
        )}

        {showBossDefeatedText && (
          <div className="courage-boss-defeated-overlay">
            <div className="courage-boss-defeated-content">
              <div className="courage-boss-defeated-title">{UI_TEXT.KING_RAMSES_DEFEATED}</div>
            </div>
          </div>
        )}

        {showWinOverlay && (
          <div className="courage-game-over-overlay">
            <div className="courage-win-content">
              <button className="courage-game-over-close" onClick={handleReplay} title="Close">✕</button>
              <img src={asset('murielcourage.webp')} alt="Muriel and Courage" className="courage-game-over-image" />
              <div className="courage-game-over-title" style={{ color: '#7fff7f' }}>{UI_TEXT.STAGE_COMPLETE}</div>
              <div className="courage-game-over-thanks">{UI_TEXT.COMPLETION_MESSAGE}</div>
              <hr style={{ opacity: 0.25 }} />
              <div className="courage-contact-info">
                <div>
                  <div className="courage-contact-text">Pratik Agarwal</div>
                  <div className="courage-contact-subtext">Full Stack Developer &middot; frontend &middot; backend &middot; AI<br />{new Date().getFullYear() - 2017}+ years of experience</div>
                </div>
                <div className="courage-contact-icons-row">
                  <a href="mailto:heypratik.js@gmail.com" className="courage-contact-icon-link" title="heypratik.js@gmail.com">
                    <span className="courage-contact-icon">✉️</span>
                    <span className="courage-contact-icon-label">heypratik.js@gmail.com</span>
                  </a>
                  <a href="https://www.linkedin.com/in/bitastudio" target="_blank" rel="noopener noreferrer" className="courage-contact-icon-link" title="LinkedIn: /in/bitastudio">
                    <img src={`${process.env.PUBLIC_URL || ''}/assets/linkedin-icon.webp`} alt="LinkedIn" className="courage-contact-icon-img" />
                    <span className="courage-contact-icon-label">/in/bitastudio</span>
                  </a>
                </div>
              </div>
              <div className="courage-game-over-actions">
                <a
                  href="/"
                  className="courage-corporate-journey-btn"
                  title="Back to Corporate Journey Game"
                >
                  <img src={`${process.env.PUBLIC_URL || ''}/assets/mario-small-idle.png`} alt="Mario" className="courage-btn-icon" />
                  Corporate Journey
                </a>
                <a href={`${process.env.PUBLIC_URL || ''}/assets/pratik_ag_resume.pdf`} download="Pratik_Agarwal_Resume.pdf" className="courage-resume-btn" title="Download resume">📄 Download Resume</a>
                <a href="https://www.linkedin.com/in/bitastudio" target="_blank" rel="noopener noreferrer" className="courage-linkedin-btn">
                  <img src={`${process.env.PUBLIC_URL || ''}/assets/linkedin-icon.webp`} alt="" className="courage-btn-icon" /> LinkedIn
                </a>
                <button className="courage-replay-button" onClick={handleReplay}>↩ Replay</button>
              </div>
            </div>
          </div>
        )}

        {showGameOver && (
          <div className="courage-game-over-overlay">
            <div className="courage-game-over-content">
                <button className="courage-game-over-close" onClick={handleReplay} title="Close">✕</button>
                <img src={asset('courage-game-over.jfif')} alt="Game Over" className="courage-game-over-image" />
              <div className="courage-game-over-title">{UI_TEXT.GAME_OVER}</div>
              <div className="courage-game-over-thanks">{UI_TEXT.GAME_OVER_THANKS}</div>
              <hr style={{opacity: 0.25}}/>
              <div className="courage-contact-info">
                <div>
                  <div className="courage-contact-text">Pratik Agarwal</div>
                  <div className="courage-contact-subtext">Full Stack Developer &middot; frontend &middot; backend &middot; AI<br />{new Date().getFullYear() - 2017}+ years of experience</div>
                </div>
                <div className="courage-contact-icons-row">
                  <a href="mailto:heypratik.js@gmail.com" className="courage-contact-icon-link" title="heypratik.js@gmail.com">
                    <span className="courage-contact-icon">✉️</span>
                    <span className="courage-contact-icon-label">heypratik.js</span>
                  </a>
                  <a href="https://www.linkedin.com/in/bitastudio" target="_blank" rel="noopener noreferrer" className="courage-contact-icon-link" style={{marginTop: "8px"}} title="LinkedIn: /bitastudio">
                    <img src={`${process.env.PUBLIC_URL || ''}/assets/linkedin-icon.webp`} alt="LinkedIn" className="courage-contact-icon-img" />
                    <span className="courage-contact-icon-label">bitAstudio</span>
                  </a>
                </div>
              </div>

              <div className="courage-game-over-actions">
                <a
                  href="/"
                  className="courage-corporate-journey-btn"
                  title="Back to Corporate Journey Game"
                >
                  <img src={`${process.env.PUBLIC_URL || ''}/assets/mario-small-idle.png`} alt="Mario" className="courage-btn-icon" />
                  Corporate Journey
                </a>
                <button className="courage-replay-button" onClick={handleReplay}>Replay</button>
              </div>
            </div>
          </div>
        )}
        {isMobile && !showIntro && !showGameOver && (
          <div className="courage-mobile-controls">
            <div className="courage-mobile-left">
              <div
                ref={joystickRef}
                className="courage-joystick-base"
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onTouchCancel={handleJoystickEnd}
              >
                <div ref={joystickKnobRef} className="courage-joystick-knob" />
              </div>
            </div>
            <div className="courage-mobile-right">
              <button
                className="courage-mobile-btn courage-mobile-btn-run"
                onTouchStart={handleMobileRunStart}
                onTouchEnd={handleMobileTouchEnd('shift')}
                onTouchCancel={handleMobileTouchEnd('shift')}
              >RUN</button>
              <button
                className="courage-mobile-btn courage-mobile-btn-action"
                onTouchStart={handleMobileTouchActionF}
                onTouchEnd={(e) => e.preventDefault()}
                onTouchCancel={(e) => e.preventDefault()}
              >✋</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourageStage1;
