import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const OFFICE_IMG = `${import.meta.env.BASE_URL}images/gaia_office.png`;

export const Scene3: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Form container up
      setTimeout(() => setPhase(2), 1200),  // Type title
      setTimeout(() => setPhase(3), 2000),  // Stagger inputs
      setTimeout(() => setPhase(4), 4000),  // Fill inputs
      setTimeout(() => setPhase(5), 5500),  // Submit button press
      setTimeout(() => setPhase(6), 6000),  // Process start / shrink
      setTimeout(() => setPhase(7), 18500), // Exit choreography
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-bg-light overflow-hidden flex items-center justify-between px-[10vw]">
      
      {/* Background layer */}
      <img 
        src={OFFICE_IMG} 
        alt="Office" 
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] grayscale"
      />
      
      {/* Left side text */}
      <div className="w-[40%] z-10">
        <motion.div
          className="w-16 h-1 bg-accent mb-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ originX: 0 }}
        />
        
        <div className="overflow-hidden mb-4">
          <motion.h2
            className="text-[4vw] font-display font-bold text-primary leading-tight"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Langkah 1:<br/>Intake Kasus.
          </motion.h2>
        </div>
        
        <div className="overflow-hidden">
          <motion.p
            className="text-[1.8vw] font-body text-secondary"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            Masukkan informasi, <br/>biarkan sistem bekerja.
          </motion.p>
        </div>
      </div>

      {/* Right side Form UI Mockup */}
      <motion.div
        className="w-[45%] aspect-[3/4] bg-inverse rounded-[2vw] shadow-2xl border border-primary/5 flex flex-col overflow-hidden relative z-10"
        initial={{ y: "20vh", opacity: 0, rotateY: -15, scale: 0.9 }}
        animate={{ 
          y: phase >= 6 ? "5vh" : (phase >= 1 ? 0 : "20vh"), 
          opacity: phase >= 1 ? 1 : 0,
          rotateY: phase >= 6 ? -5 : (phase >= 1 ? -5 : -15),
          scale: phase >= 6 ? 0.8 : (phase >= 1 ? 1 : 0.9),
          x: phase >= 6 ? "10vw" : 0
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        {/* Mockup Header */}
        <div className="h-[4vw] bg-bg-muted border-b border-primary/5 flex items-center px-[2vw] gap-[0.5vw]">
          <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-error" />
          <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-warning" />
          <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-success" />
        </div>

        <div className="p-[3vw] flex-1 flex flex-col gap-[2vw]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -20 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-[2vw] font-display font-bold text-primary">Buat Kasus Baru</h3>
            <p className="text-[1vw] text-muted">Isi detail permasalahan bisnis.</p>
          </motion.div>

          {/* Form Inputs */}
          {[
            { label: "Judul Kasus", width: "100%", fillWidth: "80%" },
            { label: "Kategori", width: "40%", fillWidth: "30%" },
            { label: "Deskripsi Detail", width: "100%", height: "8vw", fillLines: 3 }
          ].map((input, i) => (
            <motion.div
              key={i}
              className="flex flex-col gap-[0.5vw]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <span className="text-[0.9vw] font-semibold text-secondary">{input.label}</span>
              <div 
                className="bg-bg-light border border-primary/10 rounded-lg p-[1vw] relative overflow-hidden"
                style={{ width: input.width, height: input.height || 'auto' }}
              >
                {/* Typing simulation effect */}
                {input.fillLines ? (
                  <div className="flex flex-col gap-[0.5vw]">
                    {[0.9, 0.7, 0.5].map((w, j) => (
                      <motion.div 
                        key={j}
                        className="h-[0.8vw] bg-primary/20 rounded-sm"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: phase >= 4 ? w : 0 }}
                        transition={{ duration: 1, delay: phase >= 4 ? (i * 0.2) + (j * 0.2) : 0 }}
                        style={{ originX: 0 }}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    className="h-[1vw] bg-primary/20 rounded-sm"
                    initial={{ scaleX: 0, width: input.fillWidth }}
                    animate={{ scaleX: phase >= 4 ? 1 : 0 }}
                    transition={{ duration: 0.8, delay: phase >= 4 ? i * 0.2 : 0 }}
                    style={{ originX: 0 }}
                  />
                )}
              </div>
            </motion.div>
          ))}

          <motion.div
            className="mt-auto self-end bg-accent text-inverse px-[2vw] py-[1vw] rounded-lg font-bold text-[1.2vw] flex items-center gap-[0.5vw]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: phase >= 3 ? 1 : 0, 
              scale: phase >= 5 ? [1, 0.95, 1] : (phase >= 3 ? 1 : 0.9),
              backgroundColor: phase >= 6 ? "var(--color-primary)" : "var(--color-accent)"
            }}
            transition={{ 
              duration: 0.5, 
              scale: { duration: 0.3, times: [0, 0.5, 1] } 
            }}
          >
            {phase >= 6 ? "Memproses..." : "Proses Kasus"}
          </motion.div>
        </div>

        {/* Success Overlay overlay on submit */}
        <motion.div
          className="absolute inset-0 bg-primary/5 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 6 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-[4vw] h-[4vw] border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </motion.div>
      </motion.div>

      {/* Scene Exit Cover */}
      <motion.div
        className="absolute inset-0 bg-primary z-50 origin-bottom"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: phase >= 7 ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
};
