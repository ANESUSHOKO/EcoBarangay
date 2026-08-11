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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-900 text-white">
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
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🔍 Search Waste Items & Rules
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type an item (e.g. plastic bottle, battery, food scrap)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${item.color}`}>
                            {item.category} ({item.tagalogName})
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                      💡 {item.instructions}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Award className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Segregation Knowledge Challenge</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Answer correctly to prove your environmental awareness and earn 50 Eco Points!
                  </p>
                </div>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="text-sm font-bold text-slate-800">
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
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                            : 'bg-red-50 border-red-500 text-red-900'
                          : 'bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {quizScore !== null && (
                  <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 mt-4 ${quizScore > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
                    {quizScore > 0 ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
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
