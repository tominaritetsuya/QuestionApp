
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
      alert('セットを導入しました！');
    } catch (e) {
      alert('無効なセットコードです。正しくコピーされているか確認してください。');
    }
  };

  const confirmDelete = () => {
    if (setToDelete) {
      setSets(prev => prev.filter(s => s.id !== setToDelete.id));
      setSetToDelete(null);
    }
  };

  const handleStartSet = (set: ProblemSet) => {
    setActiveSet(set);
  };

  const handleEditSet = (set: ProblemSet) => {
    setEditingSet(set);
    setActiveTab('create');
  };

  const handleCancelEdit = () => {
    setEditingSet(null);
    setActiveTab('library');
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        if (tab === 'library') setEditingSet(null);
      }} />
      
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-6">
        {activeTab === 'library' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                演習セット一覧
              </h2>
              <button 
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                コードで導入
              </button>
            </div>

            <SetList 
              sets={sets} 
              onStartSet={handleStartSet} 
              onEditSet={handleEditSet}
              onRemoveSet={(id) => {
                const target = sets.find(s => s.id === id);
                if (target) setSetToDelete(target);
              }} 
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-indigo-600" />
              {editingSet ? '問題を編集' : '新しい問題を作成'}
            </h2>
            <CreateForm 
              onSaveSet={handleSaveSet} 
              initialSet={editingSet} 
              onCancel={editingSet ? handleCancelEdit : undefined}
            />
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {setToDelete && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">セットを削除しますか？</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                「<span className="font-bold text-slate-700">{setToDelete.title}</span>」を削除します。<br/>
                この操作は取り消せません。
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  削除する
                </button>
                <button
                  onClick={() => setSetToDelete(null)}
                  className="w-full py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
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
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                セットコードを入力
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                共有されたセットコードを貼り付けてください。自動的に問題セットがライブラリに追加されます。
              </p>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="コードをここにペースト..."
                className="w-full h-32 p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-mono break-all text-slate-900"
              />
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importCode.trim()}
                  className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all active:scale-[0.98] shadow-lg shadow-indigo-100"
                >
                  導入する
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
