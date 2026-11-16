import React, { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  /** 0–1 */
  mouthOpen: number;
  speaking: boolean;
  className?: string;
};

/**
 * พูดแบบสมจริง: เลื่อนขากรรไกรจากภาพเดิม + เงาปากบาง ๆ
 * ไม่ใช้ปากการ์ตูนทับหน้า
 */
const TalkingAvatar: React.FC<Props> = ({ src, alt, mouthOpen, speaking, className }) => {
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target = speaking ? Math.max(0, Math.min(1, mouthOpen)) : 0;
      // easing นุ่ม เหมือนกล้ามเนื้อจริง
      smoothRef.current += (target - smoothRef.current) * 0.22;
      if (Math.abs(smoothRef.current - target) < 0.002) smoothRef.current = target;
      setSmooth(smoothRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mouthOpen, speaking]);

  const s = smooth;
  const jaw = s * 9;

  return (
    <div className={`relative overflow-hidden bg-[#ffdf80] ${className || ''}`}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        referrerPolicy="no-referrer"
        draggable={false}
      />

      {/* ขากรรไกร = ครึ่งล่างของภาพเดิม เลื่อนลงตามจังหวะพูด */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover will-change-transform"
        referrerPolicy="no-referrer"
        draggable={false}
        style={{
          clipPath: 'inset(54% 0 0 0)',
          transform: `translate3d(0, ${jaw}px, 0)`,
        }}
      />

      {/* เส้นเงาใต้จมูก/เหนือปาก */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[18%]"
        style={{
          top: `calc(54% + ${jaw * 0.25}px)`,
          height: 8 + s * 5,
          background:
            s > 0.03
              ? `linear-gradient(to bottom, rgba(0,0,0,${0.1 + s * 0.16}), transparent)`
              : 'transparent',
        }}
      />

      {/* เงาในช่องปาก — blend กับภาพ ไม่ใช่สติ๊กเกอร์ */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 rounded-[50%]"
        style={{
          top: `calc(63.5% + ${jaw * 0.4}px)`,
          width: 24 + s * 22,
          height: Math.max(1.2, 1.2 + s * 11),
          opacity: s < 0.05 ? 0 : 0.14 + s * 0.4,
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(48,16,14,0.95) 0%, rgba(28,10,8,0.5) 60%, transparent 80%)',
          filter: 'blur(0.75px)',
          mixBlendMode: 'multiply',
          transform: 'translateX(-50%)',
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
    </div>
  );
};

export default TalkingAvatar;
