import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const NODES_IMG = `${import.meta.env.BASE_URL}images/gaia_nodes.png`;

export const Scene2: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),   // Subtitle up
      setTimeout(() => setPhase(2), 1500),  // SIAP breakdown
      setTimeout(() => setPhase(3), 13500), // Start exit choreography
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Letters for the logo stagger
  const logoLetters = "Gaia SIAP".split("");

  return (
    <div className="absolute inset-0 w-full h-full bg-primary overflow-hidden flex items-center justify-center">
      
      {/* Background layer */}
      <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none mix-blend-overlay" />
      
      <motion.div
        className="absolute w-full h-full flex items-center justify-center pointer-events-none opacity-20"
        initial={{ scale: 1.2, rotate: -5, opacity: 0 }}
        animate={{ 
          scale: 1, 
          rotate: 0, 
          opacity: 0.15 
        }}
        transition={{ duration: 15, ease: "easeOut" }}
      >
        <img src={NODES_IMG} alt="Nodes" className="w-[120%] h-[120%] object-cover object-center max-w-none mix-blend-luminosity" />
      </motion.div>

      {/* Grid pattern */}
      <motion.div 
        className="absolute inset-0 opacity-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2, delay: 0.5 }}
        style={{
          backgroundImage: 'linear-gradient(var(--color-bg-light) 1px, transparent 1px), linear-gradient(90deg, var(--color-bg-light) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw'
        }}
      />

      <div className="relative z-10 w-[90%] max-w-6xl flex flex-col items-center">
        
        {/* Subtitle */}
        <motion.div
          className="mb-6 px-6 py-2 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ 
            opacity: phase >= 1 ? 1 : 0, 
            y: phase >= 1 ? 0 : 20,
            scale: phase >= 1 ? 1 : 0.9
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[1.2vw] font-mono text-accent tracking-widest uppercase font-semibold">
            Sistem Orchestrasi B2B
          </p>
        </motion.div>

        {/* Logo Text */}
        <div className="flex overflow-hidden mb-12 py-2">
          {logoLetters.map((letter, i) => (
            <motion.span
              key={i}
              className={`text-[8vw] font-display font-bold leading-none ${letter === ' ' ? 'w-[2vw]' : ''} ${i > 4 ? 'text-accent' : 'text-inverse'}`}
              initial={{ y: "100%", opacity: 0, rotateX: -90 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              transition={{ 
                duration: 1, 
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.05 
              }}
              style={{ transformOrigin: "bottom" }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* SIAP Breakdown Cards */}
        <div className="flex gap-[2vw] mt-[4vw] w-full justify-center perspective-[1000px]">
          {[
            { title: "Sistematis", desc: "Alur terstruktur" },
            { title: "Integratif", desc: "Data terpusat" },
            { title: "Adaptif", desc: "Kustomisasi fleksibel" },
            { title: "Produktif", desc: "Fokus pada hasil" }
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex-1 max-w-[20%] bg-secondary/40 backdrop-blur-md border border-inverse/10 rounded-2xl p-[2vw] flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 50, rotateX: 45 }}
              animate={{ 
                opacity: phase >= 2 ? 1 : 0, 
                y: phase >= 2 ? 0 : 50,
                rotateX: phase >= 2 ? 0 : 45
              }}
              transition={{ 
                duration: 1, 
                ease: [0.16, 1, 0.3, 1],
                delay: phase >= 2 ? i * 0.15 : 0
              }}
            >
              <div className="w-[3vw] h-[3vw] rounded-full bg-accent/20 flex items-center justify-center mb-[1vw]">
                <div className="w-[1vw] h-[1vw] rounded-full bg-accent" />
              </div>
              <h3 className="text-[1.5vw] font-display font-bold text-inverse mb-[0.5vw]">{item.title}</h3>
              <p className="text-[1vw] font-body text-muted">{item.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Scene Exit Cover */}
      <motion.div
        className="absolute inset-0 bg-bg-light z-50 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
};
