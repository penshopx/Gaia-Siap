import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const AI_CORE_IMG = `${import.meta.env.BASE_URL}images/gaia_ai_core.png`;
const BG_VIDEO = `${import.meta.env.BASE_URL}videos/gaia_ai_bg.mp4`;

export const Scene5: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // AI Core appears
      setTimeout(() => setPhase(2), 1500),  // Text appears
      setTimeout(() => setPhase(3), 2500),  // Analysis lines start
      setTimeout(() => setPhase(4), 4000),  // Recommendation cards appear
      setTimeout(() => setPhase(5), 23500), // Exit choreography
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-bg-dark overflow-hidden flex flex-col items-center justify-center">
      
      {/* Cinematic Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        src={BG_VIDEO}
      />
      
      {/* Background layer */}
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none" />
      
      {/* Radial Gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-bg-dark)_80%)] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        
        {/* Left Content - Text */}
        <div className="w-[45%] pl-[10vw] flex flex-col justify-center">
          <motion.div
            className="flex items-center gap-[1vw] mb-[2vw]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -20 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-[1vw] h-[1vw] bg-accent rounded-full animate-pulse" />
            <span className="text-[1.2vw] font-mono text-accent tracking-widest uppercase">
              Gustafta AI Processing
            </span>
          </motion.div>

          <div className="overflow-hidden mb-[1vw]">
            <motion.h2
              className="text-[4vw] font-display font-bold text-inverse leading-tight"
              initial={{ y: "100%" }}
              animate={{ y: phase >= 2 ? 0 : "100%" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              Analisis Tajam.
            </motion.h2>
          </div>
          
          <div className="overflow-hidden">
            <motion.h2
              className="text-[3vw] font-serif italic text-muted leading-tight"
              initial={{ y: "100%" }}
              animate={{ y: phase >= 2 ? 0 : "100%" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            >
              Rekomendasi Akurat.
            </motion.h2>
          </div>
        </div>

        {/* Right Content - AI Core & Analysis */}
        <div className="w-[55%] h-full relative flex items-center justify-center perspective-[1000px]">
          
          {/* AI Core Image */}
          <motion.div
            className="relative z-20 w-[60%] aspect-square flex items-center justify-center"
            initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={{ 
              scale: phase >= 1 ? 1 : 0.5, 
              opacity: phase >= 1 ? 1 : 0,
              rotateY: phase >= 1 ? 0 : 90
            }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.img 
              src={AI_CORE_IMG} 
              alt="AI Core" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_3vw_rgba(16,185,129,0.3)]"
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Scanning Ring */}
            <motion.div
              className="absolute w-[120%] h-[120%] border border-accent/30 rounded-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: phase >= 3 ? [0.8, 1.5] : 0.8,
                opacity: phase >= 3 ? [0, 0.5, 0] : 0
              }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              style={{ borderStyle: 'dashed' }}
            />
          </motion.div>

          {/* Analysis Data Points floating around */}
          {[
            { top: "20%", left: "20%", delay: 0, label: "Pattern Match" },
            { top: "70%", left: "15%", delay: 0.2, label: "Risk Score: Low" },
            { top: "30%", left: "80%", delay: 0.4, label: "Resource Opt" },
            { top: "80%", left: "75%", delay: 0.6, label: "Time Save: 40%" }
          ].map((point, i) => (
            <motion.div
              key={i}
              className="absolute bg-primary/80 backdrop-blur-md border border-accent/20 px-[1.5vw] py-[0.8vw] rounded-lg z-30"
              style={{ top: point.top, left: point.left }}
              initial={{ opacity: 0, scale: 0, z: -100 }}
              animate={{ 
                opacity: phase >= 4 ? 1 : 0, 
                scale: phase >= 4 ? 1 : 0,
                z: phase >= 4 ? 0 : -100
              }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1],
                delay: phase >= 4 ? point.delay : 0 
              }}
            >
              <span className="text-[1vw] font-mono text-accent">{point.label}</span>
            </motion.div>
          ))}
          
        </div>
      </div>

      {/* Scene Exit Cover */}
      <motion.div
        className="absolute inset-0 bg-bg-light z-50 origin-top"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: phase >= 5 ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
};
