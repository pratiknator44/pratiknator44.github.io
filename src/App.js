import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  WORLD_WIDTH,
  TILE_SIZE,
  GRAVITY,
  MOVE_SPEED,
  JUMP_SPEED,
  CAREER_BANNERS,
  BACKGROUND_CLOUDS,
  BUSHES,
  GROUND_ROWS,
  GROUND_COLS,
  GROUND_MAP,
  BLOCKS,
  CLIENT_IMAGES,
  GOOMBAS_CONFIG,
  AZUGA_X,
  LOCKDOWN_BILLBOARD_X,
  HOME_X,
} from './constants';

const asset = (name) => `${process.env.PUBLIC_URL || ''}/assets/${name}`;

function App() {
  const [started, setStarted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [player, setPlayer] = useState({ x: 90, y: 0, vx: 0, vy: 0, onGround: true, facing: 'right' });
  const [goombaState, setGoombaState] = useState([]);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [gameEnded, setGameEnded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showModiJi, setShowModiJi] = useState(false);
  const [scale, setScale] = useState(1);
  const [showSplash, setShowSplash] = useState(true);
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const [isMobile] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  const gameFrameRef = useRef(null);
  const controlsRef = useRef({ left: false, right: false, jump: false, shift: false });
  const jumpQueuedRef = useRef(false);
  const startedRef = useRef(false);
  const audioRef = useRef(null);
  const jumpAudioRef = useRef(null);
  const goombaAudioRef = useRef(null);
  const reachedHomeAudioRef = useRef(null);
  const playerRef = useRef({ x: 90, y: 0, vx: 0, vy: 0, onGround: true, facing: 'right' });
  const goombaStateRef = useRef(goombaState);
  const goombaSpawnedRef = useRef(false);
  const reachedHomeRef = useRef(false);

  // Calculate scale factor based on game-frame rendered size
  useEffect(() => {
    const updateScale = () => {
      if (gameFrameRef.current) {
        const rect = gameFrameRef.current.getBoundingClientRect();
        const calculatedScale = rect.width / 960;
        setScale(calculatedScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    const observer = new ResizeObserver(updateScale);
    if (gameFrameRef.current) observer.observe(gameFrameRef.current);

    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, []);

  // Recalculate scale once splash hides and game-frame mounts
  useEffect(() => {
    if (!showSplash && gameFrameRef.current) {
      const rect = gameFrameRef.current.getBoundingClientRect();
      setScale(rect.width / 960);
    }
  }, [showSplash]);

  // Track portrait orientation for mobile warning
  useEffect(() => {
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Preload all game assets
  useEffect(() => {
    const preloadAssets = async () => {
      const assetFiles = [
        'mario-small-running.gif',
        'mario-small-walking.gif',
        'mario-small-idle.png',
        'mario-small-jumping.png',
        'clouds-1.png',
        'clouds-3.png',
        'bush.png',
        'bush-2.png',
        'goomba.gif',
        'goomba-dead.png',
        'modi-ji.gif',
        'client-1.png',
        'client-2.png',
        'client-3.png',
        'home.png',
        'linkedin-icon.webp',
      ];

      const imagePromises = assetFiles.map(
        (file) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = asset(file);
          })
      );

      await Promise.all(imagePromises);
      setShowSplash(false);
    };

    preloadAssets();
  }, []);

  // Keep goombaStateRef in sync with state for rAF tick
  useEffect(() => {
    goombaStateRef.current = goombaState;
  }, [goombaState]);

  // Spawn goomba when player reaches Azuga Telematics
  useEffect(() => {
    if (started && !goombaSpawnedRef.current && player.x >= AZUGA_X) {
      goombaSpawnedRef.current = true;
      setGoombaState(GOOMBAS_CONFIG.map(g => ({ ...g, dead: false })));
    }
  }, [started, player.x]);

  // Detect when player reaches home midpoint and trigger end sequence
  useEffect(() => {
    const homeMidpoint = HOME_X + 60; // Home is ~120px wide, so midpoint is +60
    if (started && !reachedHomeRef.current && player.x >= homeMidpoint) {
      reachedHomeRef.current = true;
      
      // Player disappears instantly
      setGameEnded(true);
      
      // Stop background music
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Play reached-home sound
      if (reachedHomeAudioRef.current) {
        reachedHomeAudioRef.current.currentTime = 0;
        reachedHomeAudioRef.current.play().catch(() => {});
      }
      
      // Show game over overlay after 4 seconds
      setTimeout(() => {
        setShowOverlay(true);
      }, 4000);
      
      // Show fireworks after 3 seconds, for 2 seconds
      setTimeout(() => {
        setShowFireworks(true);
        setTimeout(() => {
          setShowFireworks(false);
        }, 2000);
      }, 3000);
    }
  }, [started, player.x]);

  // Ground surface sits at the top of the 2-row ground strip
  const groundY = GROUND_ROWS * TILE_SIZE;

  const cameraX = useMemo(() => {
    const target = player.x - VIEWPORT_WIDTH * 0.35;
    return Math.max(0, Math.min(target, WORLD_WIDTH - VIEWPORT_WIDTH));
  }, [player.x]);

  // Show detail overlay when player is within 220px of a billboard
  const activeBanner = useMemo(() => {
    return CAREER_BANNERS.find((banner) => Math.abs(player.x - banner.x) < 220) || null;
  }, [player.x]);

  const musicLabel = musicOn ? 'Stop Music' : 'Play Music';

  useEffect(() => {
    const audio = new Audio(asset('background-music.mp3'));
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    const sfx = new Audio(asset('mario-jump.mp3'));
    sfx.volume = 0.7;
    jumpAudioRef.current = sfx;

    const goombaAudio = new Audio(asset('lavden-bhojyam.mp3'));
    goombaAudio.volume = 0.6;
    goombaAudioRef.current = goombaAudio;

    const reachedHomeAudio = new Audio(asset('reached-home.mp3'));
    reachedHomeAudio.volume = 0.7;
    reachedHomeAudioRef.current = reachedHomeAudio;

    return () => {
      audio.pause();
      audioRef.current = null;
      jumpAudioRef.current = null;
      goombaAudioRef.current = null;
      reachedHomeAudioRef.current = null;
    };
  }, []);

  // Keep playerRef in sync so the rAF tick can read onGround without stale closures
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = musicVolume;

    if (started && musicOn) {
      audio.play().catch(() => {});
      return;
    }

    audio.pause();
  }, [started, musicOn, musicVolume]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === 'enter' && !startedRef.current) {
        startedRef.current = true;
        setStarted(true);
      }

      if (key === 'arrowleft' || key === 'a') {
        controlsRef.current.left = true;
      }

      if (key === 'arrowright' || key === 'd') {
        controlsRef.current.right = true;
      }

      if (key === 'arrowup' || key === 'w' || key === ' ') {
        controlsRef.current.jump = true;
        jumpQueuedRef.current = true;
      }

      if (key === 'shift') {
        controlsRef.current.shift = true;
      }

      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' '].includes(key)) {
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

      if (key === 'arrowup' || key === 'w' || key === ' ') {
        controlsRef.current.jump = false;
      }

      if (key === 'shift') {
        controlsRef.current.shift = false;
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      // Capture and clear jump intent OUTSIDE setPlayer.
      // React Strict Mode double-invokes state updaters, so clearing the ref
      // inside setPlayer would cause the second invocation to miss the jump.
      const wantsJump = jumpQueuedRef.current;
      jumpQueuedRef.current = false;

      // Play jump SFX — check playerRef (synced via useEffect) for onGround
      if (wantsJump && playerRef.current.onGround && jumpAudioRef.current) {
        jumpAudioRef.current.currentTime = 0;
        jumpAudioRef.current.play().catch(() => {});
      }

      setPlayer((prev) => {
        if (!startedRef.current) {
          return prev;
        }

        let vx = 0;
        let vy = prev.vy + GRAVITY;
        let x = prev.x;
        let y = prev.y;
        let onGround = false;
        let facing = prev.facing;

        const moveSpeed = controlsRef.current.shift ? MOVE_SPEED * 1.5 : MOVE_SPEED;

        if (controlsRef.current.left && !controlsRef.current.right) {
          vx = -moveSpeed;
          facing = 'left';
        }

        if (controlsRef.current.right && !controlsRef.current.left) {
          vx = moveSpeed;
          facing = 'right';
        }

        if (wantsJump && prev.onGround) {
          vy = JUMP_SPEED;
        }

        x += vx;
        y += vy;

        const maxX = WORLD_WIDTH - TILE_SIZE;
        if (x < 0) {
          x = 0;
        }
        if (x > maxX) {
          x = maxX;
        }

        if (y >= 0) {
          y = 0;
          vy = 0;
          onGround = true;
        }

        return { x, y, vx, vy, onGround, facing };
      });

      // Update goomba positions and handle collisions
      if (goombaStateRef.current.length > 0 && goombaStateRef.current.some((g) => !g.dead)) {
        setGoombaState((prevGoombas) => {
          const updated = prevGoombas.map((goomba) => {
            if (goomba.dead) return goomba; // Freeze dead goomba, same reference = no re-render churn
            
            // Move goomba towards player
            let newX = goomba.x + goomba.vx;
            
            // Collision detection
            const playerWidth = 48;
            const goombaWidth = 48;
            const collision = 
              playerRef.current.x < newX + goombaWidth &&
              playerRef.current.x + playerWidth > newX &&
              playerRef.current.y < goomba.y + 40 &&
              playerRef.current.y + 48 > goomba.y;
            
            // Player stomps goomba only when falling from above (in air with downward velocity)
            if (collision && !playerRef.current.onGround && playerRef.current.vy > 0) {
              if (goombaAudioRef.current) {
                goombaAudioRef.current.currentTime = 0;
                goombaAudioRef.current.play().catch(() => {});
                
                setMusicVolume(0.1);
                setTimeout(() => {
                  setMusicVolume(0.35);
                }, 1500);
              }
              // Bounce player up
              setPlayer(prev => ({ ...prev, vy: JUMP_SPEED * 0.8, onGround: false }));
              // Trigger modi-ji animation
              setShowModiJi(true);
              setTimeout(() => {
                setShowModiJi(false);
              }, 2000);
              // Show goomba-dead.png instantly, remove after brief flash
              setTimeout(() => {
                setGoombaState((prev) => prev.filter((g) => !g.dead));
              }, 5000);
              return { ...goomba, dead: true };
            }
            
            return { ...goomba, x: newX };
          });
          return updated;
        });
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const playerSprite = player.onGround
    ? player.vx !== 0
      ? controlsRef.current.shift ? asset('mario-small-running.gif') : asset('mario-small-walking.gif')
      : asset('mario-small-idle.png')
    : asset('mario-small-jumping.png');

  const handleMusicToggle = () => {
    setMusicOn((current) => !current);
  };

  const handleReplay = () => {
    setStarted(false);
    setPlayer({ x: 90, y: 0, vx: 0, vy: 0, onGround: true, facing: 'right' });
    setGoombaState([]);
    setGameEnded(false);
    setShowOverlay(false);
    setShowFireworks(false);
    setShowModiJi(false);
    setMusicVolume(0.35);
    startedRef.current = false;
    goombaSpawnedRef.current = false;
    reachedHomeRef.current = false;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
  };

  const handleTouchStart = (control) => (e) => {
    e.preventDefault();
    controlsRef.current[control] = true;
    if (control === 'jump') jumpQueuedRef.current = true;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
  };

  const handleTouchEnd = (control) => (e) => {
    e.preventDefault();
    controlsRef.current[control] = false;
  };

  return (
    <div className="app-shell">
      {isPortrait && isMobile && (
        <div className="portrait-toast">
          🔄 Rotate for better experience
        </div>
      )}
      {showSplash && (
        <div className="splash-screen">
          <img src={asset('mario-small-running.gif')} alt="Mario Running" className="splash-mario"/>
          <p className="splash-text">Billable, thou art cherished; unbillable, thou art forsaken.</p>
        </div>
      )}
      {!showSplash && (
      <div className="game-frame" ref={gameFrameRef} role="application" aria-label="Mario portfolio game">
        <div className="game-inner" style={{ transform: `scale(${scale})` }}>
        <button className="music-toggle" type="button" onClick={handleMusicToggle}>
          {musicLabel}
        </button>
        <a
          href={asset('pratik_ag_resume.pdf')}
          download="Pratik_Agarwal_Resume.pdf"
          className="resume-button"
          title="Download resume"
        >
          Download Resume&nbsp;
        </a>

        <a
          href="https://www.linkedin.com/in/bitastudio"
          target="_blank"
          rel="noopener noreferrer"
          className="linkedin-button"
          title="Visit LinkedIn profile"
        >
          LinkedIn
        </a>

        <a
          href="#/courage"
          className="courage-stage-btn"
          title="Play Courage Stage"
        >
          <img src={asset('courage/courage-standing.gif')} alt="Courage" className="courage-btn-sprite" />
          Courage Game
        </a>

        <div className="world" style={{ transform: `translateX(${-cameraX}px)` }}>
          {BACKGROUND_CLOUDS.map((cloud, index) => (
            <img
              key={`cloud-${index}`}
              src={asset(cloud.img)}
              className="cloud"
              alt=""
              style={{ left: cloud.x, top: cloud.y }}
            />
          ))}

          {BUSHES.map((bush, index) => (
            <img
              key={`bush-${index}`}
              src={asset(bush.img)}
              className="bush"
              alt=""
              style={{ left: bush.x, bottom: GROUND_ROWS * TILE_SIZE }}
            />
          ))}

          {CLIENT_IMAGES.map((client, index) => (
            <img
              key={`client-${index}`}
              src={asset(client.img)}
              className="client-image"
              alt=""
              style={{ left: client.x, bottom: GROUND_ROWS * TILE_SIZE, background: "white" }}
            />
          ))}

          {/* Goombas */}
          {goombaState.map((goomba, index) => (
            <div key={`goomba-${index}`} className="goomba-container" style={{ left: goomba.x, bottom: GROUND_ROWS * TILE_SIZE }}>
              <img
                src={asset(goomba.dead ? 'goomba-dead.png' : 'goomba.gif')}
                className="goomba"
                alt="Goomba"
              />
              {!goomba.dead && <span className="goomba-label">COVID</span>}
            </div>
          ))}

          {/* In-world career billboards */}
          {CAREER_BANNERS.map((banner, index) => (
            <div
              key={`billboard-${index}`}
              className={`billboard${activeBanner === banner ? ' billboard--active' : ''}`}
              style={{ left: banner.x, bottom: GROUND_ROWS * TILE_SIZE }}
            >
              <div className="billboard-sign">
                <div className="billboard-company">{banner.company}</div>
                <div className="billboard-dates">{banner.doj} &ndash; {banner.dos}</div>
                <div className="billboard-designation">{banner.designation}</div>
                <div className="billboard-location">{banner.location}</div>
              </div>
              <div className="billboard-pole" />
            </div>
          ))}

          {/* Lockdown warning billboard */}
          <div className="lockdown-billboard" style={{ left: LOCKDOWN_BILLBOARD_X, bottom: GROUND_ROWS * TILE_SIZE }}>
            <div className="lockdown-sign">LOCKDOWN</div>
            <div className="lockdown-pole" />
          </div>

          {/* Home zone with label */}
          <div className="home-goal" style={{ left: HOME_X, bottom: GROUND_ROWS * TILE_SIZE }}>
            <img
              src={asset('home.png')}
              className="home"
              alt="Home goal"
            />
                        <span className="home-label">YOUR TEAM</span>

            {showFireworks && (
              <img
                src={asset('fireworks.gif')}
                className="fireworks"
                alt="Fireworks"
                style={{
                  position: 'absolute',
                  width: '240px',
                  height: 'auto',
                  left: 0,
                  top: 0,
                  imageRendering: 'pixelated'
                }}
              />
            )}
          </div>

          {!gameEnded && (
            <img
              src={playerSprite}
              className="player"
              alt="Player"
              style={{ 
                left: player.x, 
                bottom: groundY - player.y, 
                transform: player.facing === 'left' ? 'scaleX(-1)' : 'none',
                width: '48px',
                height: '48px'
              }}
            />
          )}

          {/* Ground matrix – only visible columns are mounted for performance */}
          <div className="ground-strip" aria-hidden="true">
            {GROUND_MAP.flatMap((row, rowIndex) => {
              const rowBottom = (GROUND_ROWS - 1 - rowIndex) * TILE_SIZE;
              const colStart = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
              const colEnd = Math.min(GROUND_COLS - 1, Math.ceil((cameraX + VIEWPORT_WIDTH) / TILE_SIZE) + 1);
              return row.slice(colStart, colEnd + 1).reduce((acc, tile, i) => {
                if (!tile) return acc;
                const col = colStart + i;
                acc.push(
                  <img
                    key={`g-${rowIndex}-${col}`}
                    src={asset('ground-brick.png')}
                    className="ground-tile"
                    alt=""
                    style={{ left: col * TILE_SIZE, bottom: rowBottom }}
                  />
                );
                return acc;
              }, []);
            })}
          </div>
        </div>

        {/* Modi-ji animation */}
        {showModiJi && (
          <img
            src={asset('modi-ji.gif')}
            className="modi-ji"
            alt="Modi-ji"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {!started && (
          <div className="intro-card" role="status" aria-live="polite">
            <h1>Pratik Agarwal</h1>
            <p>UI Full Stack Developer for hire</p>
            
            <span>Press <label className="enter-highlight">Enter</label> to begin</span>
            <span className="controls-text">Controls: ⬅️⬆️⬇️➡️ or [W], [A], [S], [D], [Shift]</span><br/>
            <small>Kindly make sure you have a stable internet connection for smoother experience.</small>
          </div>
        )}

        {activeBanner && started && (
          <div className="career-banner" role="status" aria-live="polite">
            <div className="career-banner-company">{activeBanner.company}</div>
            <div className="career-banner-dates">{activeBanner.doj} &ndash; {activeBanner.dos}</div>
            <div className="career-banner-designation">{activeBanner.designation}</div>
            <div className="career-banner-location">{activeBanner.location}</div>
          </div>
        )}

        {showOverlay && (
          <div className="game-over-overlay">
            <button className="overlay-close" onClick={handleCloseOverlay} title="Close overlay">✕</button>
            <div className="game-over-content">
              <div className="game-over-title">GAME OVER</div>
              <div className="game-over-thanks">Thanks for playing!</div>
              
              <div className="contact-info">
                <div className="contact-item">
                  <span className="contact-icon">✉️</span>
                  <a href="mailto:heypratik.js@gmail.com" className="contact-text">heypratik.js@gmail.com</a>
                </div>
                
                <div className="contact-item">
                  <span className="contact-icon">📱</span>
                  <span className="contact-text">+91-93693-19401</span>
                </div>
                
                <div className="contact-item">
                  <img src={asset('linkedin-icon.webp')} alt="LinkedIn" className="contact-icon-img" />
                  <div>
                    <a href="https://www.linkedin.com/in/bitastudio" target="_blank" rel="noopener noreferrer" className="contact-text">/in/bitastudio</a>
                  </div>
                </div>

                 <div>
                  <div className="contact-text">Pratik Agarwal</div>
                    <div className="contact-subtext">Full Stack Developer <br/>frontend &middot; backend &middot; AI<br/> {new Date().getFullYear() - 2017}+ years of experience</div>
                </div>
              </div>

              <button className="replay-button" onClick={handleReplay}>
                Replay
              </button><br/>
              <a href="#/courage" className="courage-stage-btn courage-stage-btn-overlay">
                <img src={asset('courage/courage-standing.gif')} alt="Courage" className="courage-btn-sprite" />
                Courage: King Ramses Curse
              </a>
            </div>
          </div>
        )}
        {isMobile && (
          <div className="mobile-controls">
            <div className="mobile-dpad">
              <button
                className="mobile-btn"
                onTouchStart={handleTouchStart('left')}
                onTouchEnd={handleTouchEnd('left')}
                onTouchCancel={handleTouchEnd('left')}
              >◀</button>
              <button
                className="mobile-btn"
                onTouchStart={handleTouchStart('right')}
                onTouchEnd={handleTouchEnd('right')}
                onTouchCancel={handleTouchEnd('right')}
              >▶</button>
            </div>
            <button
              className="mobile-btn mobile-btn-jump"
              onTouchStart={handleTouchStart('jump')}
              onTouchEnd={handleTouchEnd('jump')}
              onTouchCancel={handleTouchEnd('jump')}
            >▲</button>
          </div>
        )}
        </div>{/* end .game-inner */}
      </div>
      )}
    </div>
  );
}

export default App;
