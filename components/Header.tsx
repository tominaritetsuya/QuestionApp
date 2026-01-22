
import React from 'react';
import { TabType } from '../types';
import { BookOpen, PlusCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-bold text-indigo-600 tracking-tight">QuizMaker</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'library'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              セット一覧
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              作成
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
