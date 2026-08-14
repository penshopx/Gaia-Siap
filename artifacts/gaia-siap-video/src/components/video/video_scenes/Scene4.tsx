import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const Scene4: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Show nodes
      setTimeout(() => setPhase(2), 1500),  // Step 1
      setTimeout(() => setPhase(3), 2500),  // Step 2
      setTimeout(() => setPhase(4), 3500),  // Step 3
      setTimeout(() => setPhase(5), 4500),  // Step 4
      setTimeout(() => setPhase(6), 23500), // Exit choreography
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    { id: 1, title: "Draft", desc: "Kasus Dibuat" },
    { id: 2, title: "Intake", desc: "Data Diverifikasi" },
    { id: 3, title: "Processing", desc: "Analisis AI" },
    { id: 4, title: "Review", desc: "Rekomendasi Siap" }
  ];

  return (
    <div className="absolute inset-0 w-full h-full bg-primary overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background layer */}
      <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none mix-blend-overlay" />
      
      {/* Title */}
      <div className="absolute top-[10%] w-full text-center z-20">
        <motion.h2
          className="text-[3.5vw] font-display font-bold text-inverse mb-[1vw]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -20 }}
          transition={{ duration: 0.8 }}
        >
          Alur Kerja <span className="text-accent">Otomatis.</span>
        </motion.h2>
        <motion.p
          className="text-[1.5vw] text-muted font-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Progress terlihat, status terlacak.
        </motion.p>
      </div>

      {/* Workflow Diagram */}
      <div className="relative w-[80%] h-[40vh] flex items-center justify-between z-10 mt-[10vh]">
        
        {/* Connection Line Background */}
        <div className="absolute left-[10%] right-[10%] top-1/2 h-[0.4vw] bg-secondary/50 -translate-y-1/2 rounded-full overflow-hidden">
          {/* Progress fill */}
          <motion.div 
            className="absolute left-0 top-0 bottom-0 bg-accent"
            initial={{ width: "0%" }}
            animate={{ 
              width: phase >= 5 ? "100%" : 
                     phase >= 4 ? "75%" : 
                     phase >= 3 ? "50%" : 
                     phase >= 2 ? "25%" : "0%"
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>

        {/* Workflow Nodes */}
        {steps.map((step, i) => {
          const isActive = phase >= i + 2;
          const isCurrent = phase === i + 2;
          
          return (
            <div key={i} className="relative flex flex-col items-center z-10">
              
              {/* Pulse effect for current node */}
              {isCurrent && (
                <motion.div
                  className="absolute top-[2vw] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[6vw] h-[6vw] rounded-full bg-accent/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              <motion.div
                className={`w-[4vw] h-[4vw] rounded-full border-4 flex items-center justify-center bg-primary z-10 mb-[2vw] relative ${isActive ? 'border-accent' : 'border-secondary'}`}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ 
                  scale: phase >= 1 ? (isCurrent ? 1.2 : 1) : 0, 
                  rotate: phase >= 1 ? 0 : -90,
                  borderColor: isActive ? "var(--color-accent)" : "var(--color-secondary)",
                  backgroundColor: isActive ? "var(--color-accent)" : "var(--color-primary)"
                }}
                transition={{ duration: 0.5, delay: phase >= 1 ? i * 0.1 : 0 }}
              >
                {isActive ? (
                  <motion.svg className="w-[2vw] h-[2vw] text-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  <span className="text-[1.5vw] font-bold text-muted">{step.id}</span>
                )}
              </motion.div>

              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: phase >= 1 ? (isActive ? 1 : 0.5) : 0, 
                  y: phase >= 1 ? 0 : 20 
                }}
                transition={{ duration: 0.5, delay: phase >= 1 ? i * 0.1 : 0 }}
              >
                <h4 className={`text-[1.5vw] font-display font-bold ${isActive ? 'text-inverse' : 'text-muted'}`}>
                  {step.title}
                </h4>
                <p className={`text-[1vw] font-body mt-[0.5vw] ${isActive ? 'text-accent' : 'text-secondary'}`}>
                  {step.desc}
                </p>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Floating abstract particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-[0.5vw] h-[0.5vw] rounded-full bg-accent/40 blur-sm pointer-events-none"
          initial={{ 
            x: `${Math.random() * 100}vw`, 
            y: `${Math.random() * 100}vh`,
            opacity: 0
          }}
          animate={{ 
            y: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
            x: [`${Math.random() * 100}vw`, `${Math.random() * 100}vw`],
            opacity: phase >= 1 ? [0, 0.5, 0] : 0
          }}
          transition={{ 
            duration: 10 + Math.random() * 10, 
            repeat: Infinity,
            ease: "linear" 
          }}
        />
      ))}

      {/* Scene Exit Cover */}
      <motion.div
        className="absolute inset-0 bg-bg-dark z-50"
        initial={{ clipPath: "circle(0% at 50% 50%)" }}
        animate={{ clipPath: phase >= 6 ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)" }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
};
