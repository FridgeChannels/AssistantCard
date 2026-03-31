import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const SuccessAnimation = () => {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[#F9F9FB] z-50 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
    >
      {/* 柔和明亮氛围背景 (Light mode auroras) */}
      <motion.div 
        className="absolute w-[300px] h-[300px] rounded-full blur-[60px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(21,128,61,0.15) 0%, transparent 70%)" }}
        animate={{ x: [-20, 20, 0], y: [10, -20, 0] }}
        transition={{ duration: 4.0, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
      />
      
      <motion.div 
        className="absolute w-[200px] h-[200px] rounded-full blur-[50px] pointer-events-none right-1/4 bottom-1/4"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)" }}
        animate={{ scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 5.0, ease: "easeInOut", repeat: Infinity }}
      />

      {/* 4 层水滴砸击造成的光晕玻璃涟漪 */}
      {[...Array(4)].map((_, i) => (
        <motion.div 
          key={i}
          className="absolute w-8 h-8 rounded-full border border-black/[0.03] bg-white/[0.15] backdrop-blur-md"
          initial={{ scale: 0, opacity: 0 }} 
          animate={{ 
            scale: [0, 10 + i * 6, 25 + i * 10], 
            opacity: [0, 0.6 - i*0.1, 0],
            borderWidth: ["3px", "1px", "0px"]
          }} 
          transition={{ 
            duration: 3.0 + i * 0.4, 
            ease: [0.2, 0.8, 0.2, 1], // Fluid drag easing
            delay: 0.65 + i * 0.1 // 完美卡在水滴第一次砸地的瞬间
          }} 
        />
      ))}
      
      {/* 融合核心 (Core Glass Drop - 明亮版的毛玻璃形变) */}
      <motion.div className="relative z-10 flex flex-col items-center"
        initial={{ y: -200 }}
        animate={{ 
          y: [-200, 0, -45, 0, -12, 0], // 重力连续弹跳曲线
        }}
        transition={{ 
          duration: 1.8, 
          delay: 0.2, 
          times: [0, 0.25, 0.45, 0.65, 0.8, 1], // 精密对应的物理碰撞时刻
          ease: "easeInOut" 
        }}
      >
        <motion.div 
          className="w-[72px] h-[72px] rounded-full bg-white/[0.6] backdrop-blur-[24px] border border-white flex items-center justify-center text-[#15803D] relative"
          animate={{ 
            // 形变物理：下落拉伸 -> 撞击压扁 -> 弹起拉伸 -> 再次压扁 -> 渐渐浑圆
            scaleX: [0.6, 0.7, 1.6, 0.8, 1.25, 0.95, 1],
            scaleY: [1.4, 1.3, 0.5, 1.2, 0.75, 1.05, 1],
            borderRadius: ["50% 50% 30% 30%", "50% 50% 40% 40%", "40% 40% 60% 60%", "45% 45% 55% 55%", "50%"],
            boxShadow: [
              "inset 0 0 10px rgba(255,255,255,1), 0 0px 0px rgba(21,128,61,0)",
              "inset 0 0 10px rgba(255,255,255,1), 0 0px 0px rgba(21,128,61,0)",
              "inset 0 0 30px rgba(255,255,255,1), 0 20px 40px rgba(21,128,61,0.35)", // 撞击瞬间内部变极白，向外震出深绿色影子
              "inset 0 0 15px rgba(255,255,255,0.8), 0 10px 20px rgba(21,128,61,0.15)",
              "inset 0 0 20px rgba(255,255,255,0.9), 0 15px 30px rgba(21,128,61,0.25)",
              "inset 0 0 12px rgba(255,255,255,1), 0 12px 30px rgba(0,0,0,0.06)"   // 最终悬浮极其通透的光泽
            ]
          }}  
          transition={{ 
            duration: 1.8, 
            delay: 0.2, 
            times: [0, 0.2, 0.25, 0.45, 0.65, 0.85, 1], // 严格对应 Y 轴的位移点
            ease: "easeInOut" 
          }}
          style={{ transformOrigin: "bottom center" }} // 水滴形变的着力点在底部
        >
          {/* 发光的深绿光迹 */}
          <motion.svg viewBox="0 0 24 24" className="w-[36px] h-[36px] drop-shadow-[0_2px_4px_rgba(21,128,61,0.4)]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
             initial={{ pathLength: 0, opacity: 0, scale: 0.5 }} 
             animate={{ pathLength: 1, opacity: 1, scale: 1 }} 
             transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }} // 水球第一次砸地后，弹起时开始发光描绘
          >
             <motion.polyline points="20 6 9 17 4 12" />
          </motion.svg>
        </motion.div>
        
        {/* 文字从透亮底色中析出 */}
        <motion.p className="mt-8 text-[12px] font-bold tracking-[0.3em] text-slate-700 absolute top-[80px]"
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }} 
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} 
          transition={{ delay: 1.4, duration: 1.2, ease: "easeOut" }}
        >
          ACTIVATED
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export function ActivationFlow({ onClose }) {
  const [step, setStep] = useState('input'); // 'input' | 'success'
  const [code, setCode] = useState(['', '', '', '']);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Ensure the first input gets focus smoothly after the mount animation
  useEffect(() => {
    if (step === 'input') {
      const timer = setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleChange = (index, value) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // If current is empty and hit backspace, focus previous
        inputRefs[index - 1].current?.focus();
        
        // Also clear the previous one
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      } else {
        // Just clear current one
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  // Handle paste for full 4-digit block
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/\D/g, '');
    if (pastedData) {
      const newCode = [...code];
      const items = pastedData.split('');
      for (let i = 0; i < 4; i++) {
        newCode[i] = items[i] || '';
      }
      setCode(newCode);
      
      const lastFilledIndex = Math.min(items.length, 3);
      inputRefs[lastFilledIndex].current?.focus();
    }
  };

  const isComplete = code.every(digit => digit !== '');

  const handleActivate = () => {
    // Transition to success screen
    setStep('success');

    // Smooth close after a snappy 3200ms sequence (trimming static display)
    setTimeout(() => {
      onClose();
    }, 3200);
  };

  // 监听 Enter 键，按下时如果所有的内容都完整即可触发 activate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && step === 'input' && isComplete) {
        handleActivate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isComplete]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#F3F5F7] overflow-hidden leading-normal">
      {/* Radial subtle gradient background */}
      <div className="absolute inset-0 bg-radial-[at_50%_40%] from-white to-transparent opacity-60 mix-blend-overlay pointer-events-none" />
      
      {/* Header */}
      <header className="px-5 py-4 flex items-center relative z-10 w-full">
        <button
          onClick={onClose}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-200/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 right-0 left-0 absolute flex items-center justify-center pointer-events-none">
          <span className="font-semibold text-xs tracking-wider text-sothebys-navy/90">
            ACTIVATE ACCOUNT
          </span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 pb-20"
          >
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-center">
              Activate Your Account
            </h1>
            <p className="text-gray-500 mt-3 text-[15px] font-medium text-center">
              Enter the 4-digit code provided to you.
            </p>

            {/* Inputs Container */}
            <div className="flex gap-4 mt-10 mb-10" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="numeric"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={digit}
                  maxLength={1}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  className="w-[52px] h-[64px] rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-center text-center text-[28px] font-bold text-sothebys-navy outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all"
                />
              ))}
            </div>

            {/* Actions */}
            <div className="w-full max-w-[320px] mx-auto mt-2 flex flex-col gap-5">
              <button
                onClick={handleActivate}
                disabled={!isComplete}
                className={`w-full h-14 rounded-2xl font-semibold text-lg transition-all duration-200 ${
                  isComplete 
                    ? 'bg-[#55585b] text-white hover:bg-[#474a4d] shadow-md' 
                    : 'bg-[#55585b]/50 text-white/80 cursor-not-allowed'
                }`}
              >
                Activate
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center relative z-10"
          >
            <SuccessAnimation />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
