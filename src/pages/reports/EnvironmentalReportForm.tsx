import React, { useState } from 'react';
import {
  EnvironmentalReport,
  Barangay,
  User,
  ReportCategory,
  ReportUrgency,
  Language,
  PhotoValidationResult,
} from '../../types';
import { api } from '../../lib/api';
import {
  AlertTriangle,
  Camera,
  MapPin,
  Tag,
  Loader2,
  CheckCircle2,
  Sparkles,
  Flame,
  Droplets,
  AlertOctagon,
  Trash2,
  Compass,
  X,
  Plus,
  FileText,
  UploadCloud,
  Layers,
  Info,
  Bot,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface EnvironmentalReportFormProps {
  currentBarangay: Barangay;
  currentUser: User | null;
  lang?: Language;
  onReportCreated: (newReport: EnvironmentalReport) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

// Preset popular categorical tags for environmental concerns
export const POPULAR_TAGS = [
  '#IllegalDumping',
  '#PlasticWaste',
  '#BlockedCanal',
  '#StagnantWater',
  '#HealthHazard',
  '#OpenBurning',
  '#E-Waste',
  '#CommercialViolation',
  '#MedicalWaste',
  '#NearSchool',
  '#WaterwayRisk',
  '#UrgentSanitation',
  '#ConstructionDebris',
  '#OdorNuisance',
  '#HazardousChemicals',
  '#PublicPark',
];

// Quick description templates for faster resident reporting
const DESCRIPTION_TEMPLATES = [
  'Large pile of unsegregated household garbage and plastic bags dumped on the roadside.',
  'Clogged open drainage canal filled with plastic bottles and silt causing stagnant water.',
  'Commercial establishment dumping unsegregated wet food waste and cartons on the sidewalk.',
  'Open burning (siga) of yard waste and plastics producing hazardous smoke in residential area.',
  'Overflowing public waste bin spilling trash onto the street and attracting pests.',
];

// Preset sample photos for fast reporting or when camera is unavailable
const SAMPLE_PHOTOS = [
  {
    label: 'Illegal Dump Pile',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Clogged Drainage',
    url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Overflowing Bin',
    url: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Open Burning',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Canal Plastic Litter',
    url: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&q=80&w=800',
  },
];

export const EnvironmentalReportForm: React.FC<EnvironmentalReportFormProps> = ({
  currentBarangay,
  currentUser,
  lang = 'en',
  onReportCreated,
  onCancel,
  isModal = false,
}) => {
  // Form State
  const [category, setCategory] = useState<ReportCategory>('Illegal Dumping');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [urgency, setUrgency] = useState<ReportUrgency>('High');
  const [estimatedVolume, setEstimatedVolume] = useState('Medium (Pickup load)');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '#IllegalDumping',
    '#PlasticWaste',
  ]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [photoValidation, setPhotoValidation] = useState<PhotoValidationResult | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number }>({
    lat: currentBarangay.lat,
    lng: currentBarangay.lng,
  });

  // Guest reporter details if not logged in
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Status and Validation
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState(false);

  // Category Options with Icons and Tagalog translations
  const CATEGORY_OPTIONS: {
    value: ReportCategory;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
    defaultTags: string[];
  }[] = [
    {
      value: 'Illegal Dumping',
      label: 'Illegal Dumping',
      sublabel: 'Tambak ng Basura (RA 9003 Sec. 48)',
      icon: <Trash2 className="w-4 h-4" />,
      color: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300',
      defaultTags: ['#IllegalDumping', '#PlasticWaste', '#UrgentSanitation'],
    },
    {
      value: 'Clogged Drainage',
      label: 'Clogged Drainage / Canal',
      sublabel: 'Bara sa Kanal at Esteros',
      icon: <Droplets className="w-4 h-4" />,
      color: 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300',
      defaultTags: ['#BlockedCanal', '#StagnantWater', '#WaterwayRisk'],
    },
    {
      value: 'Overflowing Bin',
      label: 'Overflowing Public Bin',
      sublabel: 'Pumaputok na Basurahan',
      icon: <Layers className="w-4 h-4" />,
      color: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300',
      defaultTags: ['#OverflowingBin', '#OdorNuisance'],
    },
    {
      value: 'Missed Collection',
      label: 'Missed Waste Collection',
      sublabel: 'Hindi Nakuhang Basura sa Iskedyul',
      icon: <AlertOctagon className="w-4 h-4" />,
      color: 'border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-300',
      defaultTags: ['#MissedCollection', '#OdorNuisance'],
    },
    {
      value: 'Open Burning (Siga)',
      label: 'Open Burning (Pagsisiga)',
      sublabel: 'Clean Air Act & RA 9003 Violation',
      icon: <Flame className="w-4 h-4" />,
      color: 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300',
      defaultTags: ['#OpenBurning', '#HealthHazard', '#AirPollution'],
    },
    {
      value: 'Hazardous Waste',
      label: 'Hazardous / Toxic Waste',
      sublabel: 'Baterya, Kemikal, o Medical Waste',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300',
      defaultTags: ['#Hazardous', '#MedicalWaste', '#HealthHazard'],
    },
    {
      value: 'Plastic Pollution',
      label: 'Plastic Waste Hotspot',
      sublabel: 'Single-Use Plastics Accumulation',
      icon: <Tag className="w-4 h-4" />,
      color: 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300',
      defaultTags: ['#PlasticPollution', '#PlasticWaste'],
    },
    {
      value: 'Waterway Contamination',
      label: 'River / Creek Contamination',
      sublabel: 'Basura sa Ilog o Katubigan',
      icon: <Droplets className="w-4 h-4" />,
      color: 'border-cyan-500 text-cyan-700 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-300',
      defaultTags: ['#WaterwayRisk', '#BlockedCanal'],
    },
    {
      value: 'Unsegregated Waste',
      label: 'Unsegregated Commercial Waste',
      sublabel: 'Hindi Hiniwalay na Basurang Pang-negosyo',
      icon: <FileText className="w-4 h-4" />,
      color: 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-300',
      defaultTags: ['#CommercialViolation', '#UnsegregatedWaste'],
    },
  ];

  // Handle category switch with auto-suggested tags
  const handleCategorySelect = (selectedCat: ReportCategory) => {
    setCategory(selectedCat);
    const catConfig = CATEGORY_OPTIONS.find(c => c.value === selectedCat);
    if (catConfig) {
      // Merge default tags without duplicates
      setSelectedTags(prev => {
        const merged = Array.from(new Set([...prev, ...catConfig.defaultTags]));
        return merged;
      });
    }
  };

  // Toggle Tag Selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Add Custom Tag
  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customTagInput.trim()) return;

    let clean = customTagInput.trim();
    if (!clean.startsWith('#')) {
      clean = `#${clean}`;
    }
    // Remove invalid spaces and uppercase first letter
    clean = clean.replace(/\s+/g, '');

    if (!selectedTags.includes(clean)) {
      setSelectedTags(prev => [...prev, clean]);
    }
    setCustomTagInput('');
  };

  // Apply template description
  const handleApplyTemplate = (tpl: string) => {
    if (!description.trim()) {
      setDescription(tpl);
    } else {
      setDescription(prev => `${prev}\n${tpl}`);
    }
  };

  // Auto-detect current GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setLocationCoords({ lat: latitude, lng: longitude });
        if (!address) {
          setAddress(`GPS Coords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Brgy. ${currentBarangay.name})`);
        }
      },
      err => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        // Fallback to barangay center coordinates with slight offset
        const fallbackLat = currentBarangay.lat + (Math.random() - 0.5) * 0.003;
        const fallbackLng = currentBarangay.lng + (Math.random() - 0.5) * 0.003;
        setLocationCoords({ lat: fallbackLat, lng: fallbackLng });
        if (!address) {
          setAddress(`Within Brgy. ${currentBarangay.name}, ${currentBarangay.cityName}`);
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // AI Photo Verification Engine (Gemini Vision)
  const runPhotoVerification = async (dataUrl: string) => {
    setIsValidatingPhoto(true);
    setPhotoValidation(null);
    setErrorMsg('');

    try {
      const result = await api.validateReportPhoto(dataUrl);
      setPhotoValidation(result);

      if (!result.isValid) {
        setErrorMsg(`AI Photo Rejection: ${result.reason}`);
      } else {
        // Auto-suggest category if detected and user hasn't modified
        if (result.detectedCategory === 'CLOGGED_DRAINAGE') setCategory('Clogged Drainage');
        else if (result.detectedCategory === 'OPEN_BURNING') setCategory('Open Burning (Siga)');
        else if (result.detectedCategory === 'HAZARDOUS_WASTE') setCategory('Hazardous Waste');
        else if (result.detectedCategory === 'ILLEGAL_DUMPING') setCategory('Illegal Dumping');
        else if (result.detectedCategory === 'RECYCLING') setCategory('Plastic Pollution');

        if (result.detectedSeverity === 'CRITICAL' || result.detectedSeverity === 'HIGH') {
          setUrgency('High');
        }

        if (result.suggestedTitle && (!description || description.length < 5)) {
          setDescription(result.suggestedTitle);
        }
      }
    } catch (err: any) {
      console.warn('AI validation error:', err);
    } finally {
      setIsValidatingPhoto(false);
    }
  };

  // Handle Photo File Upload (TC_REPORT_04: Validate file type and reject GIFs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');

    // Reject GIF format explicitly (TC_REPORT_04)
    if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
      setErrorMsg('GIF format is not supported. Please upload a standard photo in JPG, PNG, or WEBP format.');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = /\.(jpe?g|png|webp)$/i;

    if (!allowedTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setErrorMsg('Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are supported.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller image.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setPhotoPreview(result);
      setPhotoUrl(result);
      // Run AI inspection
      runPhotoVerification(result);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Form Submission (TC_REPORT_02: Validate required fields and only attach photo if explicitly uploaded)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim() || description.trim().length < 8) {
      setErrorMsg('Please provide a detailed description (minimum 8 characters).');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Please enter the location address or street where the issue is located.');
      return;
    }

    // AI Photo Inspection Enforcement: block submission if photo was rejected by AI
    if ((photoUrl || photoPreview) && photoValidation && !photoValidation.isValid) {
      setErrorMsg(
        `Submission Blocked by AI Verification: ${photoValidation.reason}. Please remove this picture and provide a photo of the environmental or waste problem.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const reporterId = currentUser ? currentUser.id : `guest-${Date.now()}`;
      const reporterName = isAnonymous
        ? 'Anonymous Resident'
        : currentUser
        ? currentUser.fullName
        : guestName.trim() || 'Concerned Community Resident';
      const reporterContact = currentUser?.phone || guestContact.trim() || undefined;

      // TC_REPORT_02: Do NOT auto-assign or fallback to an Unsplash image.
      // Photo should only exist if the user explicitly provided one.
      const finalPhoto = (photoUrl && photoUrl.trim()) || (photoPreview && photoPreview.trim()) || undefined;

      const payload = {
        category,
        description: description.trim(),
        locationAddress: address.trim(),
        landmark: landmark.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : ['#EnvironmentalConcern'],
        urgency,
        estimatedVolume,
        lat: locationCoords.lat,
        lng: locationCoords.lng,
        barangayId: currentBarangay.id,
        barangayName: currentBarangay.name,
        cityName: currentBarangay.cityName,
        reporterId,
        reporterName,
        reporterContact,
        photoUrl: finalPhoto,
        upvotesCount: 1,
        upvotedUserIds: [reporterId],
      };

      const created = await api.createReport(payload);

      setSuccessBanner(true);
      onReportCreated(created);

      // Reset form
      setTimeout(() => {
        setDescription('');
        setAddress('');
        setLandmark('');
        setPhotoUrl('');
        setPhotoPreview('');
        setSelectedTags(['#IllegalDumping', '#PlasticWaste']);
        setSuccessBanner(false);
      }, 2500);
    } catch (err: any) {
      console.error('Error creating report:', err);
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-all ${
        isModal ? 'p-6' : 'p-6 sm:p-8'
      }`}
    >
      {/* Form Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Civic Environmental Incident Form</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Document Environmental Concern
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Report illegal dumping, blocked waterways, or waste violations in{' '}
            <strong className="text-slate-900 dark:text-white">
              Brgy. {currentBarangay.name}, {currentBarangay.cityName}
            </strong>
            . Submissions are routed to LGU sanitation officers under Republic Act 9003.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="my-5 p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
              Report Successfully Logged & Submitted!
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Thank you for keeping Brgy. {currentBarangay.name} clean. +30 Eco Points
              credited. Your report has been assigned to the barangay environmental task force.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="my-4 p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-2.5 text-xs text-red-800 dark:text-red-300">
          <AlertOctagon className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* SECTION 1: Concern Category */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>1. Violation / Concern Category</span>
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-semibold text-slate-500">
              Select primary classification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {CATEGORY_OPTIONS.map(cat => {
              const isSelected = category === cat.value;
              return (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? `${cat.color} border-2 shadow-xs ring-2 ring-emerald-500/20`
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isSelected
                        ? 'bg-white/80 dark:bg-slate-900/80 shadow-xs'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate">{cat.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {cat.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Categorical Tags */}
        <div className="space-y-3 p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>2. Categorical Tags</span>
                <span className="text-emerald-600 font-bold text-xs">
                  ({selectedTags.length} selected)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Select tags or type custom keywords to classify the hazard and aid quick LGU triage.
              </p>
            </div>

            {/* Custom Tag Adder */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Add custom #tag..."
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36 sm:w-44"
              />
              <button
                type="button"
                onClick={() => handleAddCustomTag()}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                title="Add tag"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Active Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">
                Active Tags:
              </span>
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-2xs group"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="hover:bg-emerald-700 rounded p-0.5 text-emerald-100 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Preset Suggested Tag Pills */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
              Popular Categorical Suggestions (Click to toggle):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map(tag => {
                const isActive = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    <span>{tag}</span>
                    {isActive ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Plus className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 3: Text Description & Context */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>3. Detailed Text Description</span>
              <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-[11px] font-mono font-bold ${
                description.length < 8
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {description.length} / 500 chars (min 8)
            </span>
          </div>

          <textarea
            rows={4}
            required
            placeholder="Describe what you observed in detail (e.g., specific waste materials like plastic crates, food waste, chemical containers, approximate size of dump, when it started accumulating, and any visible risks to waterways or neighbors)..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all leading-relaxed"
          />

          {/* Quick Template Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quick Description Templates (Click to insert):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DESCRIPTION_TEMPLATES.map((tpl, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200/60 dark:border-slate-700 rounded-lg text-[11px] text-left transition-colors truncate max-w-xs sm:max-w-md"
                >
                  "{tpl.slice(0, 45)}..."
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: Urgency & Estimated Volume */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Urgency Level */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Urgency Level</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Low', 'Medium', 'High', 'Critical'] as ReportUrgency[]).map(lvl => {
                const isSelected = urgency === lvl;
                let colorClasses = 'bg-slate-100 text-slate-700';
                if (lvl === 'Critical') colorClasses = isSelected ? 'bg-red-600 text-white font-black ring-2 ring-red-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
                else if (lvl === 'High') colorClasses = isSelected ? 'bg-orange-600 text-white font-black ring-2 ring-orange-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300';
                else if (lvl === 'Medium') colorClasses = isSelected ? 'bg-amber-600 text-white font-black ring-2 ring-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
                else colorClasses = isSelected ? 'bg-slate-700 text-white font-black' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

                return (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setUrgency(lvl)}
                    className={`py-2 px-1.5 text-xs font-bold rounded-xl text-center transition-all ${colorClasses}`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {urgency === 'Critical' && 'Immediate public health hazard or active waterway blockage.'}
              {urgency === 'High' && 'Significant waste heap blocking public path or strong foul odor.'}
              {urgency === 'Medium' && 'Moderate accumulation needing routine LGU dispatch.'}
              {urgency === 'Low' && 'Minor litter or non-critical maintenance notice.'}
            </p>
          </div>

          {/* Estimated Waste Volume */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Estimated Waste Volume</span>
            </label>
            <select
              value={estimatedVolume}
              onChange={e => setEstimatedVolume(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Small (1-2 bags)">Small (1-2 bags / sack)</option>
              <option value="Medium (Pickup load)">Medium (Pushcart / Pickup truck load)</option>
              <option value="Large (Truckload)">Large (Dump truck load / multi-cart)</option>
              <option value="Severe (Massive dump site)">Severe (Massive dump site / creek blockage)</option>
            </select>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Helps dispatch the right equipment (hauler, backhoe, or manual crew).
            </p>
          </div>
        </div>

        {/* SECTION 5: Location & Landmark */}
        <div className="space-y-3 p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>4. Exact Location & Landmark</span>
              <span className="text-red-500">*</span>
            </label>

            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isLocating}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{isLocating ? 'Detecting GPS...' : 'Detect Current GPS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Street / Intersection Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. West Capitol Drive cor. Stella Maris St."
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Landmark / Visual Reference Point
              </label>
              <input
                type="text"
                placeholder="e.g. Behind vacant bakery lot / near basketball court gate"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Target Barangay: <strong>Brgy. {currentBarangay.name}, {currentBarangay.cityName}</strong> (Coordinates: {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)})
            </span>
          </div>
        </div>

        {/* SECTION 6: Photo Documentation Evidence with AI Verification */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>5. Photo Evidence & Visual Documentation</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Gemini Vision AI Verified
            </span>
          </div>

          {/* Photo Preview if selected */}
          {photoPreview || photoUrl ? (
            <div className="space-y-2.5">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-video max-h-56 w-full">
                <img
                  src={photoPreview || photoUrl}
                  alt="Environmental concern preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {photoValidation?.isValid ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : photoValidation?.isValid === false ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    Photo Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview('');
                      setPhotoUrl('');
                      setPhotoValidation(null);
                    }}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {/* AI Verification Status Card */}
              {isValidatingPhoto ? (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      Gemini AI is inspecting photo for environmental validity...
                    </span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Analyzing subject matter to ensure valid waste/cleanliness evidence.
                    </p>
                  </div>
                </div>
              ) : photoValidation?.isValid ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 dark:text-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>AI Verification Passed: Valid Environmental Evidence</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded">
                      {Math.round(photoValidation.confidence * 100)}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    {photoValidation.reason}
                  </p>
                  {photoValidation.labels && photoValidation.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {photoValidation.labels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-1.5 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-800 rounded-md"
                        >
                          #{lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : photoValidation?.isValid === false ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 dark:text-rose-200">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>AI Rejection: Non-Environmental Photo Detected</span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                    {photoValidation.reason}
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 italic">
                    Note: To maintain high data integrity, only photos showing waste, illegal dumping, clogged canals, or public environmental hazards can be submitted.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview('');
                      setPhotoUrl('');
                      setPhotoValidation(null);
                    }}
                    className="mt-1 text-xs font-bold text-rose-700 hover:text-rose-800 underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove photo and choose a valid picture
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Upload Box */}
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Click to snap or upload photo evidence
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports JPG, PNG, WEBP (Max 5MB) • Inspected by AI
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Preset Sample Photo Selector */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <span>Or select a realistic scene preset:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SAMPLE_PHOTOS.map((sample, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setPhotoUrl(sample.url);
                        setPhotoPreview(sample.url);
                        runPhotoVerification(sample.url);
                      }}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-left aspect-video hover:ring-2 hover:ring-emerald-500 transition-all"
                    >
                      <img
                        src={sample.url}
                        alt={sample.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                        <span className="text-[10px] font-bold text-white leading-tight">
                          {sample.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: Reporter Information (Guest or Logged In) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              6. Reporter Identification
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonCheck"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="anonCheck" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                Submit Anonymously
              </label>
            </div>
          </div>

          {currentUser ? (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {isAnonymous ? 'Submitting as Anonymous Resident' : currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Logged in account ({currentUser.email})
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-black px-2 py-0.5 bg-emerald-600 text-white rounded-lg">
                +30 Eco Points Reward
              </span>
            </div>
          ) : (
            !isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Your Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maria Santos"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Mobile Number / Email (For LGU Updates)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0917-123-4567"
                    value={guestContact}
                    onChange={e => setGuestContact(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Filed under <strong>RA 9003 Solid Waste Management Act</strong>. LGU notifications are timestamped.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-1/2 sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Incident Report (+30 Pts)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
