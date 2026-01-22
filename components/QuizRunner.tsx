
import React, { useState, useCallback, useEffect } from 'react';
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
  
  // コメント切り替え用のステート
  const [commentIdx, setCommentIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const currentProblem = set.problems[currentIdx];
  const isCorrect = React.useMemo(() => {
    if (!currentProblem) return false;
    const correct = currentProblem.correctIndices.sort();
    const selected = [...selectedIndices].sort();
    return JSON.stringify(correct) === JSON.stringify(selected);
  }, [currentProblem, selectedIndices]);

  const comments = currentProblem?.comments || [];

  // 3秒ごとのコメント切り替えロジック
  useEffect(() => {
    let interval: number | undefined;
    if ((isHovering || 'ontouchstart' in window) && comments.length > 1 && isSubmitted) {
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
      if (selectedIndices.includes(idx)) {
        setSelectedIndices(prev => prev.filter(i => i !== idx));
      } else {
        setSelectedIndices(prev => [...prev, idx]);
      }
    } else {
      setSelectedIndices([idx]);
    }
  };

  const handleSubmit = () => {
    if (selectedIndices.length === 0) return;
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (!isCorrect) {
      setShowSwipe(true);
    } else {
      moveToNext();
    }
  };

  const moveToNext = useCallback(() => {
    if (currentIdx < set.problems.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedIndices([]);
      setIsSubmitted(false);
      setShowSwipe(false);
      setCommentIdx(0);
    } else {
      onFinish(keptProblems, set.title);
    }
  }, [currentIdx, set.problems.length, set.title, keptProblems, onFinish]);

  const handleSwipe = (keep: boolean) => {
    if (keep) {
      setKeptProblems(prev => [...prev, currentProblem]);
    }
    moveToNext();
  };

  if (!currentProblem) return null;

  const getChoiceLabel = (idx: number) => String.fromCharCode(97 + idx) + ".";

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 h-14 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          {currentIdx + 1} / {set.problems.length}
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="container mx-auto max-w-xl px-4 py-6 pb-44">
          {/* Metadata Bar */}
          <div className="bg-[#f0f7ff] p-3 rounded-xl mb-6 flex justify-center items-center gap-4 text-[12px] text-slate-500 border border-[#e1effe] font-mono">
            <span>ID: {currentProblem.id.slice(0, 8).toUpperCase()}</span>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <span>区分:</span>
              <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold border rounded shadow-sm ${
                currentProblem.category === 'compulsory' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-blue-500 border-blue-600 text-white'
              }`}>
                {currentProblem.category === 'compulsory' ? '必' : '臨'}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="mb-10">
            <h2 className="text-[19px] font-bold text-slate-800 leading-[1.6] tracking-tight">
              {currentProblem.question}
            </h2>
          </div>

          {/* Choices */}
          <div className="space-y-3.5">
            {currentProblem.choices.map((choice, idx) => {
              const isSelected = selectedIndices.includes(idx);
              const isActuallyCorrect = currentProblem.correctIndices.includes(idx);
              
              let variantClasses = "border-slate-200 bg-white text-slate-700 hover:border-indigo-200";
              if (isSelected && !isSubmitted) {
                variantClasses = "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600";
              } else if (isSubmitted) {
                if (isActuallyCorrect) {
                  variantClasses = "border-green-500 bg-green-50 text-green-800 font-bold";
                } else if (isSelected && !isActuallyCorrect) {
                  variantClasses = "border-red-500 bg-red-50 text-red-700";
                } else {
                  variantClasses = "border-slate-100 text-slate-300 opacity-50";
                }
              }

              return (
                <button
                  key={choice.id}
                  disabled={isSubmitted}
                  onClick={() => handleToggleOption(idx)}
                  className={`w-full p-4 rounded-2xl border text-left text-[16px] transition-all flex items-start gap-4 shadow-sm active:scale-[0.98] ${variantClasses}`}
                >
                  {/* Choice Label - Explicitly colored to avoid being white */}
                  <span className={`flex-shrink-0 mt-0.5 w-6 text-slate-500 font-bold ${isSubmitted && isActuallyCorrect ? 'text-green-600' : ''}`}>
                    {getChoiceLabel(idx)}
                  </span>
                  <div className="flex-1 leading-normal">
                    {choice.text}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation Section */}
          {isSubmitted && (
            <div 
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => setIsHovering(!isHovering)} // スマホ用タップ切り替え
              className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="p-6 bg-[#fffdf5] rounded-[2rem] border border-[#fef3c7] relative overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 text-amber-700 font-black mb-3 text-sm uppercase tracking-wider">
                  <BookOpenText className="w-5 h-5" />
                  <span>解説</span>
                </div>
                <p className="text-slate-700 leading-[1.7] whitespace-pre-wrap text-[15px]">
                  {currentProblem.explanation || "解説はありません。"}
                </p>

                {/* Comment Cycle Area */}
                {comments.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-amber-200/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Shared Community
                      </div>
                      {comments.length > 1 && (
                        <div className="flex gap-1.5">
                          {comments.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === commentIdx ? 'bg-indigo-500 scale-125' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-h-[50px] flex items-center">
                      <div 
                        key={commentIdx}
                        className="w-full text-[14px] text-slate-600 italic bg-white/70 px-4 py-3 rounded-2xl border border-white/50 shadow-inner animate-in fade-in zoom-in-95 duration-500"
                      >
                        「{comments[commentIdx]}」
                      </div>
                    </div>
                    
                    <div className="text-[9px] text-slate-400 text-center mt-3 font-bold opacity-60">
                      {isHovering || 'ontouchstart' in window ? '自動切り替え中...' : 'ホバーで他のコメントを表示'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 pb-10 z-40">
        <div className="container mx-auto max-w-xl">
          {isSubmitted ? (
            <div className="flex flex-col gap-3">
              <div className={`p-4 rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-sm border ${
                isCorrect ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
              }`}>
                {isCorrect ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                <span>{isCorrect ? 'SUCCESS!' : 'FAILED'}</span>
              </div>
              <button
                onClick={handleNext}
                className="w-full bg-slate-900 text-white py-4.5 rounded-2xl font-bold text-[17px] shadow-xl hover:bg-black transition-all active:scale-[0.97]"
              >
                次の問題へ
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={selectedIndices.length === 0}
              className="w-full bg-indigo-600 text-white py-4.5 rounded-2xl font-bold text-[17px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-[0.97]"
            >
              回答を確定する
            </button>
          )}
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
