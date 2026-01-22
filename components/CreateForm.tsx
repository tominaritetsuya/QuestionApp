
import React, { useState, useEffect, useRef } from 'react';
import { ProblemSet, Problem, Choice, ProblemCategory } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Save, Sparkles, BrainCircuit, X, Image as ImageIcon, FileText, Lightbulb, MessageSquare } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface CreateFormProps {
  onSaveSet: (set: ProblemSet) => void;
  initialSet?: ProblemSet | null;
  onCancel?: () => void;
}

type AIMode = 'create' | 'import';

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
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
  };

  const generateAIQuiz = async () => {
    if (!knowledge.trim() && images.length === 0) return alert('入力または画像をアップロードしてください');
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const promptBase = aiMode === 'create' 
        ? `以下の知識または画像に基づいて、新しく5択の医療系問題を ${problemCount} 問作成してください。
           難易度設定 (想定正答率): ${difficulty}%`
        : `添付された画像またはテキストに含まれる「既存の問題」を正確に抽出してデジタル化してください。`;

      const parts: any[] = [
        { text: `${promptBase}
【重要制約】
1. 選択肢は5つ。
2. 日本語で。
3. categoryは "compulsory" か "clinical"。
4. 詳細な解説を付けること。
5. JSON形式で出力。` }
      ];

      for (const imgBase64 of images) {
        const base64Data = imgBase64.split(',')[1];
        const mimeType = imgBase64.split(';')[0].split(':')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
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

      const dataArray = JSON.parse(response.text || '[]');
      const newProblems = dataArray.map((data: any) => ({
        id: crypto.randomUUID(),
        question: data.question,
        choices: data.choices.map((text: string) => ({ id: crypto.randomUUID(), text })),
        correctIndices: data.correctIndices,
        isMultipleChoice: data.correctIndices.length > 1,
        explanation: data.explanation,
        category: (aiCategoryOverride === 'auto' ? data.category : aiCategoryOverride) as ProblemCategory,
        comments: []
      }));

      setProblems(prev => [...prev.filter(p => p.question !== ''), ...newProblems]);
      setKnowledge('');
      setImages([]);
      alert(`AIが ${newProblems.length} 問の問題を${aiMode === 'create' ? '作成' : '取り込み'}しました！`);
    } catch (error) {
      console.error(error);
      alert('処理に失敗しました。APIキーまたは接続を確認してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const addProblem = () => {
    setProblems([...problems, {
      id: crypto.randomUUID(),
      question: '',
      choices: [{ id: '1', text: '' }, { id: '2', text: '' }],
      correctIndices: [0],
      isMultipleChoice: false,
      explanation: '',
      category: 'compulsory',
      comments: []
    }]);
  };

  const removeProblem = (index: number) => {
    if (problems.length > 1) {
      setProblems(problems.filter((_, i) => i !== index));
    }
  };

  const updateProblem = (index: number, updates: Partial<Problem>) => {
    const newProblems = [...problems];
    newProblems[index] = { ...newProblems[index], ...updates };
    setProblems(newProblems);
  };

  const toggleCorrect = (pIndex: number, cIndex: number) => {
    const p = problems[pIndex];
    const current = p.correctIndices || [];
    if (p.isMultipleChoice) {
      updateProblem(pIndex, { 
        correctIndices: current.includes(cIndex) ? current.filter(i => i !== cIndex) : [...current, cIndex] 
      });
    } else {
      updateProblem(pIndex, { correctIndices: [cIndex] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('タイトルを入力してください');
    
    const validProblems: Problem[] = problems.map(p => ({
      id: p.id || crypto.randomUUID(),
      question: p.question || '無題の問題',
      choices: p.choices?.map(c => ({ ...c, text: c.text || '無題の選択肢' })) || [],
      correctIndices: p.correctIndices || [0],
      isMultipleChoice: !!p.isMultipleChoice,
      explanation: p.explanation || '',
      category: p.category || 'compulsory',
      comments: (p.comments || []).filter(c => c.trim() !== '')
    }));

    onSaveSet({
      id: initialSet?.id || crypto.randomUUID(),
      title,
      createdAt: initialSet?.createdAt || Date.now(),
      problems: validProblems
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-40">
      {/* AI Assistance Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-5 sm:p-7 rounded-[2.5rem] shadow-2xl text-white overflow-hidden relative border border-white/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/30">
              <BrainCircuit className="w-6 h-6 text-indigo-300" />
            </div>
            <h3 className="font-black text-xl tracking-tight">AI MAGIC</h3>
          </div>
          
          {/* iOS Style Segmented Control */}
          <div className="bg-white/10 p-1 rounded-2xl flex w-full sm:w-64 h-11 relative shadow-inner">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-lg transition-transform duration-300 ease-out ${
                aiMode === 'create' ? 'translate-x-0' : 'translate-x-full'
              }`}
            />
            <button
              type="button"
              onClick={() => setAiMode('create')}
              className={`flex-1 z-10 text-[12px] font-black transition-colors duration-300 flex items-center justify-center gap-2 ${
                aiMode === 'create' ? 'text-indigo-900' : 'text-white/60'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              独自に作成
            </button>
            <button
              type="button"
              onClick={() => setAiMode('import')}
              className={`flex-1 z-10 text-[12px] font-black transition-colors duration-300 flex items-center justify-center gap-2 ${
                aiMode === 'import' ? 'text-indigo-900' : 'text-white/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              取り込み
            </button>
          </div>
        </div>
        
        <div className="space-y-5">
          <textarea
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            placeholder={aiMode === 'create' ? "情報を入力して新しい問題を作らせる..." : "画像やテキストから問題をデジタル化する..."}
            className="w-full px-5 py-4 rounded-3xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[110px] text-[15px] leading-relaxed transition-all"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
             <div>
              <label className="text-[11px] font-black opacity-50 mb-2 block uppercase tracking-widest">問題数</label>
              <select 
                value={problemCount}
                onChange={(e) => setProblemCount(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                {[1, 2, 3, 5, 10].map(n => <option key={n} value={n} className="text-slate-900">{n} 問</option>)}
              </select>
            </div>

            <div className={aiMode === 'import' ? 'opacity-30 grayscale pointer-events-none' : ''}>
              <label className="text-[11px] font-black opacity-50 mb-2 block uppercase tracking-widest flex justify-between">
                <span>難易度</span>
                <span>{difficulty}%</span>
              </label>
              <input type="range" min="0" max="100" step="5" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" />
            </div>

            <div>
              <label className="text-[11px] font-black opacity-50 mb-2 block uppercase tracking-widest">AI分類</label>
              <div className="flex bg-white/10 rounded-2xl p-1 h-[48px]">
                {(['auto', 'compulsory', 'clinical'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setAiCategoryOverride(m)} className={`flex-1 text-[11px] font-black rounded-xl transition-all ${aiCategoryOverride === m ? 'bg-white text-indigo-900 shadow-xl' : 'text-white/60'}`}>
                    {m === 'auto' ? '自動' : m === 'compulsory' ? '必修' : '臨床'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shrink-0">
                  <img src={img} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              {images.length < 3 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 transition-colors shrink-0">
                  <ImageIcon className="w-6 h-6 opacity-40" />
                </button>
              )}
            </div>
            
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} multiple />
            
            <button
              type="button"
              disabled={isGenerating}
              onClick={generateAIQuiz}
              className="flex-1 bg-white text-indigo-900 py-4.5 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50 shadow-2xl active:scale-[0.98]"
            >
              {isGenerating ? <div className="w-6 h-6 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-6 h-6 fill-indigo-900" />}
              {aiMode === 'create' ? 'AIで問題を生成' : '問題をデジタル化'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">セットタイトル</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 国家試験対策 必修編" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800" required />
      </div>

      <div className="space-y-6">
        {problems.map((p, pIdx) => (
          <div key={p.id} className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-md relative group animate-in slide-in-from-bottom-5 duration-500">
            <button type="button" onClick={() => removeProblem(pIdx)} className="absolute top-6 right-6 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>

            <div className="flex items-center gap-3 mb-6">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Q{pIdx + 1}</span>
              <div className="flex bg-slate-100 p-1 rounded-xl ml-auto">
                {(['compulsory', 'clinical'] as const).map(c => (
                  <button key={c} type="button" onClick={() => updateProblem(pIdx, { category: c })} className={`py-1.5 px-4 text-[11px] font-black rounded-lg transition-all ${p.category === c ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{c === 'compulsory' ? '必修' : '臨床'}</button>
                ))}
              </div>
            </div>

            <textarea value={p.question} onChange={(e) => updateProblem(pIdx, { question: e.target.value })} placeholder="問題文を入力..." className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-[16px] text-slate-800 font-medium mb-6 min-h-[100px]" required />

            <div className="space-y-3 mb-8">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">選択肢</label>
              {p.choices?.map((c, cIdx) => (
                <div key={c.id} className="flex gap-3">
                  <button type="button" onClick={() => toggleCorrect(pIdx, cIdx)} className={`mt-1 w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all ${p.correctIndices?.includes(cIdx) ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                  <textarea value={c.text} onChange={(e) => {
                    const next = [...(p.choices || [])];
                    next[cIdx].text = e.target.value;
                    updateProblem(pIdx, { choices: next });
                  }} className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" required />
                </div>
              ))}
              <button type="button" onClick={() => {
                const next = [...(p.choices || []), { id: crypto.randomUUID(), text: '' }];
                updateProblem(pIdx, { choices: next });
              }} className="w-full py-3 border-2 border-dotted border-slate-200 rounded-2xl text-slate-400 text-xs font-black hover:bg-slate-50">+ 選択肢を追加</button>
            </div>

            <div className="mb-8">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">詳細な解説</label>
              <textarea value={p.explanation} onChange={(e) => updateProblem(pIdx, { explanation: e.target.value })} placeholder="正解の根拠などを入力..." className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-[13px] text-slate-700 min-h-[80px]" />
            </div>

            <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100/50">
              <label className="block text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                共有コメント
              </label>
              <div className="space-y-2">
                {p.comments?.map((comment, cIdx) => (
                  <div key={cIdx} className="flex gap-2">
                    <input type="text" value={comment} onChange={(e) => {
                      const next = [...(p.comments || [])];
                      next[cIdx] = e.target.value;
                      updateProblem(pIdx, { comments: next });
                    }} className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-400" placeholder="コミュニティへのヒントなど..." />
                    <button type="button" onClick={() => updateProblem(pIdx, { comments: p.comments?.filter((_, i) => i !== cIdx) })} className="text-red-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => updateProblem(pIdx, { comments: [...(p.comments || []), ''] })} className="w-full py-2 bg-white border border-indigo-100 rounded-xl text-indigo-400 text-[10px] font-black hover:bg-indigo-50">+ コメントを追加</button>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addProblem} className="w-full py-5 border-4 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-black hover:border-indigo-300 hover:text-indigo-500 transition-all">+ 問題を追加</button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-5 pb-10 z-30">
        <div className="container mx-auto max-w-xl flex gap-4">
          {onCancel && <button type="button" onClick={onCancel} className="px-8 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black active:scale-95">戻る</button>}
          <button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
            <Save className="w-6 h-6" />
            保存して完了
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreateForm;
