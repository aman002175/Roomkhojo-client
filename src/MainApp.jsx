import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl'; // v6 ESM-only: namespace import (default import hata)
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, Phone, MessageCircle, Map as MapIcon, List, Plus, Camera, Target, Info, FileText, Shield, ChevronRight, Menu, User, MapPin, Lock, Search, Navigation, AlertTriangle, Heart, Share2, Megaphone, Landmark, TrainFront, Bus, Hospital, Stethoscope, GraduationCap, School, BookOpen, Star, Satellite, Ruler, Send, Copy, Home, Users, Building2, Briefcase, Hotel, Check, Tag } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = VITE_API_BASE_URL ? VITE_API_BASE_URL.replace('/api', '') : 'https://roomkhojo-api.onrender.com';
const API_URL = `${BASE_URL}/api/rooms`;
const ADMIN_API = `${BASE_URL}/api/admin`; 
const getImageUrl = (path) => !path ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80' : path.startsWith('http') ? path : `${BASE_URL}${path}`;

// UPI note ke liye local code (asli paymentCode server banata hai)
const makePayCode = () => 'RK-' + Math.random().toString(36).substr(2, 5).toUpperCase();

// Category-wise audience options (PG/Flat/Room/service-wise Boys/Girls/Anyone)
const TYPE_OPTIONS = {
  PG: ['Boys', 'Girls'],
  Flat: ['Boys', 'Girls', 'Anyone'],
  Room: ['Boys', 'Girls', 'Anyone'],
  Hostel: ['Boys', 'Girls'],
  Library: ['Anyone'],
  Office: ['Anyone']
};
const DEFAULT_TYPES = ['Boys', 'Girls', 'Family', 'Anyone'];
const typesForCategory = (cat) => TYPE_OPTIONS[cat] || DEFAULT_TYPES;

// 👁 Session me dekhe gaye room IDs (view-count spam guard, tab lifetime)
const viewedIds = new Set();

// 👁 View-count ping — ref-free + setState-free (render-closures lint-clean rahein)
const markRoomViewed = (room) => {
  if (room && room._id && !viewedIds.has(room._id)) {
    viewedIds.add(room._id);
    fetch(`${BASE_URL}/api/rooms/${room._id}/view`, { method: 'PUT' }).catch(() => {});
  }
};

// 🗺️ ORIGINAL OSM Standard raster (shuru wali map — user demand par wapas).
// maxzoom 19 (OSM ka max — usse aage overzoom, blank tiles nahi).
const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

// 🛰️ Satellite view (deep zoom tak coverage — street me gap ho toh ye kaam aayega)
const SAT_STYLE = {
  version: 8,
  sources: {
    esriSat: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      maxzoom: 18
    }
  },
  layers: [{ id: 'esriSat', type: 'raster', source: 'esriSat' }]
};

// 💰 "₹5,500" → 5500 (filter/sort ke liye)
const priceNum = (p) => Number(String(p || '').replace(/\D/g, '')) || 0;

// 📍 Haversine distance (meters) + format
const distMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
};
const fmtDist = (m) => {
  const mm = Number(m) || 0;
  return mm < 1000 ? `${mm} m` : `${(mm / 1000).toFixed(1)} km`;
};

// OSM tags → plain-text label (icon alag POI_ICONS se aata hai)
const poiLabel = (tags) => {
  if (!tags) return null;
  if (tags.railway === 'station' || tags.railway === 'halt' || tags.public_transport === 'station') return 'Railway Station';
  if (tags.amenity === 'bus_station') return 'Bus Stand';
  if (tags.highway === 'bus_stop') return tags.name ? 'Bus Stop' : null;
  if (tags.amenity === 'hospital') return 'Hospital';
  if (tags.amenity === 'clinic' || tags.amenity === 'doctors') return 'Clinic';
  if (tags.amenity === 'training') return 'Coaching';
  if (tags.amenity === 'college' || tags.amenity === 'university') return 'College';
  if (tags.amenity === 'school') return 'School';
  return null;
};

// Category label → professional icon (puraane emoji-cats par fallback MapPin)
const POI_ICONS = {
  'Railway Station': TrainFront,
  'Bus Stand': Bus,
  'Bus Stop': Bus,
  'Hospital': Hospital,
  'Clinic': Stethoscope,
  'Coaching': BookOpen,
  'College': GraduationCap,
  'School': School
};
const PoiIcon = ({ cat, size = 14, className = '' }) => {
  const C = POI_ICONS[cat] || MapPin;
  return <C size={size} className={`shrink-0 ${className}`} />;
};

// Category → professional icon (custom categories par Tag fallback)
const CAT_ICONS = { all: Home, PG: Users, Flat: Building2, Room: Home, Hostel: Hotel, Library: BookOpen, Office: Briefcase };
const catIcon = (id) => CAT_ICONS[id] || Tag;

// Map marker star (static lucide SVG — user-data nahi, XSS-safe)
const STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

// Overpass API (free, no key): 1.5km me coaching/hospital/bus/railway dhoondo
const fetchNearbyPOI = async (lat, lng, radius = 1500) => {
  const q = `[out:json][timeout:25];(nwr["amenity"~"^(school|college|university|training|hospital|clinic|doctors)$"](around:${radius},${lat},${lng});nwr["highway"="bus_stop"](around:${radius},${lat},${lng});nwr["amenity"="bus_station"](around:${radius},${lat},${lng});nwr["railway"~"^(station|halt)$"](around:${radius},${lat},${lng}););out center 20;`;
  const res = await fetch('https://overpass.kumi.systems/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(q)
  });
  const data = await res.json();
  const seen = new Set();
  return (data.elements || [])
    .map((el) => {
      const tags = el.tags || {};
      if (!tags.name) return null;
      const plat = el.lat !== undefined ? el.lat : (el.center && el.center.lat);
      const plng = el.lon !== undefined ? el.lon : (el.center && el.center.lon);
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) return null;
      const cat = poiLabel(tags);
      if (!cat) return null;
      const key = `${tags.name}|${plat.toFixed(5)}|${plng.toFixed(5)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { name: tags.name, cat, lat: plat, lng: plng, distM: distMeters(lat, lng, plat, plng) };
    })
    .filter(Boolean)
    .sort((a, b) => a.distM - b.distM)
    .slice(0, 30);
};

// Room gallery: images[] ho toh wahi, warna puraani single image
const roomGallery = (room) => {
  if (room && Array.isArray(room.images) && room.images.length > 0) return room.images.filter(Boolean);
  if (room && room.image) return [room.image];
  return [];
};

// Logged-in API calls ke liye Bearer header
const authHeaders = () => {
  const token = localStorage.getItem('roomkhojo_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MainApp() {
  const navigate = useNavigate();
  const mapContainer = useRef(null); 
  const map = useRef(null); 
  const markersRef = useRef([]);
  const userLocMarkerRef = useRef(null); 

  const [view, setView] = useState('map'); 
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeAudience, setActiveAudience] = useState('all');
  // 🔍 Filters: price range + sort + radius
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('new');
  const [nearRadius, setNearRadius] = useState(0);
  const [userLoc, setUserLoc] = useState(null);
  // ❤️ Favorites + 🔗 Share
  const [savedIds, setSavedIds] = useState([]);
  const [shareRoom, setShareRoom] = useState(null);
  const [bannerRooms, setBannerRooms] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [wantBanner, setWantBanner] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [authMode, setAuthMode] = useState(null);
  
  // Refresh par login bana rahe (session localStorage me hai)
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('roomkhojo_user'));
  
  const [isPostAdOpen, setIsPostAdOpen] = useState(false); 
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [adType, setAdType] = useState('regular'); 
  const [promoPlan, setPromoPlan] = useState('7'); 
  
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [payCode, setPayCode] = useState('');

  const [postTitle, setPostTitle] = useState('');
  const [postPrice, setPostPrice] = useState(''); 
  const [postCategory, setPostCategory] = useState('PG');
  const [postType, setPostType] = useState('Boys'); 
  const [postMobile, setPostMobile] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState([]); 
  const [postLandmark, setPostLandmark] = useState('');
  const [postImages, setPostImages] = useState([]); // [{file, url}] max 6 
  const [postLng, setPostLng] = useState(null);
  const [postLat, setPostLat] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [payRef, setPayRef] = useState('');
  // Forgot-password (OTP) states
  const [forgotStep, setForgotStep] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  // 📍 POI picker states
  const [poiOpen, setPoiOpen] = useState(false);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiList, setPoiList] = useState([]);
  const [poiSelected, setPoiSelected] = useState([]);
  // 🗺️ Map load states (loader + dead-fallback UI ke liye)
  const [mapLoaded, setMapLoaded] = useState(false);
  // WebGL nahi (Brave Shields/purana browser) toh map kabhi nahi chalega — render-time check
  const [mapDead] = useState(() => (maplibregl.supported ? !maplibregl.supported() : false));
  // Street / Satellite toggle
  const [mapStyle, setMapStyle] = useState('street');

  const switchMapStyle = (s) => {
    setMapStyle(s);
    if (map.current) {
      try { map.current.setStyle(s === 'sat' ? SAT_STYLE : MAP_STYLE); } catch { /* ignore */ }
    }
  };

  const [sysSettings, setSysSettings] = useState({
    categories: ['PG', 'Flat', 'Hostel', 'Library', 'Office'],
    pricing: { regular: '0', promo7: '299', promo15: '499', promo30: '899', upiId: 'admin@ybl', bannerPrice: '499', bannerDays: '7' }
  });

  useEffect(() => {
    fetch(`${API_URL}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRooms(data.rooms);
          // 🔗 Shared link (?room=id) se aaye ho toh popup kholo
          const rid = new URLSearchParams(window.location.search).get('room');
          if (rid) {
            const found = (data.rooms || []).find(r => r._id === rid);
            if (found) { setSelectedRoom(found); markRoomViewed(found); }
          }
        }
      })
      .catch(() => { /* list load fail: agli baar retry hoga */ });
    fetch(`${ADMIN_API}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSysSettings(data.settings);
          if (data.settings.categories.length > 0) setPostCategory(data.settings.categories[0]);
        }
      })
      .catch(() => { /* settings optional: defaults use honge */ });
  }, []);
  const dynamicCategories = [{ id: 'all', name: 'All Rooms' }, ...sysSettings.categories.map(cat => ({ id: cat, name: cat }))];

  // Login/signup success par session save (token + user)
  const saveSession = (token, userData) => {
    localStorage.setItem('roomkhojo_token', token);
    localStorage.setItem('roomkhojo_user', JSON.stringify(userData));
    setIsLoggedIn(true);
    setAuthMode(null);
  };

  // Google idToken backend par verify hota hai (C7 fix — client-parsing nahi)
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential })
      });
      const data = await res.json();
      if (data.success) { saveSession(data.token, data.user); alert(`Namaste ${data.user.name}!`); }
      else alert(data.message || 'Google Login fail.');
    } catch { alert('Server connection failed.'); }
  };

  // Email/password real API flow (pehle fake tha — C7 fix)
  const handleEmailAuth = async () => {
    try {
      const endpoint = authMode === 'signup' ? 'signup' : 'login';
      const body = authMode === 'signup'
        ? { name: authName.trim(), email: authEmail.trim(), password: authPass }
        : { email: authEmail.trim(), password: authPass };
      const res = await fetch(`${BASE_URL}/api/users/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { saveSession(data.token, data.user); alert(`Namaste ${data.user.name}!`); }
      else alert(data.message || 'Login fail.');
    } catch { alert('Server connection failed.'); }
  };

  // Forgot password — OTP flow (R1-R4)
  const handleForgotSend = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) setForgotStep('otp');
    } catch { alert('Server connection failed.'); }
  };

  const handleForgotVerify = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp.trim() })
      });
      const data = await res.json();
      if (data.success) { setForgotResetToken(data.resetToken); setForgotStep('newpass'); }
      else alert(data.message);
    } catch { alert('Server connection failed.'); }
  };

  const handleForgotReset = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), resetToken: forgotResetToken, newPassword: forgotNewPass })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) { setForgotStep(null); setForgotEmail(''); setForgotOtp(''); setForgotNewPass(''); setForgotResetToken(''); }
    } catch { alert('Server connection failed.'); }
  };

  const getAdAmount = () => {
    if (adType === 'regular') return sysSettings.pricing.regular;
    if (promoPlan === '7') return sysSettings.pricing.promo7;
    if (promoPlan === '15') return sysSettings.pricing.promo15;
    if (promoPlan === '30') return sysSettings.pricing.promo30;
    return '0';
  };

  // Total = ad amount + banner add-on (dono admin-pricing se)
  const getPayAmount = () => {
    const ad = Number(getAdAmount() || 0);
    const banner = wantBanner ? Number(sysSettings.pricing.bannerPrice || 0) : 0;
    return String(ad + banner);
  };

  const handleLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        if(map.current) map.current.flyTo({ center: [longitude, latitude], zoom: 16.5 });
        setPostLng(longitude); setPostLat(latitude);
        if (userLocMarkerRef.current) userLocMarkerRef.current.remove();
        const el = document.createElement('div'); el.className = 'w-5 h-5 bg-blue-500 border-[3px] border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse';
        userLocMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map.current);
      }, () => {
        alert("Location permission denied ya accuracy issue hai. Kripya map par drag karke location pin karein.");
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }
  };

  const handleMapSearch = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (!searchQuery.trim()) return;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}+India`); const data = await res.json();
        if (data && data.length > 0) { if (map.current) map.current.flyTo({ center: [parseFloat(data[0].lon), parseFloat(data[0].lat)], zoom: 13, speed: 1.5 }); } else { alert(`Nahi mila.`); }
      } catch { /* search fail: user dobara try karega */ }
    }
  };

  const initiatePayment = () => {
    if(!postTitle || !postPrice || !postMobile) return alert("Title, Price aur Mobile zaroori hai!");
    if(!postLng || !postLat) return alert("Kripya map par location select karein! 'Map' button par click karein ya Live Location chunein.");
    const amount = getPayAmount();
    if (amount === '0' || amount === '') {
      submitAd(); 
    } else {
      const code = makePayCode();
      setPayCode(code); setShowPaymentWindow(true);
    }
  };

  const submitAd = async () => {
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', postTitle); fd.append('price', `₹${postPrice}`); fd.append('category', postCategory); fd.append('type', postType); fd.append('landmark', postLandmark); fd.append('mobile', postMobile); 
      fd.append('description', selectedFacilities.join(', '));
      fd.append('lng', postLng); fd.append('lat', postLat); fd.append('isPromoted', adType === 'promo');
      fd.append('promoPlan', adType === 'promo' ? promoPlan : 'regular');
      fd.append('paymentRef', payRef.trim());
      fd.append('bannerRequested', wantBanner);
      fd.append('bannerRef', payRef.trim());
      fd.append('landmarks', JSON.stringify(poiSelected));
      postImages.forEach(p => fd.append('images', p.file));

      // NOTE: userId/ownerName/paymentCode server token se leta hai (spoof-proof).
      const res = await fetch(API_URL, { method: 'POST', headers: authHeaders(), body: fd }); const data = await res.json();
      if(data.success) { 
        alert(data.message || 'Ad submitted!'); 
        setIsPostAdOpen(false); setShowPaymentWindow(false); setPostTitle(''); setPostPrice(''); setPostMobile(''); setSelectedFacilities([]); setPostLng(null); setPostLat(null); clearPostPhotos(); setPayRef(''); setWantBanner(false); setPoiSelected([]); 
      }
    } catch { alert("Server connection failed."); }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (map.current || mapDead) return;
    map.current = new maplibregl.Map({ container: mapContainer.current, style: MAP_STYLE, center: [74.3218, 29.5894], zoom: 13, maxZoom: 19, attributionControl: { compact: true } });
    map.current.on('load', () => setMapLoaded(true));
  }, [mapDead]);

  const filteredRooms = rooms.filter(r => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchesAudience = activeAudience === 'all' || (r.type || '') === activeAudience;
    const price = priceNum(r.price);
    const okMin = minPrice === '' || price >= Number(minPrice);
    const okMax = maxPrice === '' || price <= Number(maxPrice);
    let okNear = true;
    if (nearRadius !== 0 && userLoc) {
      okNear = distMeters(userLoc.lat, userLoc.lng, r.lat, r.lng) <= nearRadius * 1000;
    }
    const searchStr = searchQuery.toLowerCase();
    const matchesSearch = r.title.toLowerCase().includes(searchStr) || (r.landmark || 'hanumangarh').toLowerCase().includes(searchStr) || r.type.toLowerCase().includes(searchStr) || r.category.toLowerCase().includes(searchStr);
    return matchesCategory && matchesAudience && matchesSearch && okMin && okMax && okNear;
  });

  // Sort: newest / price low-high / high-low
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    if (sortBy === 'lo') return priceNum(a.price) - priceNum(b.price);
    if (sortBy === 'hi') return priceNum(b.price) - priceNum(a.price);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const activeFilterCount = (minPrice !== '' ? 1 : 0) + (maxPrice !== '' ? 1 : 0)
    + (sortBy !== 'new' ? 1 : 0) + (nearRadius !== 0 ? 1 : 0);

  // 📍 Nearby radius cycle (location lekar)
  const cycleRadius = () => {
    const opts = [0, 2, 5, 10];
    const next = opts[(opts.indexOf(nearRadius) + 1) % opts.length];
    if (next === 0) { setNearRadius(0); return; }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearRadius(next); },
        () => alert('Location on karo nearby filter ke liye.'),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else alert('Browser location not supported.');
  };

  // 🎯 Banner strip data + auto-flip (har 4 sec)
  useEffect(() => {
    fetch(`${BASE_URL}/api/rooms/banners`)
      .then(res => res.json())
      .then(data => { if (data.success) { setBannerRooms(data.rooms || []); setBannerIndex(0); } })
      .catch(() => { /* banner optional: strip chhupa rahega */ });
  }, []);

  useEffect(() => {
    if (bannerRooms.length < 2) return;
    const t = setInterval(() => setBannerIndex(i => (i + 1) % bannerRooms.length), 4000);
    return () => clearInterval(t);
  }, [bannerRooms.length]);

  // 📍 POI modal: pinned location (ya map center) ke aas-paas dhoondo
  const openPoiPicker = async () => {
    let lat = postLat;
    let lng = postLng;
    if ((lat === null || lat === undefined) && map.current) {
      const c = map.current.getCenter();
      lat = c.lat; lng = c.lng;
    }
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return alert('Pehle Map button se location pin karein, phir landmarks dekhein.');
    }
    setPoiOpen(true);
    setPoiLoading(true);
    setPoiList([]);
    try {
      setPoiList(await fetchNearbyPOI(lat, lng));
    } catch {
      alert('Nearby jagah load nahi hui. Internet check karke dobara try karein.');
    }
    setPoiLoading(false);
  };

  const togglePoi = (poi) => {
    setPoiSelected(prev => {
      const exists = prev.some(p => p.name === poi.name && p.lat === poi.lat && p.lng === poi.lng);
      if (exists) return prev.filter(p => !(p.name === poi.name && p.lat === poi.lat && p.lng === poi.lng));
      if (prev.length >= 5) { alert('Max 5 landmarks select kar sakte ho.'); return prev; }
      return [...prev, poi];
    });
  };

  // 📸 Multi-photo picker (max 6) + remove
  const addPostPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (postImages.length + files.length > 6) alert('Max 6 photos allowed hai.');
    const mapped = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPostImages(prev => [...prev, ...mapped].slice(0, 6));
    e.target.value = '';
  };

  const removePostPhoto = (idx) => {
    setPostImages(prev => {
      const item = prev[idx];
      if (item && item.url) URL.revokeObjectURL(item.url);
      return prev.filter((_, j) => j !== idx);
    });
  };

  const clearPostPhotos = () => {
    setPostImages(prev => {
      prev.forEach(p => { if (p.url) URL.revokeObjectURL(p.url); });
      return [];
    });
  };

  // Popup khulne par link me ?room=id lagao (share/copy ke liye)
  const openRoomPopup = (room) => {
    setSelectedRoom(room);
    markRoomViewed(room);
    if (room && room._id) window.history.replaceState(null, '', `?room=${room._id}`);
  };

  const openBannerRoom = (e) => {
    const b = bannerRooms[Number(e.currentTarget.dataset.roomIdx)];
    if (!b) return;
    markRoomViewed(b);
    setSelectedRoom(b);
    setView('map');
    if (map.current) map.current.flyTo({ center: [b.lng, b.lat], zoom: 15.5 });
  };

  // ❤️ Favorites load (login par) + toggle
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`${BASE_URL}/api/users/favorites`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success) setSavedIds((data.rooms || []).map(r => r._id));
        else setSavedIds([]);
      })
      .catch(() => setSavedIds([]));
  }, [isLoggedIn]);

  const toggleFavorite = async (roomId) => {
    if (!isLoggedIn) { setAuthMode('login'); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/users/favorites/${roomId}/toggle`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSavedIds(prev => data.saved ? [...prev, roomId] : prev.filter(id => id !== roomId));
      else alert(data.message || 'Fail ho gaya.');
    } catch { alert('Server connection failed.'); }
  };

  // 🔗 Share helpers — FRONTEND deep-link (app seedha ad kholegi).
  // (Backend /r/:id ab sirf puraane links ka redirect-fallback hai.)
  const shareUrl = (room) => `${window.location.origin}/?room=${room._id}`;
  const shareText = (room) => `${room.title} — ${room.price} (${room.category} • ${room.type})\n${room.landmark || 'Hanumangarh'}\nDekho: ${shareUrl(room)}`;

  const shareWhatsApp = (room) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(room))}`, '_blank');
  };

  const copyShareLink = async (room) => {
    try {
      await navigator.clipboard.writeText(shareText(room));
      alert('Link copy ho gaya!');
    } catch { alert(shareUrl(room)); }
  };

  const nativeShare = async (room) => {
    if (navigator.share) {
      try { await navigator.share({ title: room.title, text: `${room.title} — ${room.price}`, url: shareUrl(room) }); } catch { /* user ne cancel kiya */ }
    } else copyShareLink(room);
  };

  // Popup band karo + shared-link param saaf karo
  const closeRoomPopup = () => {
    setSelectedRoom(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleReportUnavailable = async (roomId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/report-unavailable`, { method: 'PUT' });
      if (res.ok) {
        alert("Thanks for reporting! Admin will verify and update it.");
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove()); markersRef.current = [];
    sortedRooms.forEach(room => {
      const isSelected = selectedRoom && selectedRoom._id === room._id;
      const el = document.createElement('div'); 
      el.className = `font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white text-xs cursor-pointer transition-all duration-300 flex items-center gap-1 ${room.isPromoted ? 'bg-orange-500 z-20 text-white' : 'bg-green-600 z-10 text-white'} ${isSelected ? '-translate-y-3 scale-110 shadow-2xl z-40' : 'active:scale-90'}`;
      if (room.isPromoted) {
        // Static SVG + textContent (user-data kabhi innerHTML me nahi — XSS-safe)
        el.innerHTML = STAR_SVG;
        const sp = document.createElement('span');
        sp.textContent = room.price;
        el.appendChild(sp);
      } else {
        el.textContent = room.price;
      }
      const onClick = (e) => { e.stopPropagation(); openRoomPopup(room); map.current.flyTo({ center: [room.lng, room.lat], zoom: 15.5 }); };
      el.addEventListener('click', onClick); el.addEventListener('touchstart', onClick);
      const marker = new maplibregl.Marker({ element: el }).setLngLat([room.lng, room.lat]).addTo(map.current); markersRef.current.push(marker);
    });
  }, [sortedRooms, selectedRoom]);

  const handlePostAdClick = () => {
    if (!isLoggedIn) {
      setAuthMode('login');
      return;
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { setIsPostAdOpen(true); },
        () => { setShowLocationWarning(true); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      alert("Browser location not supported.");
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden relative font-sans">
      <div className="z-40 bg-white shadow-sm shrink-0">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-50"><div className="flex items-center gap-3"><button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-600 active:scale-95"><Menu size={26} /></button><div className="flex flex-col"><h1 className="text-2xl font-black text-gray-800 tracking-tighter leading-tight">Room<span className="text-brand">Khojo</span></h1><a href="https://aman-bishnoi-wrold.oneapp.dev/#portfolio" target="_blank" rel="noreferrer" className="text-[11px] font-bold text-gray-500 hover:opacity-80 transition-opacity leading-none mt-0.5 tracking-tight">Built with <Heart size={11} fill="currentColor" className="inline text-brand" /> by <span className="text-brand">Aman Bishnoi</span></a></div></div><button onClick={() => isLoggedIn ? navigate('/dashboard') : setAuthMode('login')} className={`w-10 h-10 border rounded-full flex items-center justify-center active:scale-95 transition-all ${isLoggedIn ? 'bg-brand text-white border-brand shadow-lg shadow-brand/30' : 'bg-gray-50 text-gray-600'}`}><User size={22} /></button></header>
        <div className="px-4 pt-3"><div className="relative flex items-center"><Search className="absolute left-3 text-gray-400" size={18} /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleMapSearch} placeholder="Enter city (e.g. Ganganagar) & Search..." className="w-full bg-gray-100 text-sm font-bold text-gray-700 rounded-2xl py-3 pl-10 pr-24 outline-none border border-transparent focus:border-brand/30 transition-colors"/><button onClick={handleMapSearch} className="absolute right-2 bg-brand text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-md flex items-center gap-1">Go <Send size={13} /></button></div></div>
        <div className="flex overflow-x-auto no-scrollbar py-3 px-4 gap-3">{dynamicCategories.map((cat) => { const Icon = catIcon(cat.id); return (<button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveAudience('all'); }} className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap ${activeCategory === cat.id ? 'bg-brand text-white shadow-lg shadow-brand/30 scale-105' : 'bg-gray-100 text-gray-600'}`}><Icon size={18} /><span>{cat.name}</span></button>); })}</div>
        {/* 🔍 FILTERS (price + sort + radius) */}
        <div className="px-4 pb-3">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-2xl text-xs font-black text-gray-600 active:scale-95"><Search size={14} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}<span>{filtersOpen ? '▲' : '▼'}</span></button>
          {filtersOpen && (
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2">
              <div className="flex gap-2">
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₹" className="flex-1 p-2.5 bg-white rounded-xl outline-none font-bold text-sm border" />
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹" className="flex-1 p-2.5 bg-white rounded-xl outline-none font-bold text-sm border" />
              </div>
              <div className="flex gap-2">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 p-2.5 bg-white rounded-xl outline-none font-bold text-sm border"><option value="new">Newest first</option><option value="lo">Price: Low to High</option><option value="hi">Price: High to Low</option></select>
                <button onClick={cycleRadius} className={`flex-1 p-2.5 rounded-xl font-black text-sm border active:scale-95 flex items-center justify-center gap-1.5 ${nearRadius !== 0 ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600'}`}><MapPin size={14} /> {nearRadius === 0 ? 'Nearby: Off' : `${nearRadius} km me`}</button>
              </div>
              {activeFilterCount > 0 && (<button onClick={() => { setMinPrice(''); setMaxPrice(''); setSortBy('new'); setNearRadius(0); }} className="w-full text-xs font-black text-red-500 underline">Clear filters</button>)}
            </div>
          )}
        </div>
        {activeCategory !== 'all' && (
          <div className="flex overflow-x-auto no-scrollbar pb-3 px-4 gap-2">
            {['all', ...typesForCategory(activeCategory)].map(aud => (
              <button key={aud} onClick={() => setActiveAudience(aud)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap border ${activeAudience === aud ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 border-gray-200'}`}>
                {aud === 'all' ? 'Sab' : aud}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden bg-gray-100">
        {view === 'map' && !mapLoaded && !mapDead && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-gray-100/80 pointer-events-none">
            <p className="font-black text-gray-500 animate-pulse text-sm">Map load ho raha hai…</p>
            <p className="text-[11px] font-bold text-gray-400">Slow net par 10-20 sec lag sakta hai</p>
          </div>
        )}
        {mapDead && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gray-100 p-8 text-center">
            <p className="font-black text-gray-700">Map browser me blocked hai (WebGL off / Shields on).</p>
            <p className="text-xs font-bold text-gray-500">Brave Shields down karke ya Chrome me kholo. List view waise bhi chal raha hai.</p>
            <button onClick={() => setView('list')} className="bg-brand text-white px-5 py-3 rounded-2xl font-black text-sm">List View kholo</button>
          </div>
        )}
        {/* 🎯 Sponsored banner strip (auto-flip, click = location popup) */}
        {bannerRooms.length > 0 && (() => {
          const b = bannerRooms[bannerIndex % bannerRooms.length];
          return (
            <div className="absolute top-2 left-2 right-2 z-30">
              <div onClick={openBannerRoom} data-room-idx={bannerIndex % bannerRooms.length} className="bg-white/95 backdrop-blur rounded-xl shadow-lg border border-purple-200 px-2 py-1.5 flex items-center gap-2 active:scale-[0.98] transition-transform cursor-pointer">
                <img src={getImageUrl(b.image)} className="w-11 h-11 rounded-lg object-cover bg-gray-200 shrink-0" alt="Sponsored" />
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-black text-purple-600 uppercase tracking-wider flex items-center gap-1"><Star size={10} fill="currentColor" /> Sponsored</p>
                  <p className="font-black text-gray-800 text-[13px] leading-tight truncate">{b.title}</p>
                  <p className="text-brand font-black text-[13px]">{b.price} <span className="text-[10px] text-gray-400 font-bold">• {b.category} • {b.type}</span></p>
                </div>
                <div className="flex gap-1 pr-1 shrink-0">
                  {bannerRooms.map((_, i) => (<span key={i} className={`w-1.5 h-1.5 rounded-full ${i === (bannerIndex % bannerRooms.length) ? 'bg-purple-600' : 'bg-gray-300'}`} />))}
                </div>
              </div>
            </div>
          );
        })()}
        <div className={`absolute inset-0 transition-opacity duration-500 ${view === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}><div ref={mapContainer} className="w-full h-full" /></div>
        {view === 'map' && !isPickingLocation && (<button onClick={handleLiveLocation} className="absolute bottom-28 right-4 z-40 bg-white p-3 rounded-full shadow-xl border border-gray-100 text-brand active:scale-90 transition-transform"><Navigation size={24} fill="currentColor"/></button>)}
        {view === 'map' && (<button onClick={() => switchMapStyle(mapStyle === 'street' ? 'sat' : 'street')} className="absolute left-4 bottom-28 z-40 bg-white px-3 py-2 rounded-full shadow-xl border border-gray-100 text-xs font-black text-gray-700 flex items-center gap-1.5 active:scale-90 transition-transform">{mapStyle === 'street' ? (<><Satellite size={14} /> Satellite</>) : (<><MapIcon size={14} /> Street</>)}</button>)}
        {view === 'map' && isPickingLocation && (<button onClick={handleLiveLocation} className="absolute bottom-[90px] right-4 z-40 bg-white px-4 py-2.5 rounded-full shadow-xl border border-gray-100 text-brand font-black text-xs flex items-center gap-2 active:scale-90 transition-transform"><Navigation size={16} fill="currentColor"/> My Location</button>)}
        {isPickingLocation && view === 'map' && (
          <div className="absolute inset-0 z-30 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center drop-shadow-2xl">
              <MapPin size={44} className="text-red-500" fill="currentColor" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-2 bg-white px-4 py-1 rounded-full shadow-md text-xs font-bold text-gray-700">
              Drag map to pin
            </div>
          </div>
        )}
        
        <div className={`absolute inset-0 z-20 bg-background overflow-y-auto p-4 transition-transform duration-500 ${view === 'list' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="grid gap-5 pb-32">
            {sortedRooms.length === 0 ? (<div className="text-center p-10 text-gray-500 font-bold">Koi result nahi mila.</div>) : (sortedRooms.map(room => (
              <div key={room._id} className={`bg-white rounded-3xl overflow-hidden shadow-md border ${room.isPromoted ? 'border-orange-200' : 'border-gray-50'}`}>
                <div className="relative"><img src={getImageUrl(room.image)} className="w-full h-48 object-cover bg-gray-200" alt="Room" />{room.isPromoted && <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><Star size={10} fill="currentColor" /> Featured</div>}<div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-brand font-black">{room.price}</div></div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-gray-900 text-lg leading-tight">{room.title}</h3><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ml-2">{room.type} • {room.category}</span></div>
                  <p className="text-sm font-bold text-gray-500 flex items-center gap-1"><MapPin size={14} className="shrink-0" /> {room.landmark || 'Hanumangarh'}</p>
                  {Array.isArray(room.landmarks) && room.landmarks.length > 0 && (<div className="mt-1 space-y-0.5">{room.landmarks.slice(0, 3).map((l, i) => (<p key={i} className="text-[11px] font-bold text-purple-700 flex items-center gap-1"><PoiIcon cat={l.cat} size={12} /><span className="truncate">{l.name} ({fmtDist(l.distM)})</span></p>))}{room.landmarks.length > 3 && (<p className="text-[10px] font-bold text-purple-500">+{room.landmarks.length - 3} aur</p>)}</div>)}
                  <div className="flex gap-2 mt-3 items-center">
                    <button onClick={() => handleReportUnavailable(room._id)} className="text-[10px] bg-red-50 text-red-600 px-2 py-1.5 rounded-lg font-bold border border-red-100 active:scale-95">Unavailable?</button><button onClick={() => toggleFavorite(room._id)} className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1.5 rounded-lg font-bold border border-pink-100 active:scale-95 inline-flex items-center gap-1">{savedIds.includes(room._id) ? (<><Heart size={12} fill="currentColor" /> Saved</>) : (<><Heart size={12} /> Save</>)}</button><button onClick={() => setShareRoom(room)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1.5 rounded-lg font-bold border border-blue-100 active:scale-95 inline-flex items-center gap-1"><Share2 size={12} /> Share</button>
                  </div>
                  <div className="flex gap-3 mt-3"><a href={`tel:${room.mobile}`} className="flex-1 bg-brand text-white py-2 rounded-xl font-black flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"><Phone size={16}/> Call</a><a href={`https://wa.me/91${room.mobile}?text=${encodeURIComponent(`Namaste! Maine RoomKhojo par aapka room "${room.title}" dekha. Kya ye abhi available hai? \n\nRoom Link: ${window.location.href}`)}`} target="_blank" rel="noreferrer" className="w-12 border-2 border-[#25D366] text-[#25D366] flex items-center justify-center rounded-xl active:scale-95 transition-transform"><MessageCircle size={18}/></a><a href={`https://www.google.com/maps/dir/?api=1&destination=${room.lat},${room.lng}`} target="_blank" rel="noreferrer" className="w-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-xl active:scale-95 transition-transform border border-blue-200"><Navigation size={18}/></a></div>
                </div>
              </div>
            )))}
          </div>
        </div>

        {selectedRoom && view === 'map' && !isPickingLocation && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-h-[42dvh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-[100] p-3 border border-gray-100">
              <button onClick={closeRoomPopup} className="absolute top-2 right-2 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 z-10"><X size={18}/></button>
            <div className="flex gap-3 mb-2"><div className="flex gap-2 overflow-x-auto shrink-0 max-w-[45%] no-scrollbar">{roomGallery(selectedRoom).map((u, i) => (<img key={i} src={getImageUrl(u)} className="w-16 h-16 object-cover rounded-xl bg-gray-200 shrink-0 border border-gray-100" alt={`Room ${i + 1}`} />))}</div><div className="flex-1"><div className="flex justify-between items-start"><h3 className="font-black text-gray-800 line-clamp-1">{selectedRoom.title}</h3><span className="bg-brand/10 text-brand px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ml-1">{selectedRoom.category}</span></div><p className="text-brand font-black text-xl leading-none mt-1">{selectedRoom.price}</p><p className="text-[11px] font-bold text-gray-500 mt-1.5 flex items-center gap-1"><User size={12}/> {selectedRoom.ownerName || 'Owner'} <span className="mx-1">•</span> <Phone size={12}/> {selectedRoom.mobile}</p></div></div>
            {selectedRoom.description && (<div className="flex gap-1.5 mb-2 pt-2 border-t border-gray-50 overflow-x-auto no-scrollbar flex-nowrap">{selectedRoom.description.split(', ').map(fac => (<span key={fac} className="bg-gray-50 text-gray-600 border px-2 py-1 rounded-md text-[9px] font-bold uppercase shrink-0">{fac}</span>))}</div>)}
            {Array.isArray(selectedRoom.landmarks) && selectedRoom.landmarks.length > 0 && (<div className="bg-purple-50 border border-purple-100 rounded-xl p-2 mb-2"><p className="text-[10px] font-black text-purple-700 uppercase mb-1 flex items-center gap-1"><MapPin size={12} /> Aas-paas ki jagah</p>{selectedRoom.landmarks.map((l, i) => (<p key={i} className="text-[11px] font-bold text-gray-700 flex items-center gap-1"><PoiIcon cat={l.cat} size={12} /><span>{l.name} — <span className="text-purple-700">{fmtDist(l.distM)}</span></span></p>))}</div>)}
            <div className="flex gap-2 items-center mb-3">
              <button onClick={() => handleReportUnavailable(selectedRoom._id)} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 active:scale-95 font-bold shrink-0">Unavailable?</button><button onClick={() => toggleFavorite(selectedRoom._id)} className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded border border-pink-100 active:scale-95 font-bold shrink-0 inline-flex items-center gap-1">{savedIds.includes(selectedRoom._id) ? (<><Heart size={12} fill="currentColor" /> Saved</>) : (<><Heart size={12} /> Save</>)}</button><button onClick={() => setShareRoom(selectedRoom)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 active:scale-95 font-bold shrink-0 inline-flex items-center gap-1"><Share2 size={12} /> Share</button>
            </div>
            <div className="flex gap-2"><a href={`tel:${selectedRoom.mobile}`} className="flex-1 bg-brand text-white py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95"><Phone size={14}/> Call</a><a href={`https://wa.me/91${selectedRoom.mobile}?text=${encodeURIComponent(`Namaste! Maine RoomKhojo par aapka room "${selectedRoom.title}" dekha. Kya ye abhi available hai? \n\nRoom Link: ${window.location.href}`)}`} target="_blank" rel="noreferrer" className="flex-1 border-2 border-[#25D366] text-[#25D366] py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95"><MessageCircle size={14}/> WhatsApp</a><a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedRoom.lat},${selectedRoom.lng}`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95"><Navigation size={14}/> Navigate</a></div>
          </div>
        )}
      </div>

      {isPickingLocation ? (<div className="bg-white border-t py-4 px-6 flex justify-between items-center z-50 h-[80px] shrink-0"><button onClick={() => { const center = map.current.getCenter(); setPostLng(center.lng); setPostLat(center.lat); setIsPickingLocation(false); setIsPostAdOpen(true); }} className="w-full bg-brand text-white py-3 rounded-2xl font-black shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-transform"><MapPin size={20}/> Confirm Location</button></div>) : (<div className="shrink-0 flex flex-col z-50"><footer className="bg-white border-t py-2 px-10 flex justify-between items-center h-[70px] shadow-[0_-10px_20px_rgba(0,0,0,0.02)]"><button onClick={() => setView('map')} className={`flex flex-col items-center gap-1 transition-all ${view === 'map' ? 'text-brand scale-110' : 'text-gray-400 opacity-60'}`}><MapIcon size={24} strokeWidth={view === 'map' ? 2.5 : 2} /><span className="text-[10px] font-black uppercase tracking-tighter">Map</span></button><button onClick={handlePostAdClick} className="relative bg-brand text-white w-14 h-14 flex items-center justify-center rounded-2xl -mt-12 shadow-xl shadow-brand/40 border-4 border-white active:scale-90 transition-all duration-200"><Plus size={34} strokeWidth={3} /></button><button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 transition-all ${view === 'list' ? 'text-brand scale-110' : 'text-gray-400 opacity-60'}`}><List size={24} strokeWidth={view === 'list' ? 2.5 : 2} /><span className="text-[10px] font-black uppercase tracking-tighter">List</span></button></footer><div className="bg-white border-t border-gray-100 py-1.5 flex flex-col items-center gap-1"><div className="flex gap-4 text-[10px] font-bold text-gray-400"><button onClick={() => navigate('/about')} className="hover:text-brand transition-colors">About</button><button onClick={() => navigate('/terms')} className="hover:text-brand transition-colors">Terms</button><button onClick={() => navigate('/refund')} className="hover:text-brand transition-colors">Refund</button></div><a href="https://aman-bishnoi-wrold.oneapp.dev/#portfolio" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-gray-400 hover:text-brand transition-colors active:scale-95 inline-block">Built with <Heart size={10} fill="currentColor" className="inline text-brand" /> by Aman Bishnoi</a></div></div>)}

      <div className={`fixed inset-0 z-[8000] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div><div className={`absolute top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white flex flex-col transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="p-6 bg-brand/5 border-b"><h2 className="text-3xl font-black text-gray-800">Room<span className="text-brand">Khojo</span></h2></div><div className="p-4 space-y-2 flex-1 overflow-y-auto mt-4"><button onClick={() => { navigate('/about'); setIsMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"><div className="flex items-center gap-3"><Info size={20} className="text-brand"/> About Us</div> <ChevronRight size={18} className="text-gray-400"/></button><button onClick={() => { navigate('/terms'); setIsMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"><div className="flex items-center gap-3"><FileText size={20} className="text-brand"/> Terms</div> <ChevronRight size={18} className="text-gray-400"/></button><button onClick={() => { navigate('/refund'); setIsMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"><div className="flex items-center gap-3"><Shield size={20} className="text-brand"/> Refund Policy</div> <ChevronRight size={18} className="text-gray-400"/></button></div></div></div>
      <div className={`fixed inset-0 z-[7500] bg-white transition-transform duration-500 ${authMode ? 'translate-y-0' : 'translate-y-full'}`}>
        {authMode && (
          <div className="flex flex-col h-full p-8 justify-center relative"><button onClick={() => setAuthMode(null)} className="absolute top-8 right-8 p-2 bg-gray-100 rounded-full"><X size={24}/></button><div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mb-6"><Lock size={32}/></div><h2 className="text-4xl font-black mb-2">{authMode === 'login' ? 'Login' : 'Signup'}</h2><p className="text-gray-500 font-bold mb-4">{authMode === 'login' ? 'Welcome back!' : 'Join to post ads.'}</p><div className="flex items-start gap-3 bg-amber-50 text-amber-800 p-4 rounded-2xl text-xs font-bold mb-6 border border-amber-200"><AlertTriangle size={20} className="shrink-0 text-amber-600 mt-0.5" /><p><strong>Google Login is Preferred!</strong> Ek tap me login — koi password yaad rakhne ki zaroorat nahi.</p></div><div className="w-full flex justify-center mb-6"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => { alert('Google Login fail.'); }} useOneTap shape="rectangular" theme="outline" size="large" text="continue_with" width="300" /></div><div className="flex items-center gap-4 mb-6"><div className="flex-1 h-px bg-gray-200"></div><span className="text-xs font-bold text-gray-400 uppercase">OR EMAIL</span><div className="flex-1 h-px bg-gray-200"></div></div><div className="space-y-4 mb-6">{authMode === 'signup' && <input type="text" placeholder="Full Name" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />}<input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" /><input type="password" placeholder="Password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" /></div><button onClick={handleEmailAuth} className="w-full bg-brand text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-brand/20">Continue</button><p className="text-center mt-3"><span onClick={() => { setForgotStep('email'); }} className="text-brand font-bold text-sm cursor-pointer underline">Forgot Password? OTP se reset karein</span></p>{forgotStep && (<div className="mt-4 p-4 bg-gray-50 rounded-2xl border space-y-3"><div className="flex justify-between items-center"><p className="font-black text-sm">Reset Password (OTP)</p><button onClick={() => setForgotStep(null)} className="text-gray-400 font-bold text-sm">✕</button></div>{forgotStep === 'email' && (<div className="space-y-3"><input type="email" placeholder="Registered Email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-sm border" /><p className="text-[11px] font-bold text-gray-400">Sirf email-password wale accounts ke liye. Google login walo ko reset ki zaroorat nahi.</p><button onClick={handleForgotSend} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm">Send OTP</button></div>)}{forgotStep === 'otp' && (<div className="space-y-3"><input type="text" placeholder="6-digit OTP" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-sm border" /><button onClick={handleForgotVerify} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm">Verify OTP</button></div>)}{forgotStep === 'newpass' && (<div className="space-y-3"><input type="password" placeholder="Naya Password (min 6)" value={forgotNewPass} onChange={(e) => setForgotNewPass(e.target.value)} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-sm border" /><button onClick={handleForgotReset} className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-sm">Set New Password</button></div>)}</div>)}<p className="text-center font-bold text-gray-500 mt-6">{authMode === 'login' ? "New here? " : "Already member? "}<span onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-brand cursor-pointer">Click here</span></p></div>
        )}
      </div>

      <div className={`fixed inset-0 z-[7000] bg-black/60 transition-opacity ${isPostAdOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[30px] flex flex-col transition-transform duration-500 ${isPostAdOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '92dvh' }}>
          <div className="p-5 border-b shrink-0 flex justify-between items-center sticky top-0 bg-white rounded-t-[30px] z-10"><h2 className="text-xl font-black">Post Room Ad</h2><button onClick={() => setIsPostAdOpen(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
             <div className="flex bg-gray-100 p-1 rounded-2xl border"><button onClick={() => setAdType('regular')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all shadow-sm ${adType === 'regular' ? 'bg-white text-gray-900 border' : 'text-gray-400'}`}>Standard Ad</button><button onClick={() => setAdType('promo')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-1.5 ${adType === 'promo' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}><Star size={14} fill="currentColor" /> Promoted Ad</button></div>
             {adType === 'promo' && (<div className="flex gap-2"><button onClick={() => setPromoPlan('7')} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${promoPlan === '7' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>7 Days<br/><span className="text-lg">₹{sysSettings.pricing.promo7}</span></button><button onClick={() => setPromoPlan('15')} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${promoPlan === '15' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>15 Days<br/><span className="text-lg">₹{sysSettings.pricing.promo15}</span></button><button onClick={() => setPromoPlan('30')} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${promoPlan === '30' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>30 Days<br/><span className="text-lg">₹{sysSettings.pricing.promo30}</span></button></div>)}
              <div>
                <label className="bg-brand/5 h-24 rounded-2xl border-2 border-dashed border-brand/30 flex flex-col items-center justify-center gap-2 text-brand cursor-pointer"><Camera size={24}/><span className="font-bold text-xs">{postImages.length > 0 ? `${postImages.length}/6 Photos Selected` : 'Upload Photos (max 6)'}</span><input type="file" className="hidden" multiple accept="image/*" onChange={addPostPhotos} /></label>
                {postImages.length > 0 && (<div className="grid grid-cols-3 gap-2 mt-2">{postImages.map((p, i) => (<div key={i} className="relative"><img src={p.url} className="w-full h-20 rounded-xl object-cover border border-gray-200" alt={`Photo ${i + 1}`} /><button type="button" onClick={() => removePostPhoto(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-black flex items-center justify-center shadow">✕</button><span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-black px-1.5 py-0.5 rounded">{i + 1}</span></div>))}</div>)}
              </div>
              <div className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-colors ${wantBanner ? 'bg-purple-50 border-purple-400' : 'bg-gray-50 border-transparent'}`}><div><p className="text-sm font-black text-gray-800 flex items-center gap-1.5"><Megaphone size={16} className="text-purple-600" /> Top Banner Add-on</p><p className="text-[11px] font-bold text-gray-500">₹{sysSettings.pricing.bannerPrice || '499'} • {sysSettings.pricing.bannerDays || '7'} din top strip par (paid)</p></div><button type="button" onClick={() => setWantBanner(!wantBanner)} className={`w-12 h-7 rounded-full font-black text-[10px] transition-colors ${wantBanner ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-500'}`}>{wantBanner ? 'ON' : 'OFF'}</button></div>
             <div className="space-y-3"><input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Title" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" /><div className="flex gap-3"><select value={postCategory} onChange={(e) => { setPostCategory(e.target.value); const opts = typesForCategory(e.target.value); setPostType(opts[0]); }} className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm">{sysSettings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select><select value={postType} onChange={(e) => setPostType(e.target.value)} className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm">{typesForCategory(postCategory).map(t => <option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-3"><input type="number" value={postPrice} onChange={(e) => setPostPrice(e.target.value)} placeholder="Rent (₹)/Month" className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"/><input type="number" value={postMobile} onChange={(e) => setPostMobile(e.target.value)} placeholder="Mobile No." className="flex-[1.5] p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"/></div></div>
             <div><p className="text-xs font-black text-gray-500 mb-2 uppercase">Select Facilities</p><div className="flex flex-wrap gap-2">{(sysSettings.facilities || []).map(fac => (<button type="button" key={fac} onClick={() => setSelectedFacilities(prev => prev.includes(fac) ? prev.filter(f => f !== fac) : [...prev, fac])} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedFacilities.includes(fac) ? 'bg-brand text-white border-brand shadow-md' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{fac}</button>))}</div></div>
              <div className="flex gap-3 mt-2"><input type="text" value={postLandmark} onChange={(e) => setPostLandmark(e.target.value)} placeholder="Landmark" className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"/><button onClick={() => { setIsPostAdOpen(false); setIsPickingLocation(true); setView('map'); handleLiveLocation(); }} className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1 border-2 transition-colors ${postLng ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}><Target size={16}/> {postLng ? 'Pinned!' : 'Map'}</button><button onClick={openPoiPicker} className="p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1 border-2 transition-colors bg-purple-50 text-purple-700 border-purple-200 active:scale-95"><Landmark size={16} /> Nearby</button></div>
              {poiSelected.length > 0 && (<div className="flex flex-wrap gap-2 mt-2">{poiSelected.map((p, i) => (<span key={`${p.name}-${i}`} className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"><PoiIcon cat={p.cat} size={11} /><span>{p.name}</span><span>• {fmtDist(p.distM)}</span><button type="button" onClick={() => setPoiSelected(prev => prev.filter((_, j) => j !== i))} className="text-purple-400 font-black ml-1">✕</button></span>))}</div>)}
          </div>
          <div className="p-4 border-t bg-white sticky bottom-0 z-10">
            <button onClick={initiatePayment} disabled={isSubmitting} className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 ${adType === 'promo' ? 'bg-orange-500 text-white' : 'bg-brand text-white'}`}>
               {getPayAmount() === '0' || getPayAmount() === '' ? 'Publish Ad (Free)' : `Pay ₹${getPayAmount()} & Publish`}
            </button>
          </div>
        </div>
      </div>

      {showPaymentWindow && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="bg-orange-500 text-white p-6 text-center"><p className="font-bold text-orange-100 text-sm mb-1 uppercase tracking-wider">Payment Required</p><h2 className="text-4xl font-black">₹{getPayAmount()}</h2></div>
            <div className="p-6 text-center">
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl"><p className="text-xs font-bold text-gray-500 mb-2 uppercase">Your Secret Payment Code</p><h3 className="text-3xl font-black tracking-widest text-gray-800">{payCode}</h3></div>
              <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-4 rounded-2xl text-left text-xs font-bold mb-6"><AlertTriangle size={24} className="shrink-0 text-blue-600 mt-0.5" /><p>Niche 'Pay via UPI App' par click karein. Aapki UPI app open hogi. <strong>Payment karne ke baad wapas yahan aakar 'I have paid' par click karna na bhoolein.</strong></p></div>
              <a href={`upi://pay?pa=${sysSettings.pricing.upiId || 'admin@ybl'}&pn=RoomKhojo&am=${getPayAmount()}&cu=INR&tn=Code: ${payCode}`} className="w-full bg-brand text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 mb-3 shadow-lg shadow-brand/30 active:scale-95 transition-transform">Pay via UPI App</a>
              <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UPI Ref / UTR No. (payment ke baad milta hai)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm mb-3 border" />
              <button onClick={() => submitAd()} disabled={isSubmitting} className="w-full bg-green-50 text-green-700 py-4 rounded-2xl font-black flex items-center justify-center border border-green-200 active:scale-95 transition-transform">{isSubmitting ? 'Verifying...' : 'I have completed the payment'}</button>
              <button onClick={() => setShowPaymentWindow(false)} className="mt-4 text-sm font-bold text-gray-400 underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔗 SHARE VISITING-CARD MODAL */}
      {shareRoom && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative">
            <button onClick={() => setShareRoom(null)} className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 text-white shadow-lg rounded-full flex items-center justify-center"><X size={18}/></button>
            <div className="relative">
              <img src={getImageUrl(roomGallery(shareRoom)[0])} className="w-full h-52 object-cover bg-gray-200" alt={shareRoom.title} />
              <div className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-brand font-black">{shareRoom.price}</div>
              {shareRoom.isPromoted && (<div className="absolute bottom-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><Star size={10} fill="currentColor" /> Featured</div>)}
            </div>
            <div className="p-4">
              <div className="text-center mb-1"><h3 className="font-black text-gray-900 text-xl leading-tight">Room<span className="text-brand">Khojo</span></h3></div>
              <h4 className="font-black text-gray-800 leading-tight">{shareRoom.title}</h4>
              <p className="text-xs font-bold text-gray-500 mt-1 flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {shareRoom.category} • {shareRoom.type} • {shareRoom.landmark || 'Hanumangarh'}</p>
              <p className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1"><User size={12}/> {shareRoom.ownerName || 'Owner'} <span className="mx-1">•</span> <Phone size={12}/> {shareRoom.mobile}</p>
              {shareRoom.description && (<p className="text-[11px] font-bold text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg border line-clamp-2">{shareRoom.description}</p>)}
              <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-blue-700 truncate flex-1">{shareUrl(shareRoom)}</p>
                <button onClick={() => copyShareLink(shareRoom)} className="text-[10px] font-black bg-blue-600 text-white px-2 py-1.5 rounded-lg shrink-0 active:scale-95 inline-flex items-center gap-1"><Copy size={12} /> Copy</button>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => shareWhatsApp(shareRoom)} className="flex-1 bg-[#25D366] text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95"><MessageCircle size={18}/> WhatsApp</button>
                <button onClick={() => nativeShare(shareRoom)} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black text-sm active:scale-95 inline-flex items-center justify-center gap-2"><Share2 size={16} /> More</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📍 POI PICKER MODAL (nearby landmarks select) */}
      {poiOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[30px] sm:rounded-3xl flex flex-col h-[80dvh] sm:h-auto sm:max-h-[80dvh] shadow-2xl relative">
            <div className="p-5 border-b shrink-0 flex justify-between items-center sticky top-0 bg-white rounded-t-[30px] sm:rounded-t-3xl z-10">
              <div><h2 className="text-xl font-black flex items-center gap-2"><MapPin size={22} className="text-purple-600" /> Aas-paas ki jagah</h2><p className="text-[11px] font-bold text-gray-500">1.5 km ke andar • max 5 select</p></div>
              <button onClick={() => setPoiOpen(false)} className="bg-gray-100 p-2 rounded-full active:scale-90"><X size={20}/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2 flex-1">
              {poiLoading ? (<p className="text-center text-gray-500 font-bold p-8">Dhoondh rahe hain…</p>) : poiList.length === 0 ? (<p className="text-center text-gray-500 font-bold p-8">1.5 km me koi coaching/hospital/bus/railway nahi mila.</p>) : (poiList.map((poi, i) => {
                const sel = poiSelected.some(p => p.name === poi.name && p.lat === poi.lat && p.lng === poi.lng);
                return (<button key={`${poi.name}-${i}`} onClick={() => togglePoi(poi)} className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 text-left active:scale-[0.98] transition-all ${sel ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-gray-50 border-transparent'}`}><div className="flex-1 min-w-0 flex items-center gap-2"><PoiIcon cat={poi.cat} size={18} /><div className="flex-1 min-w-0"><p className="font-black text-sm leading-tight truncate">{poi.name}</p><p className={`text-[11px] font-bold flex items-center gap-1 ${sel ? 'text-purple-100' : 'text-gray-500'}`}><Ruler size={11} /> {fmtDist(poi.distM)} door</p></div></div>{sel ? (<span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center shrink-0 ml-2"><Check size={14} strokeWidth={3} /></span>) : (<span className="w-6 h-6 rounded-full border-2 border-current opacity-30 shrink-0 ml-2" />)}</button>);
              }))}
            </div>
            <div className="p-4 border-t bg-white sticky bottom-0 z-10 shrink-0">
              <button onClick={() => setPoiOpen(false)} className="w-full bg-brand text-white py-4 rounded-xl font-black shadow-lg active:scale-95">Done ({poiSelected.length} selected)</button>
            </div>
          </div>
        </div>
      )}

      {showLocationWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100">
              <MapPin size={32} strokeWidth={2.5}/>
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Location Required</h2>
            <p className="text-sm font-bold text-gray-500 mb-6">RoomKhojo needs your live location to place the ad correctly on the map. Kripya apne browser settings se location permission <strong className="text-gray-800">Allow</strong> karein.</p>
            <button onClick={() => setShowLocationWarning(false)} className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black flex items-center justify-center active:scale-95 transition-transform">Samajh Gaya (Close)</button>
          </div>
        </div>
      )}
    </div>
  );
}