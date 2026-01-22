
import React, { useState, useEffect } from 'react';
import { TabType, ProblemSet, Problem } from './types';
import Header from './components/Header';
import SetList from './components/SetList';
import CreateForm from './components/CreateForm';
import QuizRunner from './components/QuizRunner';
import { BookOpen, PlusCircle, Download, X, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'smart-quiz-sets';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [sets, setSets] = useState<ProblemSet[]>([]);
  const [activeSet, setActiveSet] = useState<ProblemSet | null>(null);
  const [editingSet, setEditingSet] = useState<ProblemSet | null>(null);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [setToDelete, setSetToDelete] = useState<ProblemSet | null>(null);
  const [importCode, setImportCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load sets", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  }, [sets]);

  const handleSaveSet = (savedSet: ProblemSet) => {
    if (editingSet) {
      setSets(prev => prev.map(s => s.id === savedSet.id ? savedSet : s));
    } else {
      setSets(prev => [savedSet, ...prev]);
    }
    setActiveTab('library');
    setEditingSet(null);
  };

  const handleImport = () => {
    try {
      if (!importCode.trim()) return;
      const decodedData = decodeURIComponent(escape(atob(importCode.trim())));
      const importedSet: ProblemSet = JSON.parse(decodedData);
      
      const newSet: ProblemSet = {
        ...importedSet,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        title: `${importedSet.title} (導入)`
      };

      setSets(prev => [newSet, ...prev]);
      setImportCode('');
      setShowImportModal(false);
    } catch (e) {
      alert('無効なセットコードです。');
    }
  };

  const handleFinishQuiz = (keptProblems: Problem[], originalSetTitle: string) => {
    if (keptProblems.length > 0) {
      const reviewSet: ProblemSet = {
        id: crypto.randomUUID(),
        title: `復習: ${originalSetTitle} (${new Date().toLocaleDateString()})`,
        createdAt: Date.now(),
        problems: keptProblems
      };
      setSets(prev => [reviewSet, ...prev]);
    }
    setActiveSet(null);
  };

  if (activeSet) {
    return (
      <QuizRunner 
        set={activeSet} 
        onClose={() => setActiveSet(null)} 
        onFinish={handleFinishQuiz} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      <Header activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        if (tab === 'library') setEditingSet(null);
      }} />
      
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
        {activeTab === 'library' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                <BookOpen className="w-8 h-8 text-indigo-600" />
                LIBRARY
              </h2>
              <button 
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                コードで導入
              </button>
            </div>

            <SetList 
              sets={sets} 
              onStartSet={(set) => setActiveSet(set)} 
              onEditSet={(set) => { setEditingSet(set); setActiveTab('create'); }}
              onRemoveSet={(id) => setSetToDelete(sets.find(s => s.id === id) || null)} 
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 tracking-tight">
              <PlusCircle className="w-8 h-8 text-indigo-600" />
              {editingSet ? 'EDIT QUIZ' : 'CREATE NEW'}
            </h2>
            <CreateForm 
              onSaveSet={handleSaveSet} 
              initialSet={editingSet} 
              onCancel={editingSet ? () => { setEditingSet(null); setActiveTab('library'); } : undefined}
            />
          </div>
        )}
      </main>

      {/* Custom Modals Container */}
      {setToDelete && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">削除しますか？</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed px-4">
                「<span className="font-bold text-slate-700">{setToDelete.title}</span>」を削除します。この操作は取り消せません。
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSets(prev => prev.filter(s => s.id !== setToDelete.id));
                    setSetToDelete(null);
                  }}
                  className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all active:scale-95"
                >
                  削除する
                </button>
                <button
                  onClick={() => setSetToDelete(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                IMPORT CODE
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="コードをペーストしてください..."
                className="w-full h-40 p-5 rounded-3xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-[11px] font-mono leading-relaxed"
              />
              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={!importCode.trim()}
                  className="flex-1 py-4.5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-indigo-100"
                >
                  導入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
