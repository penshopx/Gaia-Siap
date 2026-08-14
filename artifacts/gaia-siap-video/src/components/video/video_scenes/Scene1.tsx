import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Asset paths
const BG_VIDEO = `${import.meta.env.BASE_URL}videos/gaia_light_bg.mp4`;
const NODES_IMG = `${import.meta.env.BASE_URL}images/gaia_nodes.png`;

export const Scene1: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Text 1 appears
      setTimeout(() => setPhase(2), 2000),  // Text 2 appears + chaos intensifies
      setTimeout(() => setPhase(3), 4000),  // Climax of chaos
      setTimeout(() => setPhase(4), 13000), // Start exit choreography
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-[var(--color-bg-light)] overflow-hidden flex items-center justify-center">
      
      {/* Background layer */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        src={BG_VIDEO}
      />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none mix-blend-multiply" />

      {/* Chaos Nodes (representing complex problems) */}
      <motion.div
        className="absolute w-full h-full flex items-center justify-center pointer-events-none opacity-40"
        initial={{ scale: 1.5, rotate: 0, opacity: 0 }}
        animate={{ 
          scale: phase >= 1 ? [1.5, 1.2, 1.4, 1.1, 1.6] : 1.5,
          rotate: phase >= 1 ? [0, 5, -5, 10, -10] : 0,
          opacity: phase >= 1 ? [0, 0.4, 0.6, 0.8, 0.5] : 0,
          filter: phase >= 2 ? 'blur(8px) contrast(150%)' : 'blur(4px) contrast(100%)'
        }}
        transition={{ 
          duration: 15, 
          ease: "linear",
          times: [0, 0.2, 0.5, 0.8, 1]
        }}
      >
        <img src={NODES_IMG} alt="Nodes" className="w-[120%] h-[120%] object-cover object-center max-w-none" />
      </motion.div>

      {/* Red chaotic lines representing broken processes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          d="M0,50 Q25,20 50,50 T100,50 M0,70 Q30,90 60,40 T100,20 M0,30 Q40,10 70,60 T100,80"
          stroke="var(--color-error)"
          strokeWidth="0.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: phase >= 1 ? 1 : 0,
            opacity: phase >= 2 ? [0.3, 0.8, 0.2, 0.9, 0] : 0,
            strokeDasharray: phase >= 3 ? ["5, 5", "20, 10", "2, 8"] : "none"
          }}
          transition={{ duration: 10, ease: "easeInOut" }}
        />
      </svg>

      {/* Foreground Content */}
      <div className="relative z-10 w-[80%] max-w-5xl flex flex-col items-center text-center">
        
        <div className="overflow-hidden mb-6">
          <motion.h1
            className="text-[5vw] font-display font-bold text-primary leading-tight tracking-tight"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ 
              y: phase >= 1 ? 0 : "100%", 
              opacity: phase >= 1 ? 1 : 0,
              filter: phase >= 3 ? "blur(2px)" : "blur(0px)",
              x: phase >= 3 ? [0, -5, 5, -2, 2, 0] : 0
            }}
            transition={{ 
              y: { duration: 1, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 1 },
              x: { duration: 0.5, repeat: 4, repeatType: "mirror", delay: 4 }
            }}
          >
            Masalah bisnis
            <br />
            <span className="text-error font-serif italic pr-4">semakin kompleks.</span>
          </motion.h1>
        </div>

        <motion.div
          className="w-24 h-1 bg-error rounded-full mb-8"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          style={{ originX: 0.5 }}
        />

        <div className="overflow-hidden">
          <motion.p
            className="text-[2.5vw] font-body text-secondary max-w-3xl"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ 
              y: phase >= 2 ? 0 : "100%", 
              opacity: phase >= 2 ? 1 : 0,
              filter: phase >= 3 ? "blur(1px)" : "blur(0px)"
            }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Tanpa struktur yang jelas,
            <br />
            <span className="font-semibold text-primary">operasional menjadi kacau.</span>
          </motion.p>
        </div>

      </div>

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
