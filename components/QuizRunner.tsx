
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ProblemSet, Problem } from '../types';
import { X, CheckCircle, AlertCircle, BookOpenText, MessageSquare } from 'lucide-react';
import SwipeCard from './SwipeCard';

interface QuizRunnerProps {
  set: ProblemSet;
  onClose: () => void;
  onFinish: (keptProblems: Problem[], title: string) => void;
}

const QuizRunner: React.FC<QuizRunnerProps> = ({ set, onClose, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [keptProblems, setKeptProblems] = useState<Problem[]>([]);
  const [showSwipe, setShowSwipe] = useState(false);
  
  const [commentIdx, setCommentIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentProblem = set.problems[currentIdx];
  const isCorrect = React.useMemo(() => {
    if (!currentProblem) return false;
    const correct = [...currentProblem.correctIndices].sort();
    const selected = [...selectedIndices].sort();
    return JSON.stringify(correct) === JSON.stringify(selected);
  }, [currentProblem, selectedIndices]);

  const comments = currentProblem?.comments || [];

  useEffect(() => {
    let interval: number | undefined;
    const isMobile = 'ontouchstart' in window;
    
    if ((isHovering || isMobile) && comments.length > 1 && isSubmitted) {
      interval = window.setInterval(() => {
        setCommentIdx(prev => (prev + 1) % comments.length);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHovering, comments.length, isSubmitted]);

  const handleToggleOption = (idx: number) => {
    if (isSubmitted) return;
    if (currentProblem.isMultipleChoice) {
      setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    } else {
      setSelectedIndices([idx]);
    }
  };

  const moveToNext = useCallback(() => {
    if (currentIdx < set.problems.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedIndices([]);
      setIsSubmitted(false);
      setShowSwipe(false);
      setCommentIdx(0);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onFinish(keptProblems, set.title);
    }
  }, [currentIdx, set.problems.length, set.title, keptProblems, onFinish]);

  const handleSwipe = (keep: boolean) => {
    if (keep) setKeptProblems(prev => [...prev, currentProblem]);
    moveToNext();
  };

  if (!currentProblem) return null;

  const getChoiceLabel = (idx: number) => String.fromCharCode(97 + idx) + ".";

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col items-center overflow-hidden">
      {/* Header Container */}
      <div className="w-full flex justify-center bg-white/90 backdrop-blur-md border-b border-slate-100 shrink-0 z-50">
        <div className="w-full max-w-xl px-4 h-16 flex items-center justify-between">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
            <X className="w-7 h-7" />
          </button>
          <div className="text-xs font-black tracking-widest text-slate-800 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
            {currentIdx + 1} / {set.problems.length}
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full flex justify-center overflow-y-auto scroll-smooth bg-white"
      >
        <div className="w-full max-w-xl px-6 py-8 pb-48">
          <div className="flex items-center gap-3 mb-8">
            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border-2 ${
              currentProblem.category === 'compulsory' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-blue-600 border-blue-700 text-white'
            }`}>
              {currentProblem.category === 'compulsory' ? 'Compulsory' : 'Clinical'}
            </div>
            <div className="text-[10px] font-mono text-slate-400">ID: {currentProblem.id.slice(0, 8)}</div>
          </div>

          <h2 className="text-[20px] font-black text-slate-800 leading-[1.6] mb-10 tracking-tight">
            {currentProblem.question}
          </h2>

          <div className="space-y-4">
            {currentProblem.choices.map((choice, idx) => {
              const isSelected = selectedIndices.includes(idx);
              const isActuallyCorrect = currentProblem.correctIndices.includes(idx);
              
              let cardStyle = "border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:shadow-md";
              if (isSelected && !isSubmitted) {
                cardStyle = "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600 ring-offset-1";
              } else if (isSubmitted) {
                if (isActuallyCorrect) {
                  cardStyle = "border-green-500 bg-green-500 text-white font-bold shadow-lg shadow-green-100";
                } else if (isSelected && !isActuallyCorrect) {
                  cardStyle = "border-red-500 bg-red-50 text-red-600";
                } else {
                  cardStyle = "border-slate-100 text-slate-300 opacity-40 grayscale";
                }
              }

              return (
                <button
                  key={choice.id}
                  disabled={isSubmitted}
                  onClick={() => handleToggleOption(idx)}
                  className={`w-full p-5 rounded-[1.5rem] border-2 text-left text-[16px] transition-all flex items-start gap-4 active:scale-[0.98] ${cardStyle}`}
                >
                  <span className={`flex-shrink-0 mt-0.5 w-6 font-black text-center ${
                    isSubmitted && isActuallyCorrect ? 'text-white' : isSelected ? 'text-indigo-600' : 'text-slate-500'
                  }`}>
                    {getChoiceLabel(idx)}
                  </span>
                  <div className="flex-1 leading-relaxed font-medium">
                    {choice.text}
                  </div>
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <div 
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="mt-14 animate-in fade-in slide-in-from-bottom-8 duration-700"
            >
              <div className="p-8 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="flex items-center gap-2 text-indigo-300 font-black mb-4 text-xs tracking-[0.2em] uppercase">
                  <BookOpenText className="w-5 h-5" />
                  <span>EXPLANATION</span>
                </div>
                <p className="text-slate-300 leading-[1.8] whitespace-pre-wrap text-[16px] font-medium">
                  {currentProblem.explanation || "No explanation provided."}
                </p>

                {comments.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                        <MessageSquare className="w-4 h-4" />
                        COMMUNITY FEED
                      </div>
                      {comments.length > 1 && (
                        <div className="flex gap-2">
                          {comments.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === commentIdx ? 'bg-indigo-400 scale-150' : 'bg-white/10'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-h-[60px] flex items-center bg-white/5 p-5 rounded-2xl border border-white/5">
                      <div 
                        key={commentIdx}
                        className="w-full text-[14px] text-indigo-100 italic leading-relaxed animate-in fade-in zoom-in-95 duration-500"
                      >
                        「{comments[commentIdx]}」
                      </div>
                    </div>
                    
                    <div className="text-[9px] text-white/20 text-center mt-4 font-black uppercase tracking-widest">
                      {isHovering ? 'Cycling Active' : 'Hover / Tap to browse community notes'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Footer - Centered for PC */}
      <div className="w-full flex justify-center fixed bottom-0 left-0 right-0 z-[160] px-4 pointer-events-none">
        <div className="w-full max-w-xl bg-white/80 backdrop-blur-2xl border-t border-slate-100 p-6 pb-12 rounded-t-[2rem] shadow-2xl pointer-events-auto">
          <div className="w-full flex flex-col gap-4">
            {isSubmitted ? (
              <>
                <div className={`p-4 rounded-2xl flex items-center justify-center gap-3 font-black text-lg transition-colors border-2 ${
                  isCorrect ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-100' : 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-100'
                }`}>
                  {isCorrect ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span>{isCorrect ? 'PERFECT!' : 'MISS'}</span>
                </div>
                <button
                  onClick={isCorrect ? moveToNext : () => setShowSwipe(true)}
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-[18px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isCorrect ? 'CONTINUE' : 'FINISH TURN'}
                </button>
              </>
            ) : (
              <button
                onClick={() => selectedIndices.length > 0 && setIsSubmitted(true)}
                disabled={selectedIndices.length === 0}
                className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-[18px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all active:scale-[0.98]"
              >
                SUBMIT ANSWER
              </button>
            )}
          </div>
        </div>
      </div>

      {showSwipe && (
        <SwipeCard 
          onSwipe={handleSwipe} 
          questionText={currentProblem.question}
        />
      )}
    </div>
  );
};

export default QuizRunner;
