import React, { useState } from 'react';
import { Search, X, CheckCircle, AlertTriangle, HelpCircle, Award, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEarnPoints?: (points: number, activityName: string) => void;
}

interface ItemRule {
  name: string;
  category: 'Biodegradable' | 'Recyclable' | 'Residual' | 'Special / Hazardous';
  color: string;
  tagline: string;
  tagalogName: string;
  instructions: string;
  icon: string;
}

const ITEMS_GUIDE: ItemRule[] = [
  {
    name: 'Plastic PET Bottles & Beverage Containers',
    category: 'Recyclable',
    color: 'bg-blue-500 text-white',
    tagline: 'Muling Magagamit',
    tagalogName: 'Muling Magagamit',
    instructions: 'Rinse with clean water, crush flat to save space, and keep caps attached or separated in blue bins.',
    icon: '🥤',
  },
  {
    name: 'Food Scraps, Fruit Peels & Leftovers',
    category: 'Biodegradable',
    color: 'bg-emerald-600 text-white',
    tagline: 'Nabubulok',
    tagalogName: 'Nabubulok',
    instructions: 'Place in covered green bins or divert to home vermi-composting. Do not mix with plastic wrappers.',
    icon: '🍎',
  },
  {
    name: 'Cardboard Boxes & Clean Paper',
    category: 'Recyclable',
    color: 'bg-blue-500 text-white',
    tagline: 'Muling Magagamit',
    tagalogName: 'Muling Magagamit',
    instructions: 'Flatten cardboard boxes completely. Keep dry. Do not recycle paper contaminated with heavy oil.',
    icon: '📦',
  },
  {
    name: 'Single-Use Plastic Bags & Sachet Wrappers',
    category: 'Residual',
    color: 'bg-slate-600 text-white',
    tagline: 'Di-Nabubulok',
    tagalogName: 'Di-Nabubulok',
    instructions: 'Clean and stuff tightly into eco-bricks or place in black residual garbage bags.',
    icon: '🛍️',
  },
  {
    name: 'Used Household Batteries & Electronics',
    category: 'Special / Hazardous',
    color: 'bg-amber-600 text-white',
    tagline: 'Pambihirang Basura',
    tagalogName: 'Pambihirang Basura / Mapanganib',
    instructions: 'DO NOT throw in regular trash. Bring to designated E-Waste drop-off hubs or Barangay Hall collection boxes.',
    icon: '🔋',
  },
  {
    name: 'Glass Bottles & Food Jars',
    category: 'Recyclable',
    color: 'bg-blue-500 text-white',
    tagline: 'Muling Magagamit',
    tagalogName: 'Muling Magagamit',
    instructions: 'Rinse clean. Do not shatter. Intact glass bottles can be returned to junk shops or bottle banks for deposit refund.',
    icon: '🍾',
  },
  {
    name: 'Garden Leaf Litter & Grass Trimmings',
    category: 'Biodegradable',
    color: 'bg-emerald-600 text-white',
    tagline: 'Nabubulok',
    tagalogName: 'Nabubulok',
    instructions: 'Use as mulch for garden beds or place in green composting bags.',
    icon: '🍂',
  },
  {
    name: 'Fluorescent Bulbs & Broken Mirror Glass',
    category: 'Special / Hazardous',
    color: 'bg-amber-600 text-white',
    tagline: 'Mapanganib',
    tagalogName: 'Mapanganib / Busal',
    instructions: 'Wrap broken pieces safely in thick paper or cardboard. Mark "SHARP GLASS" for trash collector safety.',
    icon: '💡',
  },
];

export const SegregationGuideModal: React.FC<Props> = ({ isOpen, onClose, onEarnPoints }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'guide' | 'quiz'>('guide');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredItems = ITEMS_GUIDE.filter(
    item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.tagline.toLowerCase().includes(search.toLowerCase())
  );

  const handleQuizSubmit = (ansIndex: number) => {
    setSelectedAnswer(ansIndex);
    if (ansIndex === 1) {
      setQuizScore(50);
      if (onEarnPoints) onEarnPoints(50, 'RA 9003 Waste Segregation Quiz Passed');
    } else {
      setQuizScore(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-emerald-800 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-800 rounded-2xl">
              <Sparkles className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold">RA 9003 Waste Segregation Guide</h3>
              <p className="text-xs text-emerald-200">Ecological Solid Waste Management Act of the Philippines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-300 hover:text-white rounded-full hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🔍 Search Waste Items & Rules
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" /> Take Eco-Quiz (+50 Points)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'guide' ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type an item (e.g. plastic bottle, battery, food scrap)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</h4>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${item.color}`}>
                            {item.category} ({item.tagalogName})
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                      💡 {item.instructions}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Segregation Knowledge Challenge</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Answer correctly to prove your environmental awareness and earn 50 Eco Points!
                  </p>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  Q: Under Philippine RA 9003, which bin category should clean cardboard and crushed PET plastic bottles be disposed in?
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    'Green Bin (Biodegradable / Nabubulok)',
                    'Blue / Yellow Bin (Recyclable / Muling Magagamit)',
                    'Black Bin (Residual / Di-Nabubulok)',
                    'Red Box (Hazardous / Special Waste)',
                  ].map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuizSubmit(i)}
                      disabled={quizScore !== null}
                      className={`w-full p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        selectedAnswer === i
                          ? i === 1
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                            : 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {quizScore !== null && (
                  <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 mt-4 ${quizScore > 0 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300'}`}>
                    {quizScore > 0 ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                    {quizScore > 0
                      ? 'Correct! Clean recyclables belong in the Recyclable (Muling Magagamit) bin. +50 Eco Points earned!'
                      : 'Incorrect. Clean cardboard and PET plastic bottles are Recyclables (Muling Magagamit). Try reviewing the guide!'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
