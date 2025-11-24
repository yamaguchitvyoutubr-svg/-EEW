import React, { useState, useEffect, useRef } from 'react';

// --- Types ---

interface QuakeData {
  type: 'EARTHQUAKE';
  time: string;
  hypocenter: string;
  magnitude: number;
  maxScale: number; // 10=1, ..., 70=7
  depth: number;
}

interface TsunamiArea {
  grade: string; // "MajorWarning", "Warning", "Watch", "Unknown"
  name: string;
}

interface TsunamiData {
  type: 'TSUNAMI';
  time: string;
  cancelled: boolean;
  areas: TsunamiArea[]; // List of affected areas
  maxGrade: string; // For display priority
}

interface EEWData {
  type: 'EEW';
  time: string;
  hypocenter: string;
  magnitude: number;
  maxScale: number; // Forecast max scale
  isCancelled: boolean;
  isWarning: boolean; // True if it's a "Warning" (Alert), False if "Forecast"
}

type DisplayMode = 'EARTHQUAKE' | 'TSUNAMI' | 'EEW';

// --- Translation Dictionaries ---

const PREF_MAP: Record<string, string> = {
  "北海道": "HOKKAIDO", "青森": "AOMORI", "岩手": "IWATE", "宮城": "MIYAGI", "秋田": "AKITA",
  "山形": "YAMAGATA", "福島": "FUKUSHIMA", "茨城": "IBARAKI", "栃木": "TOCHIGI", "群馬": "GUNMA",
  "埼玉": "SAITAMA", "千葉": "CHIBA", "東京": "TOKYO", "神奈川": "KANAGAWA", "新潟": "NIIGATA",
  "富山": "TOYAMA", "石川": "ISHIKAWA", "福井": "FUKUI", "山梨": "YAMANASHI", "長野": "NAGANO",
  "岐阜": "GIFU", "静岡": "SHIZUOKA", "愛知": "AICHI", "三重": "MIE", "滋賀": "SHIGA",
  "京都": "KYOTO", "大阪": "OSAKA", "兵庫": "HYOGO", "奈良": "NARA", "和歌山": "WAKAYAMA",
  "鳥取": "TOTTORI", "島根": "SHIMANE", "岡山": "OKAYAMA", "広島": "HIROSHIMA", "山口": "YAMAGUCHI",
  "徳島": "TOKUSHIMA", "香川": "KAGAWA", "愛媛": "EHIME", "高知": "KOCHI", "福岡": "FUKUOKA",
  "佐賀": "SAGA", "長崎": "NAGASAKI", "熊本": "KUMAMOTO", "大分": "OITA", "宮崎": "MIYAZAKI",
  "鹿児島": "KAGOSHIMA", "沖縄": "OKINAWA",
  // Specific Regions
  "トカラ": "TOKARA", "奄美": "AMAMI"
};

const SUFFIX_MAP: Record<string, string> = {
  // Prefectures
  "県": " PREF", "府": " PREF", "都": " METRO", "道": "", 
  
  // Oceans & Coasts (For Tsunami)
  "日本海": " SEA OF JAPAN", "太平洋": " PACIFIC", "オホーツク海": " OKHOTSK", "東シナ海": " EAST CHINA SEA",
  "沿岸": " COAST", "湾": " BAY", "灘": " SEA", "海峡": " STRAIT", "諸島": " ISLANDS", "列島": " ISLANDS",
  "近海": " NEAR SEA", "外洋": " OPEN SEA", "連島": " ISLANDS", "沖": " OFF",

  // 3-char Directions (Specific Regions)
  "北東部": " NORTH EAST", "北西部": " NORTH WEST", "南東部": " SOUTH EAST", "南西部": " SOUTH WEST",
  
  // 2-char Directions
  "北部": " NORTH", "南部": " SOUTH", "東部": " EAST", "西部": " WEST", "中部": " CENTRAL",
  "北東": " NORTH EAST", "北西": " NORTH WEST", "南東": " SOUTH EAST", "南西": " SOUTH WEST",

  // Geographical features
  "地方": " REGION", "半島": " PENINSULA", "島": " ISLAND",

  // 1-char Directions (Fallback)
  "北": " NORTH", "南": " SOUTH", "東": " EAST", "西": " WEST"
};

const translateText = (japaneseText: string): string => {
  if (!japaneseText) return "";
  let text = japaneseText;
  
  // 1. Replace Prefectures & Regions
  Object.keys(PREF_MAP).forEach(key => {
    text = text.split(key).join(PREF_MAP[key]);
  });

  // 2. Replace Suffixes
  Object.keys(SUFFIX_MAP).forEach(key => {
    text = text.split(key).join(SUFFIX_MAP[key]);
  });

  // 3. Cleanup
  text = text.replace(/\s+/g, ' ').trim();
  
  return text.toUpperCase();
};

// Helper to convert P2P Quake scale to JMA intensity
const getIntensityLabel = (scale: number): string => {
  if (scale === -1) return 'UNKNOWN';
  if (scale < 10) return '0';
  if (scale === 10) return '1';
  if (scale === 20) return '2';
  if (scale === 30) return '3';
  if (scale === 40) return '4';
  if (scale === 45) return '5- (LOWER)';
  if (scale === 50) return '5+ (UPPER)';
  if (scale === 55) return '6- (LOWER)';
  if (scale === 60) return '6+ (UPPER)';
  if (scale === 70) return '7 (MAX)';
  return '?';
};

// Helper for Tsunami Grades
const getTsunamiGradeLabel = (grade: string): string => {
  switch (grade) {
    case 'MajorWarning': return 'MAJOR WARNING';
    case 'Warning': return 'WARNING';
    case 'Watch': return 'ADVISORY';
    default: return 'INFO';
  }
};

const getTsunamiColor = (grade: string) => {
    switch (grade) {
        case 'MajorWarning': return 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]';
        case 'Warning': return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
        case 'Watch': return 'text-yellow-400';
        default: return 'text-cyan-400';
    }
};

// Audio Alert Logic
const playAlertSound = (isEEW = false) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Pattern: 
    // EEW: Fast, harsh siren
    // Normal: Sawtooth pulse
    
    const loopCount = isEEW ? 6 : 3;
    const interval = isEEW ? 0.3 : 0.6;
    
    for (let i = 0; i < loopCount; i++) {
      const startTime = now + i * interval;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = isEEW ? 'square' : 'sawtooth';
      osc2.type = 'square';
      
      // Dissonant frequencies
      if (isEEW) {
          // Urgent siren (High-Low)
          osc1.frequency.setValueAtTime(1200, startTime);
          osc1.frequency.linearRampToValueAtTime(800, startTime + 0.15);
          osc2.frequency.setValueAtTime(1250, startTime);
          osc2.frequency.linearRampToValueAtTime(850, startTime + 0.15);
      } else {
          // Warning buzzer
          osc1.frequency.setValueAtTime(880, startTime); // A5
          osc1.frequency.linearRampToValueAtTime(600, startTime + 0.4); // Drop
          osc2.frequency.setValueAtTime(920, startTime); 
          osc2.frequency.linearRampToValueAtTime(640, startTime + 0.4);
      }

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + (isEEW ? 0.25 : 0.3));

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime + (isEEW ? 0.25 : 0.4));
      osc1.stop(startTime + (isEEW ? 0.25 : 0.4));
      osc2.stop(startTime + (isEEW ? 0.25 : 0.4));
    }

  } catch (e) {
    console.error("Alert audio failed", e);
  }
};

export const EarthquakeWidget: React.FC = () => {
  const [quakeData, setQuakeData] = useState<QuakeData | null>(null);
  const [tsunamiData, setTsunamiData] = useState<TsunamiData | null>(null);
  const [eewData, setEewData] = useState<EEWData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [activeMode, setActiveMode] = useState<DisplayMode>('EARTHQUAKE');
  
  // Constant polling interval (6s)
  const pollingInterval = 6000;
  
  // Track the last event time that triggered a sound to prevent loops
  const [lastAlertTime, setLastAlertTime] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchData = async () => {
    if (testMode) return;

    setLoading(true);
    try {
      // Fetch Quake (551), Tsunami (552), EEW (554) separately
      const [quakeRes, tsunamiRes, eewRes] = await Promise.all([
        fetch('https://api.p2pquake.net/v2/history?codes=551&limit=20', { cache: 'no-store', headers: { 'Accept': 'application/json' } }),
        fetch('https://api.p2pquake.net/v2/history?codes=552&limit=10', { cache: 'no-store', headers: { 'Accept': 'application/json' } }),
        fetch('https://api.p2pquake.net/v2/history?codes=554&limit=5', { cache: 'no-store', headers: { 'Accept': 'application/json' } })
      ]);

      // Process Earthquake Data (551)
      if (quakeRes.ok) {
        const text = await quakeRes.text();
        if (text && text.trim().length > 0) {
            const json = JSON.parse(text);
            if (Array.isArray(json) && json.length > 0) {
                const latestQuake = json[0];
                if (latestQuake && latestQuake.earthquake) {
                    const q = latestQuake.earthquake;
                    setQuakeData({
                        type: 'EARTHQUAKE',
                        time: q.time,
                        hypocenter: translateText(q.hypocenter.name),
                        magnitude: q.hypocenter.magnitude,
                        maxScale: q.maxScale,
                        depth: q.hypocenter.depth
                    });
                }
            }
        }
      }

      // Process Tsunami Data (552)
      if (tsunamiRes.ok) {
        const text = await tsunamiRes.text();
        if (text && text.trim().length > 0) {
            const json = JSON.parse(text);
             if (Array.isArray(json) && json.length > 0) {
                const latestTsunami = json[0];
                if (latestTsunami && latestTsunami.areas) {
                    const areas: TsunamiArea[] = latestTsunami.areas.map((a: any) => ({
                        grade: a.grade,
                        name: translateText(a.name)
                    }));
                    
                    let maxGrade = 'Unknown';
                    if (areas.some(a => a.grade === 'MajorWarning')) maxGrade = 'MajorWarning';
                    else if (areas.some(a => a.grade === 'Warning')) maxGrade = 'Warning';
                    else if (areas.some(a => a.grade === 'Watch')) maxGrade = 'Watch';
        
                    setTsunamiData({
                        type: 'TSUNAMI',
                        time: latestTsunami.time,
                        cancelled: latestTsunami.cancelled,
                        areas: areas,
                        maxGrade: maxGrade
                    });
                } else {
                    setTsunamiData(null);
                }
             }
        }
      }

      // Process EEW Data (554)
      if (eewRes.ok) {
          const text = await eewRes.text();
          if (text && text.trim().length > 0) {
              const json = JSON.parse(text);
              if (Array.isArray(json) && json.length > 0) {
                  const latestEEW = json[0];
                  // Check validity: must not be cancelled, and must be recent (within 3 mins)
                  const eventTime = new Date(latestEEW.time).getTime();
                  const now = Date.now();
                  const isRecent = (now - eventTime) < 3 * 60 * 1000; // 3 mins

                  if (isRecent && !latestEEW.cancelled) {
                      const eewArea = latestEEW.earthquake;
                      if (eewArea) {
                          setEewData({
                              type: 'EEW',
                              time: latestEEW.time,
                              hypocenter: translateText(eewArea.hypocenter.name),
                              magnitude: eewArea.hypocenter.magnitude,
                              maxScale: latestEEW.earthquake.maxScale || -1,
                              isCancelled: latestEEW.cancelled,
                              isWarning: latestEEW.issue.type === 'Warning'
                          });
                      }
                  } else {
                      setEewData(null); // Expired or cancelled
                  }
              }
          }
      }

    } catch (e) {
      console.error("Disaster fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [testMode]);

  useEffect(() => {
      // Constant polling
      if (testMode) return;
      
      const interval = setInterval(fetchData, pollingInterval);
      return () => clearInterval(interval);
  }, [pollingInterval, testMode]);

  // --- Alert Sound Trigger Logic ---
  useEffect(() => {
      if (testMode) return; // Handled manually in test toggle

      let shouldAlert = false;
      let eventTime = '';
      let isEEW = false;

      // 1. Check EEW (Priority)
      if (eewData) {
          if (eewData.time !== lastAlertTime) {
              shouldAlert = true;
              eventTime = eewData.time;
              isEEW = true;
          }
      } 
      // 2. Check Quake (Scale >= 30 means Shindo 3+)
      else if (quakeData && quakeData.maxScale >= 30) {
          if (quakeData.time !== lastAlertTime) {
              shouldAlert = true;
              eventTime = quakeData.time;
          }
      }
      // 3. Check Tsunami (Any active)
      else if (tsunamiData && !tsunamiData.cancelled) {
          if (tsunamiData.time !== lastAlertTime) {
              shouldAlert = true;
              eventTime = tsunamiData.time;
          }
      }

      if (shouldAlert && eventTime) {
          playAlertSound(isEEW);
          setLastAlertTime(eventTime);
      }

  }, [quakeData, tsunamiData, eewData, lastAlertTime, testMode]);


  // --- Auto Rotation & Mode Selection ---
  useEffect(() => {
      if (testMode) return;
      
      // If EEW is present, FORCE EEW mode
      if (eewData) {
          setActiveMode('EEW');
          return;
      }
      
      // If was in EEW but it's gone, reset to Earthquake
      if (activeMode === 'EEW' && !eewData) {
          setActiveMode('EARTHQUAKE');
      }

      // Normal Rotation
      const rotation = setInterval(() => {
          if (activeMode !== 'EEW') { // Don't rotate away from EEW
             setActiveMode(prev => prev === 'EARTHQUAKE' ? 'TSUNAMI' : 'EARTHQUAKE');
          }
      }, 10000);
      return () => clearInterval(rotation);
  }, [testMode, eewData, activeMode]);

  // --- Test Simulation ---
  const toggleTestMode = () => {
    if (!testMode) {
      setTestMode(true);
      setActiveMode('EEW');
      
      // Play sound immediately for test
      playAlertSound(true);

      // Simulate EEW
      setEewData({
        type: 'EEW',
        time: new Date().toISOString(),
        hypocenter: "KANTO REGION (SIMULATION)",
        magnitude: 7.5,
        maxScale: 60,
        isCancelled: false,
        isWarning: true
      });

      // Simulate Major Earthquake (Background)
      setQuakeData({
        type: 'EARTHQUAKE',
        time: new Date().toISOString(),
        hypocenter: "TOKYO BAY",
        magnitude: 7.5,
        maxScale: 60,
        depth: 50
      });

    } else {
      setTestMode(false);
      setQuakeData(null);
      setTsunamiData(null);
      setEewData(null);
      setLastAlertTime(null);
      setActiveMode('EARTHQUAKE');
      setTimeout(fetchData, 100);
    }
  };

  // --- Render Logic ---

  if (loading && !quakeData && !tsunamiData && !eewData && !testMode) return null;

  // EEW Flags
  const isEEWActive = !!eewData;

  // Determine Alert Levels
  const isQuakeAlert = quakeData ? quakeData.maxScale >= 30 : false;
  const isQuakeMajor = quakeData ? quakeData.maxScale >= 45 : false;
  
  const isTsunamiActive = tsunamiData && !tsunamiData.cancelled;
  const isTsunamiMajor = isTsunamiActive && tsunamiData?.maxGrade === 'MajorWarning';
  const isTsunamiWarning = isTsunamiActive && (tsunamiData?.maxGrade === 'Warning' || tsunamiData?.maxGrade === 'MajorWarning');

  // Determine Border/BG Color
  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-900/40';
  let shadow = '';

  if (activeMode === 'EEW') {
      borderColor = 'border-red-500';
      bgColor = 'bg-red-600';
      shadow = 'shadow-[0_0_50px_rgba(220,38,38,0.8)]';
  } else if (activeMode === 'EARTHQUAKE') {
      if (isQuakeMajor) {
          borderColor = 'border-red-600';
          bgColor = 'bg-red-950/20';
          shadow = 'shadow-[0_0_20px_rgba(220,38,38,0.3)]';
      } else if (isQuakeAlert) {
          borderColor = 'border-yellow-600';
          bgColor = 'bg-yellow-950/10';
      }
  } else {
      // Tsunami Mode
      if (isTsunamiMajor) {
          borderColor = 'border-purple-600';
          bgColor = 'bg-purple-950/30';
          shadow = 'shadow-[0_0_20px_rgba(147,51,234,0.4)]';
      } else if (isTsunamiWarning) {
          borderColor = 'border-red-600';
          bgColor = 'bg-red-950/20';
          shadow = 'shadow-[0_0_20px_rgba(220,38,38,0.3)]';
      } else if (isTsunamiActive) {
          borderColor = 'border-yellow-500';
      } else {
          borderColor = 'border-cyan-900';
      }
  }

  return (
    <div className={`relative flex flex-col items-center mt-4 w-full max-w-2xl transition-all duration-500 h-28 ${(!quakeData && !tsunamiData && !eewData) ? 'opacity-50' : 'opacity-100'}`}>
      
      {/* Header / Controls */}
      <div className="w-full flex justify-between items-end mb-1 px-1">
          {/* Mode Tabs */}
          <div className="flex gap-2">
              <button 
                  onClick={() => setActiveMode('EARTHQUAKE')}
                  className={`text-[10px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all ${activeMode === 'EARTHQUAKE' && !isEEWActive ? 'bg-[#0a0a0a] text-cyan-400 border-t border-x border-slate-700' : 'text-slate-600 hover:text-slate-400'}`}
                  disabled={isEEWActive}
              >
                  SEISMIC
              </button>
              <button 
                  onClick={() => setActiveMode('TSUNAMI')}
                  className={`text-[10px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all ${activeMode === 'TSUNAMI' && !isEEWActive ? 'bg-[#0a0a0a] text-cyan-400 border-t border-x border-slate-700' : 'text-slate-600 hover:text-slate-400'}`}
                  disabled={isEEWActive}
              >
                  TSUNAMI
              </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-700 font-mono tracking-wider">
                UPDATE: {pollingInterval / 1000}s
            </span>
            
            {/* Manual Refresh Button */}
             <button 
                onClick={fetchData}
                disabled={loading}
                className="text-slate-600 hover:text-cyan-400 transition-colors focus:outline-none p-0.5"
                title="Refresh Data"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
            </button>

            {/* Test Button */}
            <button 
                onClick={toggleTestMode}
                className={`text-[10px] tracking-widest px-2 py-0.5 border rounded-sm transition-colors ${testMode ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}
            >
                {testMode ? 'END TEST' : 'TEST SYSTEM'}
            </button>
          </div>
      </div>

      {/* Main Monitor Container */}
      <div className={`w-full bg-[#0a0a0a] border-l-4 pr-6 pl-4 py-3 relative overflow-hidden flex items-center justify-between gap-4 shadow-lg backdrop-blur-md transition-all duration-300 h-28 ${borderColor} ${activeMode === 'EEW' ? bgColor : 'bg-slate-900/40'} ${shadow}`}>
        
        {/* Animated Background Scanline */}
        {(isQuakeAlert || isTsunamiActive || isEEWActive) && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]"></div>
        )}

        {/* --- EEW VIEW --- */}
        {activeMode === 'EEW' && eewData ? (
            <div className="flex w-full justify-between items-center text-white relative z-20">
                <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                        <span className="text-xs font-bold tracking-[0.2em] animate-pulse">
                            EMERGENCY EARTHQUAKE WARNING
                        </span>
                    </div>
                    <span className="text-[10px] text-white/80 font-mono">
                        {eewData.time.substring(0, 19).replace('T', ' ')}
                    </span>
                    {eewData.isCancelled && (
                         <span className="text-[10px] bg-black/50 px-1 py-0.5 mt-1 self-start rounded border border-white/30">
                            CANCELLED
                         </span>
                    )}
                </div>

                <div className="flex flex-col items-center flex-[2]">
                    <span className="text-[10px] text-white/70 tracking-widest mb-0.5">EST. EPICENTER</span>
                    <span className="text-2xl font-black tracking-wider uppercase text-center leading-tight">
                        {eewData.hypocenter}
                    </span>
                    <span className="text-xs font-mono mt-0.5 opacity-80">
                         MAG: M{eewData.magnitude.toFixed(1)}
                    </span>
                </div>

                <div className="flex flex-col items-end flex-1">
                    <span className="text-[10px] text-white/70 tracking-widest mb-0.5">MAX INTENSITY</span>
                    <span className="text-4xl font-digital font-bold italic animate-pulse">
                        {getIntensityLabel(eewData.maxScale)}
                    </span>
                </div>
            </div>
        ) : activeMode === 'TSUNAMI' && tsunamiData ? (
            /* --- TSUNAMI VIEW --- */
            <div className="flex w-full justify-between items-center relative z-20">
                 <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isTsunamiWarning ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                        <span className={`text-[10px] tracking-[0.2em] font-bold ${isTsunamiWarning ? 'text-red-400' : 'text-yellow-400'}`}>
                            {tsunamiData.cancelled ? 'TSUNAMI END' : 'TSUNAMI ALERT'}
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono">
                        {tsunamiData.time.substring(0, 16).replace('T', ' ')}
                    </span>
                </div>

                <div className="flex flex-col items-center flex-[2]">
                    {tsunamiData.cancelled ? (
                        <span className="text-lg tracking-widest text-slate-500">
                            NO ACTIVE TSUNAMI WARNINGS
                        </span>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <span className="text-[9px] text-slate-500 tracking-widest mb-1">AFFECTED AREAS</span>
                            <div className="text-sm tracking-wide text-slate-300 text-center line-clamp-2 w-full px-4">
                                {tsunamiData.areas.map(a => a.name).join(', ')}
                            </div>
                        </div>
                    )}
                </div>

                 <div className="flex flex-col items-end flex-1">
                    <span className="text-[9px] text-slate-500 tracking-widest mb-0.5">MAX GRADE</span>
                    <span className={`text-xl font-bold italic font-sans ${getTsunamiColor(tsunamiData.maxGrade)}`}>
                        {tsunamiData.cancelled ? 'NONE' : getTsunamiGradeLabel(tsunamiData.maxGrade)}
                    </span>
                </div>
            </div>
        ) : (
            /* --- EARTHQUAKE VIEW (Default) --- */
            <div className="flex w-full justify-between items-center relative z-20">
                <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isQuakeAlert ? 'bg-yellow-500' : 'bg-green-500'} ${isQuakeAlert ? 'animate-pulse' : ''}`}></div>
                        <span className={`text-[10px] tracking-[0.2em] font-bold ${isQuakeAlert ? 'text-yellow-500' : 'text-slate-500'}`}>
                            {quakeData ? (isQuakeAlert ? 'SEISMIC ALERT' : 'MONITORING') : 'NO DATA'}
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono">
                        {quakeData ? quakeData.time.substring(0, 16).replace('T', ' ') : '---'}
                    </span>
                </div>

                <div className="flex flex-col items-center flex-[2]">
                    <span className="text-[9px] text-slate-500 tracking-widest mb-0.5">EPICENTER</span>
                    <span className="text-xl font-bold tracking-wider text-slate-200 text-center leading-tight">
                        {quakeData ? quakeData.hypocenter : '---'}
                    </span>
                    {quakeData && (
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            DEPTH: {quakeData.depth}km / MAG: M{quakeData.magnitude.toFixed(1)}
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-end flex-1">
                    <span className="text-[9px] text-slate-500 tracking-widest mb-0.5">MAX INTENSITY</span>
                    <span className={`text-4xl font-digital font-bold italic ${isQuakeMajor ? 'text-red-500' : (isQuakeAlert ? 'text-yellow-500' : 'text-cyan-400')}`}>
                        {quakeData ? getIntensityLabel(quakeData.maxScale) : '-'}
                    </span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};