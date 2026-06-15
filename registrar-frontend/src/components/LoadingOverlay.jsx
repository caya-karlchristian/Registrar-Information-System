import React, { useEffect, useRef, useCallback } from "react";
import loading1 from "../assets/Loading 1.png";
import loading2 from "../assets/Loading 2.png";
import loading3 from "../assets/Loading 3.png";
import { useTheme } from "../context/ThemeContext";

const IMGS = [loading1, loading2, loading3];

const TRANSFORMS = [
  "translate(56px, 0px)",
  "translate(28px, 28px)",
  "translate(0px, 56px)",
];

const LoadingOverlay = ({ isVisible = false, message = "Loading..." }) => {
  const { isDark } = useTheme();
  const r0 = useRef(null);
  const r1 = useRef(null);
  const r2 = useRef(null);
  const refs = useRef([r0, r1, r2]);
  const timers = useRef([]);
  const chars = useRef(message.split(""));

  useEffect(() => { chars.current = message.split(""); }, [message]);

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const after = useCallback((ms, fn) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const runCycle = useCallback(() => {
    const els = refs.current.map(r => r.current);
    if (els.some(el => !el)) return;

    const FADE  = 400; // fade transition duration
    const GAP   = 250; // stagger between each folder
    const HOLD  = 500; // pause while all invisible
    const CYCLE = (FADE + GAP) * 3 + HOLD + (FADE + GAP) * 3 + 600;

    // FADE OUT: front (index 2) → mid (index 1) → back (index 0)
    [2, 1, 0].forEach((elIdx, order) => {
      after((FADE + GAP) * order, () => {
        const el = els[elIdx];
        if (!el) return;
        el.style.transition = `opacity ${FADE}ms ease`;
        el.style.opacity = "0";
      });
    });

    // FADE IN: back (index 0) → mid (index 1) → front (index 2)
    const inStart = (FADE + GAP) * 3 + HOLD;
    [0, 1, 2].forEach((elIdx, order) => {
      after(inStart + (FADE + GAP) * order, () => {
        const el = els[elIdx];
        if (!el) return;
        el.style.transition = `opacity ${FADE}ms ease`;
        el.style.opacity = "1";
      });
    });

    // Loop
    after(CYCLE, runCycle);
  }, [after]);

  useEffect(() => {
    if (!isVisible) return;

    // Set initial state
    const rs = refs.current;
    rs.forEach((r, i) => {
      if (!r.current) return;
      r.current.style.transition = "none";
      r.current.style.transform  = TRANSFORMS[i];
      r.current.style.zIndex     = String(i + 1);
      r.current.style.opacity    = "1";
    });

    runCycle();
    return () => clearAll();
  }, [isVisible, runCycle, clearAll]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-20 flex flex-col modal-overlay-container  items-center justify-center px-4 backdrop-blur-sm ${isDark ? 'bg-[#18191a]/85' : 'bg-white/80'}`}>
      <div className="flex flex-col items-center gap-3 sm:gap-4 text-center max-w-[90vw]">

        <div className="relative h-44 w-44 sm:h-52 sm:w-52">
          {IMGS.map((src, i) => (
            <img
              key={i}
              ref={refs.current[i]}
              src={src}
              alt={`Loading folder ${i + 1}`}
              className="absolute top-0 left-0 w-32 sm:w-36 drop-shadow-[0_14px_22px_rgba(0,0,0,0.18)]"
              style={{
                willChange: "opacity",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: TRANSFORMS[i],
                zIndex: i + 1,
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
          {chars.current.map((char, i) => (
            <span
              key={i}
              className={`font-bold text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest inline-block ${isDark ? 'text-[#e4e6eb]' : 'text-[#800000]'}`}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
};

export default React.memo(LoadingOverlay);