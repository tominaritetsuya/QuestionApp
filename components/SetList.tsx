
import React, { useState } from 'react';
import { ProblemSet } from '../types';
import { Play, Trash2, Calendar, FileText, BookOpen, Edit2, Share2, X, Copy, Check } from 'lucide-react';

interface SetListProps {
  sets: ProblemSet[];
  onStartSet: (set: ProblemSet) => void;
  onEditSet: (set: ProblemSet) => void;
  onRemoveSet: (id: string) => void;
}

const SetList: React.FC<SetListProps> = ({ sets, onStartSet, onEditSet, onRemoveSet }) => {
  const [sharingSet, setSharingSet] = useState<ProblemSet | null>(null);
  const [copied, setCopied] = useState(false);

  const generateCode = (set: ProblemSet) => {
    // UTF-8対応のBase64エンコード
    const jsonStr = JSON.stringify(set);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (sets.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
        <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">セットがありません</h3>
        <p className="text-slate-500 mb-6">「作成」タブから新しい問題セットを作ってみましょう。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sets.map((set) => (
        <div 
          key={set.id}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-indigo-600 transition-colors">
                {set.title}
              </h3>
              <div className="flex gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {set.problems.length}問
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(set.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setSharingSet(set)}
                className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                title="共有用コードを生成"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onEditSet(set)}
                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                title="編集"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onRemoveSet(set.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="削除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => onStartSet(set)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-100"
          >
            <Play className="w-4 h-4 fill-current" />
            演習を開始する
          </button>
        </div>
      ))}

      {/* Share Modal */}
      {sharingSet && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-green-600" />
                セットを共有
              </h3>
              <button onClick={() => setSharingSet(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">セット名</label>
                <p className="font-bold text-slate-800">{sharingSet.title}</p>
              </div>
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">共有コード</label>
                <div className="relative group/code">
                  <textarea
                    readOnly
                    value={generateCode(sharingSet)}
                    className="w-full h-32 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-[10px] font-mono break-all focus:outline-none resize-none text-slate-900"
                  />
                  <button
                    onClick={() => handleCopy(generateCode(sharingSet))}
                    className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    {copied ? (
                      <><Check className="w-3 h-3" /> コピー完了</>
                    ) : (
                      <><Copy className="w-3 h-3" /> コードをコピー</>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg leading-relaxed">
                このコードをコピーして、他の端末の「コードで導入」ボタンから貼り付けることで、同じ問題セットを使用できます。
              </p>
              <button
                onClick={() => setSharingSet(null)}
                className="w-full mt-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetList;
