import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const Scene7: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Content appears
      setTimeout(() => setPhase(2), 8500),  // Exit choreography (loop back to start)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-primary overflow-hidden flex flex-col items-center justify-center relative">
      
      {/* Background layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-secondary)_0%,var(--color-primary)_100%)] opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none mix-blend-overlay" />
      
      {/* Animated geometric background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-accent/20"
            style={{
              width: `${40 + i * 20}vw`,
              height: `${40 + i * 20}vw`,
              top: '50%',
              left: '50%',
              x: '-50%',
              y: '-50%',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: phase >= 1 ? [1, 1.05, 1] : 0.8, 
              opacity: phase >= 1 ? 1 : 0 
            }}
            transition={{ 
              opacity: { duration: 1 },
              scale: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" }
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Logo Text */}
        <motion.div
          className="mb-[2vw]"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: phase >= 1 ? 0 : 30, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[6vw] font-display font-bold text-inverse leading-none tracking-tight">
            Gaia <span className="text-accent">SIAP</span>
          </h1>
        </motion.div>
        
        {/* CTA / Tagline */}
        <div className="overflow-hidden mb-[4vw]">
          <motion.p
            className="text-[2vw] font-body text-muted max-w-2xl"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: phase >= 1 ? 0 : "100%", opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Ubah masalah kompleks menjadi tindakan terstruktur.
          </motion.p>
        </div>

        {/* Visual "Button" (not interactive, just for show) */}
        <motion.div
          className="px-[3vw] py-[1vw] bg-accent text-inverse font-bold text-[1.5vw] rounded-full shadow-[0_0_2vw_rgba(16,185,129,0.4)] relative overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 1 : 0.8, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "backOut", delay: 0.6 }}
        >
          {/* Button shine effect */}
          <motion.div 
            className="absolute inset-0 w-1/2 bg-inverse/30 transform -skew-x-12"
            initial={{ left: "-100%" }}
            animate={{ left: phase >= 1 ? "200%" : "-100%" }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 1.5, repeat: Infinity, repeatDelay: 3 }}
          />
          Mulai Sekarang
        </motion.div>

      </div>

      {/* Final Exit Cover (Fade to black to reset loop cleanly if needed, though Scene 1 starts with its own bg) */}
      <motion.div
        className="absolute inset-0 bg-bg-light z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 1.5 }}
      />
    </div>
  );
};
