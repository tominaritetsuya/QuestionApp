
import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Bookmark, XCircle, RotateCcw } from 'lucide-react';

interface SwipeCardProps {
  onSwipe: (keep: boolean) => void;
  questionText: string;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ onSwipe, questionText }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const keepOpacity = useTransform(x, [50, 150], [0, 1]);
  const discardOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe(true); // Keep
    } else if (info.offset.x < -100) {
      onSwipe(false); // Discard
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-md relative flex flex-col items-center">
        
        {/* Helper Instructions */}
        <div className="mb-8 text-center animate-bounce">
          <p className="text-white font-bold text-lg drop-shadow-md">復習リストに追加しますか？</p>
          <p className="text-white/80 text-sm">左：いらない / 右：とっておく</p>
        </div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x, rotate, opacity }}
          onDragEnd={handleDragEnd}
          className="w-full aspect-[3/4] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing relative border-4 border-white"
        >
          {/* Swipe Feedback Icons */}
          <motion.div 
            style={{ opacity: keepOpacity }}
            className="absolute top-10 right-10 z-10 bg-green-500 text-white px-6 py-2 rounded-full font-black text-2xl border-4 border-white rotate-12"
          >
            KEEP
          </motion.div>
          
          <motion.div 
            style={{ opacity: discardOpacity }}
            className="absolute top-10 left-10 z-10 bg-red-500 text-white px-6 py-2 rounded-full font-black text-2xl border-4 border-white -rotate-12"
          >
            DISCARD
          </motion.div>

          <div className="h-full flex flex-col">
            <div className="bg-indigo-600 p-6 flex justify-center">
              <RotateCcw className="text-white w-12 h-12" />
            </div>
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">この問題を復習する</p>
              <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                {questionText}
              </h3>
            </div>
            <div className="p-6 border-t border-slate-50 flex justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <XCircle className="w-5 h-5" />
                いらない
              </div>
              <div className="flex items-center gap-2 text-green-500 font-bold">
                とっておく
                <Bookmark className="w-5 h-5" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating manual buttons for accessibility */}
        <div className="mt-12 flex gap-8">
          <button 
            onClick={() => onSwipe(false)}
            className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-8 h-8" />
          </button>
          <button 
            onClick={() => onSwipe(true)}
            className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors"
          >
            <Bookmark className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwipeCard;
