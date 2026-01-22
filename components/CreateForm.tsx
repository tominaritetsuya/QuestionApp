
import React, { useState, useEffect, useRef } from 'react';
import { ProblemSet, Problem, Choice, ProblemCategory } from '../types';
import { Plus, Trash2, CheckCircle2, Save, Sparkles, BrainCircuit, X, Image as ImageIcon, FileText, Lightbulb, MessageSquare } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface CreateFormProps {
  onSaveSet: (set: ProblemSet) => void;
  initialSet?: ProblemSet | null;
  onCancel?: () => void;
}

type AIMode = 'create' | 'import';

const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || "";
  } catch {
    return "";
  }
};

const CreateForm: React.FC<CreateFormProps> = ({ onSaveSet, initialSet, onCancel }) => {
  const [title, setTitle] = useState(initialSet?.title || '');
  const [problems, setProblems] = useState<Partial<Problem>[]>(
    initialSet?.problems || [{ id: crypto.randomUUID(), question: '', choices: [{ id: '1', text: '' }, { id: '2', text: '' }], correctIndices: [0], isMultipleChoice: false, explanation: '', category: 'compulsory', comments: [] }]
  );
  
  const [knowledge, setKnowledge] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [aiMode, setAiMode] = useState<AIMode>('create');
  const [aiCategoryOverride, setAiCategoryOverride] = useState<ProblemCategory | 'auto'>('auto');
  const [problemCount, setProblemCount] = useState(1);
  const [difficulty, setDifficulty] = useState(60); 
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSet) {
      setTitle(initialSet.title);
      setProblems(initialSet.problems);
    }
  }, [initialSet]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 3 - images.length).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result as string].slice(0, 3));
      reader.readAsDataURL(file);
    });
  };

  const generateAIQuiz = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return alert('APIキーが設定されていません。環境変数を確認してください。');
    if (!knowledge.trim() && images.length === 0) return alert('ヒントまたは画像を入力してください。');
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = aiMode === 'create' 
        ? `新しく ${problemCount} 問作成してください。難易度:${difficulty}%。医療系国家試験レベル。` 
        : `添付された情報から問題をデジタル化してください。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [{ text: `${prompt} 日本語、選択肢5つ、詳細な解説、JSON形式。` }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                explanation: { type: Type.STRING },
                category: { type: Type.STRING, enum: ["compulsory", "clinical"] }
              },
              required: ["question", "choices", "correctIndices", "explanation", "category"]
            }
          }
        }
      });

      const newItems = JSON.parse(response.text || '[]').map((d: any) => ({
        id: crypto.randomUUID(),
        question: d.question,
        choices: d.choices.map((t: string) => ({ id: crypto.randomUUID(), text: t })),
        correctIndices: d.correctIndices,
        isMultipleChoice: d.correctIndices.length > 1,
        explanation: d.explanation,
        category: (aiCategoryOverride === 'auto' ? d.category : aiCategoryOverride) as ProblemCategory,
        comments: []
      }));
      setProblems(prev => [...prev.filter(p => p.question !== ''), ...newItems]);
    } catch (e) {
      alert('AI生成に失敗しました。接続状況を確認してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateProblem = (index: number, updates: Partial<Problem>) => {
    const next = [...problems];
    next[index] = { ...next[index], ...updates };
    setProblems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('タイトルを入力してください');
    onSaveSet({
      id: initialSet?.id || crypto.randomUUID(),
      title,
      createdAt: initialSet?.createdAt || Date.now(),
      problems: problems as Problem[]
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 pb-48">
      {/* AI Panel */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-400 fill-indigo-400" />
            <h3 className="font-black text-2xl tracking-tight uppercase">AI Assistant</h3>
          </div>
          <div className="bg-white/10 p-1 rounded-2xl flex w-full sm:w-64 h-12 relative">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl transition-transform duration-300 ${aiMode === 'create' ? 'translate-x-0' : 'translate-x-full'}`} />
            <button type="button" onClick={() => setAiMode('create')} className={`flex-1 z-10 text-[11px] font-black ${aiMode === 'create' ? 'text-slate-900' : 'text-white/40'}`}>独自作成</button>
            <button type="button" onClick={() => setAiMode('import')} className={`flex-1 z-10 text-[11px] font-black ${aiMode === 'import' ? 'text-slate-900' : 'text-white/40'}`}>既存取込</button>
          </div>
        </div>
        
        <textarea
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          placeholder="ヒントや問題のソースを入力..."
          className="w-full px-6 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] mb-6"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="text-[10px] font-black opacity-40 uppercase mb-2 block tracking-widest">Count</label>
            <select value={problemCount} onChange={(e) => setProblemCount(Number(e.target.value))} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
              {[1, 3, 5, 10].map(n => <option key={n} value={n} className="text-slate-900">{n}問</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-center">
            <label className="text-[10px] font-black opacity-40 uppercase mb-2 block tracking-widest text-center">Difficulty: {difficulty}%</label>
            <input type="range" min="0" max="100" step="10" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" />
          </div>
          <div>
            <label className="text-[10px] font-black opacity-40 uppercase mb-2 block tracking-widest text-right">Category</label>
            <div className="flex bg-white/5 rounded-xl p-1 h-[48px]">
              {(['auto', 'compulsory', 'clinical'] as const).map(m => (
                <button key={m} type="button" onClick={() => setAiCategoryOverride(m)} className={`flex-1 text-[10px] font-black rounded-lg transition-all ${aiCategoryOverride === m ? 'bg-white text-slate-900' : 'text-white/30'}`}>
                  {m === 'auto' ? '自動' : m === 'compulsory' ? '必修' : '臨床'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} multiple />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/20 hover:bg-white/5 transition-colors">
            <ImageIcon className="w-6 h-6 opacity-40" />
            <span className="text-xs font-black opacity-40">{images.length}/3</span>
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={generateAIQuiz}
            className="flex-1 bg-white text-slate-900 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-indigo-500/10"
          >
            {isGenerating ? <div className="w-6 h-6 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-6 h-6 fill-slate-900" />}
            AI生成開始
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Set Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 直前対策セット" className="w-full px-6 py-5 rounded-3xl bg-slate-50 border-none font-black text-xl text-slate-800 focus:ring-4 focus:ring-indigo-500/10 transition-all" required />
      </div>

      <div className="space-y-10">
        {problems.map((p, pIdx) => (
          <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative animate-in slide-in-from-bottom-5 duration-500">
            <button type="button" onClick={() => setProblems(prev => prev.filter((_, i) => i !== pIdx))} className="absolute top-8 right-8 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-7 h-7" /></button>
            <div className="flex items-center gap-4 mb-8">
              <span className="bg-indigo-600 text-white text-xs font-black px-4 py-1.5 rounded-full tracking-tighter uppercase">Q {pIdx + 1}</span>
              <div className="flex bg-slate-50 p-1 rounded-2xl ml-auto border border-slate-100">
                {(['compulsory', 'clinical'] as const).map(c => (
                  <button key={c} type="button" onClick={() => updateProblem(pIdx, { category: c })} className={`py-2 px-6 text-[11px] font-black rounded-xl transition-all ${p.category === c ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-100' : 'text-slate-400'}`}>{c === 'compulsory' ? '必修' : '臨床'}</button>
                ))}
              </div>
            </div>

            <textarea value={p.question} onChange={(e) => updateProblem(pIdx, { question: e.target.value })} className="w-full px-6 py-5 rounded-[2rem] bg-slate-50 border-none text-[18px] font-bold text-slate-800 min-h-[120px] mb-8 focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="問題文を入力..." />

            <div className="space-y-4 mb-10">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 font-mono">Choices & Answer</label>
              {p.choices?.map((c, cIdx) => (
                <div key={c.id} className="flex gap-4 group">
                  <button type="button" onClick={() => {
                    const nextCorrect = p.isMultipleChoice 
                      ? (p.correctIndices?.includes(cIdx) ? p.correctIndices.filter(i => i !== cIdx) : [...(p.correctIndices || []), cIdx])
                      : [cIdx];
                    updateProblem(pIdx, { correctIndices: nextCorrect });
                  }} className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center transition-all ${p.correctIndices?.includes(cIdx) ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-slate-100 text-slate-300'}`}>
                    <CheckCircle2 className="w-7 h-7" />
                  </button>
                  <input value={c.text} onChange={(e) => {
                    const next = [...(p.choices || [])];
                    next[cIdx].text = e.target.value;
                    updateProblem(pIdx, { choices: next });
                  }} className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border-none font-medium text-slate-700" placeholder={`選択肢 ${cIdx + 1}`} />
                </div>
              ))}
            </div>

            <div className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100">
              <label className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> COMMUNITY NOTES
              </label>
              <div className="space-y-3">
                {p.comments?.map((com, cIdx) => (
                  <div key={cIdx} className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                    <input type="text" value={com} onChange={(e) => {
                      const next = [...(p.comments || [])];
                      next[cIdx] = e.target.value;
                      updateProblem(pIdx, { comments: next });
                    }} className="flex-1 px-5 py-3 rounded-xl bg-white border border-indigo-100 text-sm font-medium focus:ring-2 focus:ring-indigo-500" placeholder="共有するコメント..." />
                    <button type="button" onClick={() => updateProblem(pIdx, { comments: p.comments?.filter((_, i) => i !== cIdx) })} className="text-red-300 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => updateProblem(pIdx, { comments: [...(p.comments || []), ''] })} className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-400 text-[10px] font-black hover:bg-indigo-50 transition-colors tracking-widest uppercase">+ Add New Note</button>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => setProblems([...problems, { id: crypto.randomUUID(), question: '', choices: [{ id: '1', text: '' }, { id: '2', text: '' }], correctIndices: [0], isMultipleChoice: false, explanation: '', category: 'compulsory', comments: [] }])} className="w-full py-10 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-300 font-black hover:border-indigo-200 hover:text-indigo-400 transition-all active:scale-[0.99] uppercase tracking-widest">+ Add New Question</button>
      </div>

      {/* Footer - Centered for PC */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center p-6 pb-12 bg-white/60 backdrop-blur-xl border-t border-slate-100 pointer-events-none">
        <div className="w-full max-w-xl flex gap-4 pointer-events-auto">
          {onCancel && <button type="button" onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-lg active:scale-95 transition-all">戻る</button>}
          <button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">
            保存して完了
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreateForm;
