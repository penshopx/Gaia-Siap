import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const Scene6: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Title up
      setTimeout(() => setPhase(2), 1200),  // Stagger result blocks
      setTimeout(() => setPhase(3), 3500),  // Transform to structured layout
      setTimeout(() => setPhase(4), 18500), // Exit choreography
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-bg-light overflow-hidden flex flex-col items-center justify-center p-[5vw]">
      
      {/* Background layer */}
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
          backgroundSize: '2vw 2vw'
        }}
      />

      {/* Header */}
      <div className="w-full max-w-6xl mb-[4vw] relative z-10 flex justify-between items-end">
        <div className="overflow-hidden">
          <motion.h2
            className="text-[4vw] font-display font-bold text-primary leading-none"
            initial={{ y: "100%" }}
            animate={{ y: phase >= 1 ? 0 : "100%" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Output <span className="text-success text-gradient">Terstruktur.</span>
          </motion.h2>
        </div>
        <motion.div
          className="text-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : 20 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-[1.5vw] font-body text-secondary">Keputusan lebih cepat.</p>
          <p className="text-[1.5vw] font-body font-bold text-primary">Hasil lebih baik.</p>
        </motion.div>
      </div>

      {/* Results UI Mockup */}
      <motion.div
        className="w-full max-w-6xl flex-1 bg-inverse rounded-[2vw] shadow-[0_2vw_5vw_rgba(26,46,92,0.1)] border border-primary/10 overflow-hidden relative z-10 p-[3vw] flex flex-col gap-[2vw]"
        initial={{ y: "20vh", opacity: 0 }}
        animate={{ y: phase >= 2 ? 0 : "20vh", opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Top Section: Summary & Action */}
        <div className="flex gap-[2vw]">
          {/* Summary Card */}
          <motion.div
            className="flex-1 bg-bg-muted rounded-xl p-[2vw] border border-primary/5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.95 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex justify-between items-start mb-[1vw]">
              <div>
                <h3 className="text-[1.5vw] font-bold text-primary">Status Kasus: Selesai</h3>
                <p className="text-[1vw] text-secondary">Dianalisis oleh Gustafta AI</p>
              </div>
              <div className="bg-success/20 text-success px-[1vw] py-[0.5vw] rounded-full text-[0.9vw] font-bold">
                High Priority
              </div>
            </div>
            
            {/* Animated progress lines turning solid */}
            <div className="flex flex-col gap-[0.8vw] mt-[2vw]">
              {[1, 0.8, 0.6].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-[1vw] rounded-sm bg-primary/20 relative overflow-hidden"
                  style={{ width: `${w * 100}%` }}
                >
                  <motion.div
                    className="absolute inset-0 bg-primary"
                    initial={{ x: "-100%" }}
                    animate={{ x: phase >= 3 ? "0%" : "-100%" }}
                    transition={{ duration: 1, delay: 0.5 + (i * 0.2), ease: "easeOut" }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action Plan Card */}
          <motion.div
            className="w-[30%] bg-primary rounded-xl p-[2vw] text-inverse"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-[1.5vw] font-bold mb-[1.5vw]">Action Plan</h3>
            <ul className="flex flex-col gap-[1vw]">
              {[
                "Alokasi resource tim A",
                "Update parameter sistem",
                "Review log bulan ini"
              ].map((item, i) => (
                <motion.li
                  key={i}
                  className="flex items-center gap-[0.5vw] text-[1vw]"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : 10 }}
                  transition={{ duration: 0.5, delay: 1 + (i * 0.15) }}
                >
                  <div className="w-[1vw] h-[1vw] rounded-full bg-accent flex-shrink-0" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section: Data Table Mockup */}
        <motion.div
          className="flex-1 bg-bg-light rounded-xl border border-primary/5 p-[1.5vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="grid grid-cols-4 gap-[1vw] mb-[1vw] border-b border-primary/10 pb-[1vw]">
            <div className="text-[0.9vw] font-bold text-secondary uppercase tracking-wider">Metric</div>
            <div className="text-[0.9vw] font-bold text-secondary uppercase tracking-wider">Before</div>
            <div className="text-[0.9vw] font-bold text-secondary uppercase tracking-wider">After (Est)</div>
            <div className="text-[0.9vw] font-bold text-secondary uppercase tracking-wider">Impact</div>
          </div>
          
          {[1, 2, 3].map((row, i) => (
            <motion.div
              key={i}
              className="grid grid-cols-4 gap-[1vw] py-[0.8vw]"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.5, delay: 1.5 + (i * 0.1) }}
            >
              <div className="h-[1vw] w-[80%] bg-primary/10 rounded" />
              <div className="h-[1vw] w-[50%] bg-primary/10 rounded" />
              <div className="h-[1vw] w-[60%] bg-accent/20 rounded" />
              <div className="h-[1vw] w-[40%] bg-success/30 rounded" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scene Exit Cover */}
      <motion.div
        className="absolute inset-0 bg-primary z-50 origin-bottom"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: phase >= 4 ? 1 : 0 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
};
