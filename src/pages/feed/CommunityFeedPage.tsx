import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import { FeedPost, User, Language, Barangay, GovernmentPage, Region, Province, City } from '../../types';
import { getTranslation } from '../../lib/i18n';
import {
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Send,
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
  Search,
  RotateCcw,
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

// Memoized Government Page Card Component
interface GovernmentPageCardProps {
  page: GovernmentPage;
  isFollowing: boolean;
  followersText: string;
  followingBtnText: string;
  followBtnText: string;
  onFollow: (id: string) => void;
}

const GovernmentPageCard = React.memo<GovernmentPageCardProps>(({
  page,
  isFollowing,
  followersText,
  followingBtnText,
  followBtnText,
  onFollow,
}) => (
  <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
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
        {page.followersCount.toLocaleString()} {followersText}
      </span>

      <button
        onClick={() => onFollow(page.id)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          isFollowing
            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700 hover:bg-rose-900/60 hover:text-rose-200 hover:border-rose-700'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
        }`}
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-3.5 h-3.5" />
            <span>{followingBtnText}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>{followBtnText}</span>
          </>
        )}
      </button>
    </div>
  </div>
));

// Memoized Feed Post Item Component for smooth rendering on large feeds
interface FeedPostCardProps {
  post: FeedPost;
  currentUser: User | null;
  activeCommentPostId: string | null;
  commentInputValue: string;
  followingUserIds: string[];
  followingPageIds: string[];
  t: (key: any) => string;
  onLike: (postId: string) => void;
  onShare: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string) => void;
  onCommentInputChange: (postId: string, text: string) => void;
  onFollowUser: (userId: string) => void;
  onFollowPage: (pageId: string) => void;
}

const FeedPostCard = React.memo<FeedPostCardProps>(({
  post,
  currentUser,
  activeCommentPostId,
  commentInputValue,
  followingUserIds,
  followingPageIds,
  t,
  onLike,
  onShare,
  onToggleComments,
  onAddComment,
  onCommentInputChange,
  onFollowUser,
  onFollowPage,
}) => {
  const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
  const isCommentsOpen = activeCommentPostId === post.id;

  const isGovPost = post.isGovernmentPost || !!post.governmentPageId;
  const isUserFollowing = isGovPost
    ? post.governmentPageId ? followingPageIds.includes(post.governmentPageId) : false
    : followingUserIds.includes(post.authorId);

  const isSelf = currentUser && post.authorId === currentUser.id;

  return (
    <div
      id={`feed-${post.id}`}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:shadow-md"
    >
      {/* Post Author Bar */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 overflow-hidden">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{post.authorName}</h4>

              {isGovPost && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Landmark className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Official Govt
                </span>
              )}

              {!isGovPost && post.authorRole === 'BARANGAY_OFFICIAL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  Official
                </span>
              )}

              {!isGovPost && post.authorRole === 'SYSTEM_ADMIN' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Admin
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                onFollowPage(post.governmentPageId);
              } else {
                onFollowUser(post.authorId);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isUserFollowing
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-200 border border-slate-200 dark:border-slate-700'
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
      <div className="px-4 sm:px-5 py-2">
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>

        {/* Waste Tag Badge */}
        {post.wasteKg && post.wasteKg > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
            <Recycle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{post.likes.length}</span>
          </button>

          <button
            onClick={() => onToggleComments(post.id)}
            className="flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comments.length}</span>
          </button>

          <button
            onClick={() => onShare(post.id)}
            className="flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{post.sharesCount || 0}</span>
          </button>
        </div>

        <button
          onClick={() => onToggleComments(post.id)}
          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          {post.comments.length} {t('commentsCount')}
        </button>
      </div>

      {/* Comment Section Drawer */}
      {isCommentsOpen && (
        <div className="bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
          {post.comments.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {post.comments.map(c => (
                <div key={c.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">{c.authorName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={commentInputValue}
              onChange={e => onCommentInputChange(post.id, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onAddComment(post.id);
              }}
              placeholder={t('writeCommentPlaceholder')}
              className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={() => onAddComment(post.id)}
              disabled={!commentInputValue.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export function CommunityFeedPage({ currentUser, currentBarangay, lang, onNavigateToTab }: Props) {
  const t = useCallback((key: any) => getTranslation(lang, key), [lang]);
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

  const loadPosts = useCallback(async () => {
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

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleFollowUser = useCallback(async (targetUserId: string) => {
    if (!currentUser) {
      alert(lang === 'tl' ? 'Mangyaring mag-log in muna upang masundan ang user.' : 'Please sign in to follow users.');
      return;
    }

    try {
      const res = await api.followUser(currentUser.id, targetUserId);
      if (res?.user?.followingUserIds) {
        setFollowingUserIds(res.user.followingUserIds);
      } else {
        setFollowingUserIds(prev =>
          prev.includes(targetUserId) ? prev.filter(id => id !== targetUserId) : [...prev, targetUserId]
        );
      }
    } catch (err) {
      console.error('Failed to follow user:', err);
    }
  }, [currentUser, lang]);

  const handleFollowPage = useCallback(async (targetPageId: string) => {
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
        setFollowingPageIds(prev =>
          isCurrentlyFollowing ? prev.filter(id => id !== targetPageId) : [...prev, targetPageId]
        );
      }

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
  }, [currentUser, followingPageIds, lang]);

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

  const handleCreatePost = async (e: React.FormEvent) => {
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
        authorAvatar: currentUser.photoUrl || currentUser.avatarUrl,
        authorRole: currentUser.role,
        barangayId: currentBarangay?.id || currentUser.barangayId || 'brgy-kapitolyo',
        barangayName: currentBarangay?.name || currentUser.barangayName || 'Kapitolyo',
        content,
        photoUrl: photoUrl || undefined,
        wasteKg: wasteKg ? parseFloat(wasteKg) : undefined,
        wasteType: wasteType || undefined,
      });

      setPosts(prev => [newPost, ...prev]);
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
  };

  const handleLike = useCallback(async (postId: string) => {
    if (!currentUser) {
      alert(lang === 'tl' ? 'Mag-sign in upang mag-like.' : 'Please sign in to like.');
      return;
    }

    try {
      const updatedPost = await api.likeFeedPost(postId, currentUser.id);
      setPosts(prev => prev.map(p => (p.id === postId ? updatedPost : p)));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  }, [currentUser, lang]);

  const handleAddComment = useCallback(async (postId: string) => {
    const text = commentText[postId];
    if (!text || !text.trim() || !currentUser) return;

    try {
      const updatedPost = await api.addFeedComment(postId, {
        authorId: currentUser.id,
        authorName: currentUser.fullName,
        authorAvatar: currentUser.photoUrl || currentUser.avatarUrl,
        content: text.trim(),
      });
      setPosts(prev => prev.map(p => (p.id === postId ? updatedPost : p)));
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to comment on post:', err);
    }
  }, [commentText, currentUser]);

  const handleShare = useCallback(async (postId: string) => {
    try {
      const updatedPost = await api.shareFeedPost(postId);
      setPosts(prev => prev.map(p => (p.id === postId ? updatedPost : p)));

      // Copy link to clipboard
      const url = `${window.location.origin}/#feed-${postId}`;
      await navigator.clipboard.writeText(url).catch(() => {});

      setShareToast(postId);
      setTimeout(() => setShareToast(null), 3000);
    } catch (err) {
      console.error('Failed to share post:', err);
    }
  }, []);

  const handleToggleComments = useCallback((postId: string) => {
    setActiveCommentPostId(prev => (prev === postId ? null : postId));
  }, []);

  const handleCommentInputChange = useCallback((postId: string, text: string) => {
    setCommentText(prev => ({ ...prev, [postId]: text }));
  }, []);

  // Memoized posts list
  const memoizedPosts = useMemo(() => posts, [posts]);

  // Scope Level Summary Text
  const scopeSummaryText = useMemo(() => {
    if (scopeLevel === 'national') return t('philippineFeed');
    if (scopeLevel === 'region') return `${selectedRegionName || 'Region'} ${t('scopeFeed')}`;
    if (scopeLevel === 'province') return `${selectedProvinceName || 'Province'} ${t('scopeFeed')}`;
    if (scopeLevel === 'city') return `${selectedCityName || 'City'} ${t('scopeFeed')}`;
    if (scopeLevel === 'barangay') return `Brgy. ${selectedBarangayName || 'Barangay'} ${t('scopeFeed')}`;
    return t('philippineFeed');
  }, [scopeLevel, selectedRegionName, selectedProvinceName, selectedCityName, selectedBarangayName, t]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30 mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>{scopeSummaryText}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">{t('feedHeading')}</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              {t('feedSub')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAreaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-2xl text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer shrink-0"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{t('changeAreaScope')}</span>
            </button>

            <button
              onClick={() => setShowDiscoverDrawer(!showDiscoverDrawer)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 transition-all cursor-pointer shrink-0"
            >
              <Landmark className="w-4 h-4 text-teal-300" />
              <span>{t('discoverPagesHeading')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discover Government Pages Drawer */}
      {showDiscoverDrawer && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 text-emerald-400">
                <Landmark className="w-5 h-5 text-emerald-400" />
                <span>{t('discoverPagesHeading')}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {t('discoverPagesSub')}
              </p>
            </div>
            <button
              onClick={() => setShowDiscoverDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {governmentPages.map(page => (
              <GovernmentPageCard
                key={page.id}
                page={page}
                isFollowing={followingPageIds.includes(page.id)}
                followersText={t('followersLabel')}
                followingBtnText={t('followingBtn')}
                followBtnText={t('followBtn')}
                onFollow={handleFollowPage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Post Composer Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <form onSubmit={handleCreatePost}>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden">
              {(currentUser?.photoUrl || currentUser?.avatarUrl) ? (
                <img src={currentUser.photoUrl || currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
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
                    className="absolute top-2 right-2 w-7 h-7 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
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
                    className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
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
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
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
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video hover:border-emerald-500 transition-all text-left cursor-pointer"
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
          {memoizedPosts.length} {memoizedPosts.length === 1 ? 'post' : 'posts'}
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
      ) : memoizedPosts.length === 0 ? (
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Landmark className="w-4 h-4" />
              <span>{t('discoverPagesHeading')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {memoizedPosts.map(post => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              activeCommentPostId={activeCommentPostId}
              commentInputValue={commentText[post.id] || ''}
              followingUserIds={followingUserIds}
              followingPageIds={followingPageIds}
              t={t}
              onLike={handleLike}
              onShare={handleShare}
              onToggleComments={handleToggleComments}
              onAddComment={handleAddComment}
              onCommentInputChange={handleCommentInputChange}
              onFollowUser={handleFollowUser}
              onFollowPage={handleFollowPage}
            />
          ))}
        </div>
      )}

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
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Level Selector Pills */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'national', label: lang === 'tl' ? 'Pambansa (Lahat)' : 'National (All)' },
                  { id: 'region', label: lang === 'tl' ? 'Rehiyon' : 'Region' },
                  { id: 'province', label: lang === 'tl' ? 'Probinsya' : 'Province' },
                  { id: 'city', label: lang === 'tl' ? 'Lungsod / Bayan' : 'City / Municipality' },
                  { id: 'barangay', label: lang === 'tl' ? 'Barangay' : 'Barangay' },
                ].map(lvl => (
                  <button
                    key={lvl.id}
                    onClick={() => setScopeLevel(lvl.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      scopeLevel === lvl.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>

              {/* Scope specific drop downs */}
              {scopeLevel === 'region' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Region:</label>
                  <select
                    value={selectedRegionCode}
                    onChange={e => {
                      setSelectedRegionCode(e.target.value);
                      const reg = regionsList.find(r => r.code === e.target.value);
                      setSelectedRegionName(reg ? reg.name : '');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">-- All Regions --</option>
                    {regionsList.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scopeLevel === 'province' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Province:</label>
                  <select
                    value={selectedProvinceCode}
                    onChange={e => {
                      setSelectedProvinceCode(e.target.value);
                      const prv = provincesList.find(p => p.code === e.target.value);
                      setSelectedProvinceName(prv ? prv.name : '');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">-- All Provinces --</option>
                    {provincesList.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scopeLevel === 'city' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select City / Municipality:</label>
                  <select
                    value={selectedCityCode}
                    onChange={e => {
                      setSelectedCityCode(e.target.value);
                      const ct = citiesList.find(c => c.code === e.target.value);
                      setSelectedCityName(ct ? ct.name : '');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">-- All Cities --</option>
                    {citiesList.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scopeLevel === 'barangay' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Barangay:</label>
                  <select
                    value={selectedBarangayId}
                    onChange={e => {
                      setSelectedBarangayId(e.target.value);
                      const brg = barangaysList.find(b => b.id === e.target.value);
                      setSelectedBarangayName(brg ? brg.name : '');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">-- All Barangays --</option>
                    {barangaysList.map(b => (
                      <option key={b.id} value={b.id}>
                        Brgy. {b.name} ({b.cityName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setScopeLevel('national');
                    setSelectedRegionCode('');
                    setSelectedProvinceCode('');
                    setSelectedCityCode('');
                    setSelectedBarangayId('');
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'tl' ? 'I-reset sa Pambansa' : 'Reset to National'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {lang === 'tl' ? 'I-apply ang Lugar' : 'Apply Area Filter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
