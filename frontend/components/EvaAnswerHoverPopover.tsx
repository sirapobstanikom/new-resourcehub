import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type EvaAnswerHoverPopoverProps = {
  /** ข้อความเต็มที่แสดงในป๊อปอัพ */
  text: string;
  children: React.ReactNode;
  className?: string;
};

/** แสดงป๊อปอัพข้อความเต็มเมื่อชี้เมาส์ (หรือโฟกัสภายใน) — ใช้กับช่องคำตอบตาราง COMMITMENT */
export function EvaAnswerHoverPopover({ text, children, className = '' }: EvaAnswerHoverPopoverProps) {
  const display = text.trim();
  const tooltipId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition]);

  if (!display) {
    return <>{children}</>;
  }

  const tooltip =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none fixed z-[200] w-max max-w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-[calc(100%+10px)]"
        style={{ left: coords.x, top: coords.y }}
      >
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-3.5 py-2.5 text-sm font-medium leading-relaxed text-gray-900 shadow-2xl shadow-black/70 ring-2 ring-amber-300/80 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {display}
        </div>
        <span
          className="absolute left-1/2 top-full -translate-x-1/2 -mt-px border-[6px] border-transparent border-t-amber-400"
          aria-hidden
        />
        <span
          className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-amber-50"
          aria-hidden
        />
      </div>,
      document.body
    );

  return (
    <>
      <div
        ref={anchorRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={(e) => {
          const next = e.relatedTarget as Node | null;
          if (!next || !anchorRef.current?.contains(next)) hide();
        }}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </div>
      {tooltip}
    </>
  );
}

