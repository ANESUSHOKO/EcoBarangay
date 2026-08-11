import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FeedPost, User, Language, Barangay, GovernmentPage, Region, Province, City } from '../../types';
import { getTranslation } from '../../lib/i18n';
import {
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Send,
  Sparkles,
  Recycle,
  ShieldCheck,
  User as UserIcon,
  Camera,
  MapPin,
  Check,
  Globe,
  Building2,
  Loader2,
  X,
  UserPlus,
  UserCheck,
  Landmark,
  SlidersHorizontal,
  Search,
  Building,
  CheckCircle2,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  currentBarangay: Barangay | null;
  lang: Language;
  onNavigateToTab?: (tab: string) => void;
}

const PRESET_ECO_PHOTOS = [
  { name: 'Plastic Bottles', url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800' },
  { name: 'River Cleanup', url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=800' },
  { name: 'Cardboard Recycling', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800' },
  { name: 'Community Garden', url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=800' },
  { name: 'E-Waste Dropoff', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=800' },
];

export function CommunityFeedPage({ currentUser, currentBarangay, lang, onNavigateToTab }: Props) {
  const t = (key: any) => getTranslation(lang, key);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Feed Tab Filter
  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'government' | 'my-barangay' | 'recycling'>('all');

  // Location Scope State
  const [scopeLevel, setScopeLevel] = useState<'national' | 'region' | 'province' | 'city' | 'barangay'>('national');
  const [selectedRegionCode, setSelectedRegionCode] = useState<string>('');
  const [selectedRegionName, setSelectedRegionName] = useState<string>('');
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>('');
  const [selectedCityCode, setSelectedCityCode] = useState<string>('');
  const [selectedCityName, setSelectedCityName] = useState<string>('');
  const [selectedBarangayId, setSelectedBarangayId] = useState<string>('');
  const [selectedBarangayName, setSelectedBarangayName] = useState<string>('');
  const [showAreaModal, setShowAreaModal] = useState(false);

  // Area Selection Modal Data Lists
  const [regionsList, setRegionsList] = useState<Region[]>([]);
  const [provincesList, setProvincesList] = useState<Province[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [barangaysList, setBarangaysList] = useState<Barangay[]>([]);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');

  // Government Pages & Following System State
  const [governmentPages, setGovernmentPages] = useState<GovernmentPage[]>([]);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>(currentUser?.followingUserIds || []);
  const [followingPageIds, setFollowingPageIds] = useState<string[]>(currentUser?.followingPageIds || []);
  const [showDiscoverDrawer, setShowDiscoverDrawer] = useState(false);

  // Composer State
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [wasteType, setWasteType] = useState('');
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comment State
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});

  // Share Toast State
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Sync currentUser following lists
  useEffect(() => {
    if (currentUser) {
      setFollowingUserIds(currentUser.followingUserIds || []);
      setFollowingPageIds(currentUser.followingPageIds || []);
    }
  }, [currentUser]);

  // Load initial government pages and location options
  useEffect(() => {
    loadGovernmentPages();
    loadLocationData();
  }, []);

  // Reload feed posts whenever tab or area location filters change
  useEffect(() => {
    loadPosts();
  }, [
    activeTab,
    scopeLevel,
    selectedRegionCode,
    selectedProvinceCode,
    selectedCityCode,
    selectedBarangayId,
    currentBarangay,
    currentUser
  ]);

  async function loadGovernmentPages() {
    try {
      const data = await api.getGovernmentPages();
      setGovernmentPages(data);
    } catch (err) {
      console.error('Failed to load government pages:', err);
    }
  }

  async function loadLocationData() {
    try {
      const [regs, provs, cits, brgys] = await Promise.all([
        api.getRegions(),
        api.getProvinces(),
        api.getCities(),
        api.getBarangays(),
      ]);
      setRegionsList(regs);
      setProvincesList(provs);
      setCitiesList(cits);
      setBarangaysList(brgys);
    } catch (err) {
      console.error('Failed to load location datasets:', err);
    }
  }

  async function loadPosts() {
    try {
      setLoading(true);
      const filters: any = {};

      if (activeTab === 'following' && currentUser) {
        filters.followingUserId = currentUser.id;
      } else if (activeTab === 'government') {
        filters.isGovernmentOnly = true;
      } else if (activeTab === 'my-barangay' && currentBarangay) {
        filters.scopeLevel = 'barangay';
        filters.barangayId = currentBarangay.id;
      } else if (scopeLevel !== 'national') {
        filters.scopeLevel = scopeLevel;
        if (scopeLevel === 'region') filters.regionCode = selectedRegionCode;
        if (scopeLevel === 'province') filters.provinceCode = selectedProvinceCode;
        if (scopeLevel === 'city') filters.cityCode = selectedCityCode;
        if (scopeLevel === 'barangay') filters.barangayId = selectedBarangayId;
      }

      const data = await api.getFeedPosts(filters);

      if (activeTab === 'recycling') {
        setPosts(data.filter(p => p.wasteKg && p.wasteKg > 0));
      } else {
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to load feed posts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowUser(targetUserId: string) {
    if (!currentUser) {
      alert(lang === 'tl' ? 'Mangyaring mag-log in muna upang masundan ang user.' : 'Please sign in to follow users.');
      return;
    }

    try {
      const res = await api.followUser(currentUser.id, targetUserId);
      if (res?.user?.followingUserIds) {
        setFollowingUserIds(res.user.followingUserIds);
      } else {
        if (followingUserIds.includes(targetUserId)) {
          setFollowingUserIds(followingUserIds.filter(id => id !== targetUserId));
        } else {
          setFollowingUserIds([...followingUserIds, targetUserId]);
        }
      }
    } catch (err) {
      console.error('Failed to follow user:', err);
    }
  }

  async function handleFollowPage(targetPageId: string) {
    if (!currentUser) {
      alert(lang === 'tl' ? 'Mangyaring mag-log in muna upang masundan ang pahina ng gobyerno.' : 'Please sign in to follow government pages.');
      return;
    }

    try {
      const isCurrentlyFollowing = followingPageIds.includes(targetPageId);
      const res = await api.followPage(currentUser.id, targetPageId);
      
      if (res?.user?.followingPageIds) {
        setFollowingPageIds(res.user.followingPageIds);
      } else {
        if (isCurrentlyFollowing) {
          setFollowingPageIds(followingPageIds.filter(id => id !== targetPageId));
        } else {
          setFollowingPageIds([...followingPageIds, targetPageId]);
        }
      }

      // Local update for government page follower count
      setGovernmentPages(pages =>
        pages.map(p => {
          if (p.id === targetPageId) {
            return {
              ...p,
              followersCount: isCurrentlyFollowing
                ? Math.max(0, p.followersCount - 1)
                : p.followersCount + 1,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Failed to follow page:', err);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
        setShowPhotoPicker(false);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    if (!currentUser) {
      alert(lang === 'tl' ? 'Mangyaring mag-log in muna upang mag-post.' : 'Please sign in to post updates.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newPost = await api.createFeedPost({
        authorId: currentUser.id,
        authorName: currentUser.fullName,
        authorAvatar: currentUser.avatarUrl,
        authorRole: currentUser.role,
        barangayId: currentBarangay?.id || currentUser.barangayId || 'brgy-kapitolyo',
        barangayName: currentBarangay?.name || currentUser.barangayName || 'Kapitolyo',
        content,
        photoUrl: photoUrl || undefined,
        wasteKg: wasteKg ? parseFloat(wasteKg) : undefined,
        wasteType: wasteType || undefined,
      });

      setPosts([newPost, ...posts]);
      setContent('');
      setPhotoUrl('');
      setWasteKg('');
      setWasteType('');
      setShowPhotoPicker(false);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLike(postId: string) {
    if (!currentUser) {
      alert(lang === 'tl' ? 'Mag-sign in upang mag-like.' : 'Please sign in to like.');
      return;
    }

    try {
      const updatedPost = await api.likeFeedPost(postId, currentUser.id);
      setPosts(posts.map(p => (p.id === postId ? updatedPost : p)));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  }

  async function handleAddComment(postId: string) {
    const text = commentText[postId];
    if (!text || !text.trim() || !currentUser) return;

    try {
      const updatedPost = await api.addFeedComment(postId, {
        authorId: currentUser.id,
        authorName: currentUser.fullName,
        authorAvatar: currentUser.avatarUrl,
        content: text.trim(),
      });
      setPosts(posts.map(p => (p.id === postId ? updatedPost : p)));
      setCommentText({ ...commentText, [postId]: '' });
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  }

  async function handleShare(postId: string) {
    try {
      const updatedPost = await api.shareFeedPost(postId);
      setPosts(posts.map(p => (p.id === postId ? updatedPost : p)));

      const shareUrl = `${window.location.origin}/#feed-${postId}`;
      navigator.clipboard.writeText(shareUrl).catch(() => {});

      setShareToast(postId);
      setTimeout(() => setShareToast(null), 3000);
    } catch (err) {
      console.error('Failed to share post:', err);
    }
  }

  function handleResetAreaScope() {
    setScopeLevel('national');
    setSelectedRegionCode('');
    setSelectedRegionName('');
    setSelectedProvinceCode('');
    setSelectedProvinceName('');
    setSelectedCityCode('');
    setSelectedCityName('');
    setSelectedBarangayId('');
    setSelectedBarangayName('');
  }

  // Helper text for current area scope badge
  const getAreaScopeBadgeLabel = () => {
    if (scopeLevel === 'national') return t('allNationalFeed');
    if (scopeLevel === 'region') return `Region: ${selectedRegionName || selectedRegionCode}`;
    if (scopeLevel === 'province') return `Province: ${selectedProvinceName || selectedProvinceCode}`;
    if (scopeLevel === 'city') return `City: ${selectedCityName || selectedCityCode}`;
    if (scopeLevel === 'barangay') return `Brgy. ${selectedBarangayName || 'Kapitolyo'}`;
    return t('allNationalFeed');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-900/10 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {t('feedTitle')}
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                {lang === 'tl' ? 'Ating Kwento para sa Mas Malinis na Barangay' : 'Community Eco Social Feed'}
              </h1>
              <p className="text-emerald-100/90 text-sm max-w-xl leading-relaxed">
                {t('feedSubtitle')}
              </p>
            </div>

            <button
              onClick={() => setShowDiscoverDrawer(!showDiscoverDrawer)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold text-white transition-all shrink-0 self-start md:self-auto backdrop-blur-xs"
            >
              <Landmark className="w-4 h-4 text-emerald-300" />
              <span>{t('discoverPagesHeading')}</span>
            </button>
          </div>
        </div>

        {/* Location Scope Selector Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('filterAreaScope')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  {getAreaScopeBadgeLabel()}
                </span>
                {scopeLevel !== 'national' && (
                  <button
                    onClick={handleResetAreaScope}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 px-2 py-0.5 rounded-full transition-colors"
                    title="Reset to All Philippines"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAreaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
            <span>{t('chooseFeedArea')}</span>
          </button>
        </div>

        {/* Discover Government Pages & Leaders Card / Drawer */}
        {(showDiscoverDrawer || activeTab === 'government') && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white mb-8 border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Landmark className="w-4 h-4" />
                  <span>{t('discoverPagesHeading')}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {t('discoverPagesSub')}
                </p>
              </div>
              <button
                onClick={() => setShowDiscoverDrawer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {governmentPages.map(page => {
                const isFollowing = followingPageIds.includes(page.id);

                return (
                  <div
                    key={page.id}
                    className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 flex flex-col justify-between hover:border-emerald-500/50 transition-all"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-2">
                        <img
                          src={page.avatarUrl}
                          alt={page.name}
                          className="w-10 h-10 rounded-full object-cover border border-emerald-500/40 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate">{page.name}</h4>
                            {page.verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
                            {page.acronym} • {page.category}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                        {page.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {page.followersCount.toLocaleString()} {t('followersLabel')}
                      </span>

                      <button
                        onClick={() => handleFollowPage(page.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isFollowing
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700 hover:bg-rose-900/60 hover:text-rose-200 hover:border-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t('followingBtn')}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{t('followBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Post Composer Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 mb-8">
          <form onSubmit={handleCreatePost}>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-emerald-700" />
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={
                    currentUser
                      ? `${t('whatsOnYourMind')}`
                      : lang === 'tl'
                      ? 'Mag-sign in upang mag-post ng update...'
                      : 'Sign in to share your eco updates...'
                  }
                  rows={3}
                  className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />

                {/* Photo Preview if attached */}
                {photoUrl && (
                  <div className="relative mt-3 inline-block rounded-xl overflow-hidden border border-slate-200 shadow-xs max-h-48">
                    <img src={photoUrl} alt="Preview" className="max-h-48 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-2 right-2 w-7 h-7 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Optional Waste Tag inputs if open */}
                {(wasteKg || wasteType) && (
                  <div className="mt-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3 text-xs">
                    <Recycle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-900">
                      Tagging Waste: {wasteKg} kg {wasteType && `(${wasteType})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setWasteKg('');
                        setWasteType('');
                      }}
                      className="ml-auto text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Composer Action Toolbar */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      {t('attachPhoto')}
                    </button>

                    <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                      <Camera className="w-4 h-4 text-teal-600" />
                      <span>{lang === 'tl' ? 'Kumuha' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!content.trim() || isSubmitting || !currentUser}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {t('postButton')}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Quick Preset Photo Picker Drawer */}
          {showPhotoPicker && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === 'tl' ? 'Pumili sa mga Sample na Larawan:' : 'Or Select Sample Eco Photos:'}
                </span>
                <button
                  onClick={() => setShowPhotoPicker(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESET_ECO_PHOTOS.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoUrl(photo.url);
                      setShowPhotoPicker(false);
                    }}
                    className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video hover:border-emerald-500 transition-all text-left"
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[10px] p-1 font-semibold truncate">
                      {photo.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feed Filters Tabs Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t('allPhilippines')}</span>
            </button>

            <button
              onClick={() => setActiveTab('following')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'following'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{t('tabFollowing')}</span>
              {(followingUserIds.length > 0 || followingPageIds.length > 0) && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                  {followingUserIds.length + followingPageIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('government')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'government'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{t('tabGovPages')}</span>
            </button>

            <button
              onClick={() => setActiveTab('my-barangay')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'my-barangay'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{t('myBarangay')} ({currentBarangay?.name || 'Kapitolyo'})</span>
            </button>

            <button
              onClick={() => setActiveTab('recycling')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'recycling'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Recycle className="w-3.5 h-3.5" />
              <span>{lang === 'tl' ? 'Naresiklong Basura' : 'Recycling Wins'}</span>
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {/* Toast Alert on Share */}
        {shareToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            {t('shareSuccessToast')}
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">
              {lang === 'tl' ? 'Ipinapasok ang mga post...' : 'Loading community feed...'}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {activeTab === 'following'
                ? lang === 'tl'
                  ? 'Wala ka pang sinusundan'
                  : 'You are not following anyone yet'
                : lang === 'tl'
                ? 'Walang nahanap na post sa napiling lugar'
                : 'No posts found in selected location'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {activeTab === 'following'
                ? lang === 'tl'
                  ? 'I-click ang "Pahina ng Pamahalaan" sa taas upang masundan ang DENR, MMDA, at mga opisyal ng barangay.'
                  : 'Discover government agencies, LGUs, and eco leaders to personalize your feed with official updates.'
                : lang === 'tl'
                ? 'Maging una na magbahagi ng iyong resiklo o kwento para sa kalikasan!'
                : 'Be the first to share an eco-friendly update or recycling milestone in this scope!'}
            </p>
            {activeTab === 'following' && (
              <button
                onClick={() => setShowDiscoverDrawer(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                <Landmark className="w-4 h-4" />
                <span>{t('discoverPagesHeading')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => {
              const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
              const isCommentsOpen = activeCommentPostId === post.id;

              const isGovPost = post.isGovernmentPost || !!post.governmentPageId;
              const isUserFollowing = isGovPost
                ? post.governmentPageId ? followingPageIds.includes(post.governmentPageId) : false
                : followingUserIds.includes(post.authorId);

              const isSelf = currentUser && post.authorId === currentUser.id;

              return (
                <div
                  key={post.id}
                  id={`feed-${post.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Post Author Bar */}
                  <div className="p-5 pb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-emerald-700" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{post.authorName}</h4>

                          {isGovPost && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Landmark className="w-3 h-3 text-emerald-600" />
                              Official Govt
                            </span>
                          )}

                          {!isGovPost && post.authorRole === 'BARANGAY_OFFICIAL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-200">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              Official
                            </span>
                          )}

                          {!isGovPost && post.authorRole === 'SYSTEM_ADMIN' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                              Admin
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {post.cityName ? `${post.cityName}` : `Brgy. ${post.barangayName}`}
                          </span>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Follow Action Button on Post Header */}
                    {!isSelf && (
                      <button
                        onClick={() => {
                          if (isGovPost && post.governmentPageId) {
                            handleFollowPage(post.governmentPageId);
                          } else {
                            handleFollowUser(post.authorId);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          isUserFollowing
                            ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        }`}
                      >
                        {isUserFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t('followingBtn')}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{t('followBtn')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="px-5 py-2">
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Waste Tag Badge */}
                    {post.wasteKg && post.wasteKg > 0 && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        <Recycle className="w-4 h-4 text-emerald-600" />
                        <span>
                          {t('recyclingMilestone')}: {post.wasteKg} kg {post.wasteType && `(${post.wasteType})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post Photo */}
                  {post.photoUrl && (
                    <div className="mt-3 bg-slate-900 overflow-hidden">
                      <img
                        src={post.photoUrl}
                        alt="Post media"
                        className="w-full max-h-96 object-cover hover:opacity-95 transition-opacity cursor-pointer"
                        onClick={() => window.open(post.photoUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* Post Action Footer */}
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-4">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-colors ${
                          isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                        <span>{post.likes.length}</span>
                      </button>

                      {/* Comment Toggle Button */}
                      <button
                        onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                        className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments.length}</span>
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{post.sharesCount || 0}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      {post.comments.length} {t('commentsCount')}
                    </button>
                  </div>

                  {/* Comment Section Drawer */}
                  {isCommentsOpen && (
                    <div className="bg-slate-50/80 border-t border-slate-100 p-4 space-y-3">
                      {/* Comments List */}
                      {post.comments.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {post.comments.map(c => (
                            <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900">{c.authorName}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-700">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={e => setCommentText({ ...commentText, [post.id]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder={t('writeCommentPlaceholder')}
                          className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentText[post.id]?.trim()}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Area Scope Selector Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t('chooseFeedArea')}</h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'tl'
                      ? 'Pumili kung aling rehiyon, probinsya, lungsod, o barangay ang gusto mong makitang feed.'
                      : 'Select geographic scope level to filter posts from specific Philippine areas.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAreaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Level Selector Pills */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Select Geographic Scope Level:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScopeLevel('national');
                  }}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    scopeLevel === 'national'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>National (All PH)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeLevel('region')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    scopeLevel === 'region'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>By Region</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeLevel('province')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    scopeLevel === 'province'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>By Province</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeLevel('city')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    scopeLevel === 'city'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>By City / LGU</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeLevel('barangay')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    scopeLevel === 'barangay'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>By Barangay</span>
                </button>
              </div>

              {/* Dynamic Location Controls based on Scope */}
              {scopeLevel === 'region' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">Select Region:</label>
                  <select
                    value={selectedRegionCode}
                    onChange={e => {
                      const reg = regionsList.find(r => r.code === e.target.value);
                      setSelectedRegionCode(e.target.value);
                      setSelectedRegionName(reg?.name || e.target.value);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Philippine Region --</option>
                    {regionsList.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeLevel === 'province' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">Select Province:</label>
                  <select
                    value={selectedProvinceCode}
                    onChange={e => {
                      const prov = provincesList.find(p => p.code === e.target.value);
                      setSelectedProvinceCode(e.target.value);
                      setSelectedProvinceName(prov?.name || e.target.value);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Province --</option>
                    {provincesList.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeLevel === 'city' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">Select City / Municipality:</label>
                  <select
                    value={selectedCityCode}
                    onChange={e => {
                      const c = citiesList.find(city => city.code === e.target.value);
                      setSelectedCityCode(e.target.value);
                      setSelectedCityName(c?.name || e.target.value);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                  >
                    <option value="">-- Choose City / LGU --</option>
                    {citiesList.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeLevel === 'barangay' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">Select Specific Barangay:</label>
                  <select
                    value={selectedBarangayId}
                    onChange={e => {
                      const b = barangaysList.find(brgy => brgy.id === e.target.value);
                      setSelectedBarangayId(e.target.value);
                      setSelectedBarangayName(b?.name || e.target.value);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Barangay --</option>
                    {barangaysList.map(b => (
                      <option key={b.id} value={b.id}>
                        Brgy. {b.name} ({b.cityName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Search Option */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  Or Quick Search any City/Barangay:
                </span>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={areaSearchQuery}
                    onChange={e => setAreaSearchQuery(e.target.value)}
                    placeholder="Type 'Pasig', 'Cebu', 'Kapitolyo'..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5"
                  />
                </div>

                {areaSearchQuery.trim() && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {barangaysList
                      .filter(
                        b =>
                          b.name.toLowerCase().includes(areaSearchQuery.toLowerCase()) ||
                          b.cityName.toLowerCase().includes(areaSearchQuery.toLowerCase())
                      )
                      .slice(0, 6)
                      .map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setScopeLevel('barangay');
                            setSelectedBarangayId(b.id);
                            setSelectedBarangayName(b.name);
                            setSelectedCityCode(b.cityCode);
                            setSelectedCityName(b.cityName);
                            setAreaSearchQuery('');
                          }}
                          className="w-full text-left p-2 hover:bg-emerald-100/60 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between"
                        >
                          <span>Brgy. {b.name}, {b.cityName}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAreaScope}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Reset to All PH
              </button>
              <button
                type="button"
                onClick={() => setShowAreaModal(false)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                Apply Area Scope Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
