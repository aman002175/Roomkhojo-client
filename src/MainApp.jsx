import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, Phone, MessageCircle, Map as MapIcon, List, Plus, Camera, Target, Info, FileText, Shield, ChevronRight, Menu, User, MapPin, Lock, Search, Navigation, AlertTriangle } from 'lucide-react';
import { legalData } from './LegalData'; 
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const BASE_URL = `https://roomkhojo-api.onrender.com`;
const API_URL = `${BASE_URL}/api/rooms`;
const ADMIN_API = `${BASE_URL}/api/admin`; 
const getImageUrl = (path) => !path ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80' : path.startsWith('http') ? path : `${BASE_URL}${path}`;
const facilityOptions = ['Wi-Fi', 'AC', 'Water 24x7', 'Electricity', 'Geyser', 'RO Water', 'Parking', 'CCTV', 'Meals', 'Attached Washroom'];

export default function MainApp() {
  const navigate = useNavigate();
  const mapContainer = useRef(null); 
  const map = useRef(null); 
  const markersRef = useRef([]);
  const userLocMarkerRef = useRef(null); 

  const [view, setView] = useState('map'); 
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); 
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [activeLegalPage, setActiveLegalPage] = useState(null);
  const [authMode, setAuthMode] = useState(null); 
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [isPostAdOpen, setIsPostAdOpen] = useState(false); 
  const [isPickingLocation, setIsPickingLocation] = useState(false);
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
  const [postImage, setPostImage] = useState(null); 
  const [postLng, setPostLng] = useState(null);
  const [postLat, setPostLat] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sysSettings, setSysSettings] = useState({
    categories: ['PG', 'Flat', 'Hostel', 'Library', 'Office'],
    pricing: { regular: '0', promo7: '299', promo15: '499', promo30: '899', upiId: 'admin@ybl' }
  });

  useEffect(() => { 
    fetchRooms(); fetchSystemSettings(); 
    const savedUser = localStorage.getItem('roomkhojo_user');
    if (savedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); }
  }, []);

  const fetchRooms = async () => { try { const res = await fetch(API_URL); const data = await res.json(); if (data.success) setRooms(data.rooms); } catch (e) {} };
  const fetchSystemSettings = async () => { try { const res = await fetch(`${ADMIN_API}/settings`); const data = await res.json(); if (data.success && data.settings) { setSysSettings(data.settings); if(data.settings.categories.length > 0) setPostCategory(data.settings.categories[0]); } } catch (e) { } };
  const dynamicCategories = [{ id: 'all', name: 'All Rooms', icon: '🏠' }, ...sysSettings.categories.map(cat => ({ id: cat, name: cat, icon: cat==='PG'?'👥':cat==='Flat'?'🏢':cat==='Library'?'📚':cat==='Office'?'💼':'🏨' }))];

  const getPayAmount = () => {
    if (adType === 'regular') return sysSettings.pricing.regular;
    if (promoPlan === '7') return sysSettings.pricing.promo7;
    if (promoPlan === '15') return sysSettings.pricing.promo15;
    if (promoPlan === '30') return sysSettings.pricing.promo30;
    return '0';
  };

  const handleLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        if(map.current) map.current.flyTo({ center: [longitude, latitude], zoom: 15.5 });
        setPostLng(longitude); setPostLat(latitude);
        if (userLocMarkerRef.current) userLocMarkerRef.current.remove();
        const el = document.createElement('div'); el.className = 'w-5 h-5 bg-blue-500 border-[3px] border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse';
        userLocMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map.current);
      }, () => alert("Location permission denied."));
    }
  };

  const handleMapSearch = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (!searchQuery.trim()) return;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}+India`); const data = await res.json();
        if (data && data.length > 0) { if (map.current) map.current.flyTo({ center: [parseFloat(data[0].lon), parseFloat(data[0].lat)], zoom: 13, speed: 1.5 }); } else { alert(`Nahi mila.`); }
      } catch (error) {}
    }
  };

  const initiatePayment = () => {
    if(!postTitle || !postPrice || !postMobile) return alert("Title, Price aur Mobile zaroori hai!");
    const amount = getPayAmount();
    if (amount === '0' || amount === '') {
      submitAd('FREE'); 
    } else {
      const code = 'RK-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      setPayCode(code); setShowPaymentWindow(true); 
    }
  };

  const submitAd = async (finalCode) => {
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', postTitle); fd.append('price', `₹${postPrice}`); fd.append('category', postCategory); fd.append('type', postType); fd.append('landmark', postLandmark); fd.append('mobile', postMobile); 
      fd.append('description', selectedFacilities.join(', '));
      fd.append('lng', postLng || 74.3218); fd.append('lat', postLat || 29.5894); fd.append('isPromoted', adType === 'promo');
      fd.append('userId', currentUser ? currentUser.id : 'unknown_user'); 
      fd.append('ownerName', currentUser ? currentUser.name : 'Owner');
      fd.append('promoPlan', adType === 'promo' ? promoPlan : 'regular'); 
      fd.append('paymentCode', finalCode);
      if (postImage) fd.append('image', postImage);
      
      const res = await fetch(API_URL, { method: 'POST', body: fd }); const data = await res.json();
      if(data.success) { 
        alert("🎉 Ad submitted! Admin verification ke baad live hoga."); 
        setIsPostAdOpen(false); setShowPaymentWindow(false); setPostTitle(''); setPostPrice(''); setPostMobile(''); setSelectedFacilities([]); setPostLng(null); setPostLat(null); setPostImage(null); 
      }
    } catch (e) { alert("Server connection failed."); }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({ container: mapContainer.current, style: { version: 8, sources: { 'osm': { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] }, center: [74.3218, 29.5894], zoom: 13, attributionControl: false });
  }, []);

  const filteredRooms = rooms.filter(r => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const searchStr = searchQuery.toLowerCase();
    const matchesSearch = r.title.toLowerCase().includes(searchStr) || (r.landmark || 'hanumangarh').toLowerCase().includes(searchStr) || r.type.toLowerCase().includes(searchStr) || r.category.toLowerCase().includes(searchStr);
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove()); markersRef.current = [];
    filteredRooms.forEach(room => {
      const isSelected = selectedRoom && selectedRoom._id === room._id;
      const el = document.createElement('div'); 
      el.className = `font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white text-xs cursor-pointer transition-all duration-300 ${room.isPromoted ? 'bg-orange-500 z-20 text-white' : 'bg-brand text-white'} ${isSelected ? '-translate-y-3 scale-110 shadow-2xl z-40' : 'active:scale-90'}`; 
      el.innerHTML = room.isPromoted ? `⭐ ${room.price}` : room.price;
      const onClick = (e) => { e.stopPropagation(); setSelectedRoom(room); map.current.flyTo({ center: [room.lng, room.lat], zoom: 15.5 }); };
      el.addEventListener('click', onClick); el.addEventListener('touchstart', onClick);
      const marker = new maplibregl.Marker({ element: el }).setLngLat([room.lng, room.lat]).addTo(map.current); markersRef.current.push(marker);
    });
  }, [filteredRooms, selectedRoom]);

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden relative font-sans">
      <div className="z-40 bg-white shadow-sm shrink-0">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-50"><div className="flex items-center gap-3"><button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-600 active:scale-95"><Menu size={26} /></button><h1 className="text-2xl font-black text-gray-800 tracking-tighter">Room<span className="text-brand">Khojo</span></h1></div><button onClick={() => isLoggedIn ? navigate('/dashboard') : setAuthMode('login')} className={`w-10 h-10 border rounded-full flex items-center justify-center active:scale-95 transition-all ${isLoggedIn ? 'bg-brand text-white border-brand shadow-lg shadow-brand/30' : 'bg-gray-50 text-gray-600'}`}><User size={22} /></button></header>
        <div className="px-4 pt-3"><div className="relative flex items-center"><Search className="absolute left-3 text-gray-400" size={18} /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleMapSearch} placeholder="Enter city (e.g. Ganganagar) & Search..." className="w-full bg-gray-100 text-sm font-bold text-gray-700 rounded-2xl py-3 pl-10 pr-24 outline-none border border-transparent focus:border-brand/30 transition-colors"/><button onClick={handleMapSearch} className="absolute right-2 bg-brand text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-md">Go 🚀</button></div></div>
        <div className="flex overflow-x-auto no-scrollbar py-3 px-4 gap-3">{dynamicCategories.map((cat) => (<button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap ${activeCategory === cat.id ? 'bg-brand text-white shadow-lg shadow-brand/30 scale-105' : 'bg-gray-100 text-gray-600'}`}><span>{cat.icon}</span><span>{cat.name}</span></button>))}</div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-gray-100">
        <div className={`absolute inset-0 transition-opacity duration-500 ${view === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}><div ref={mapContainer} className="w-full h-full" /></div>
        {view === 'map' && !isPickingLocation && (<button onClick={handleLiveLocation} className="absolute bottom-28 right-4 z-40 bg-white p-3 rounded-full shadow-xl border border-gray-100 text-brand active:scale-90 transition-transform"><Navigation size={24} fill="currentColor"/></button>)}
        {isPickingLocation && view === 'map' && (<div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center"><Target size={40} className="text-brand drop-shadow-xl -mt-10" /><div className="mt-2 bg-white px-4 py-1 rounded-full shadow-md text-xs font-bold text-gray-700">Drag map to pin</div></div>)}
        
        <div className={`absolute inset-0 z-20 bg-background overflow-y-auto p-4 transition-transform duration-500 ${view === 'list' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="grid gap-5 pb-32">
            {filteredRooms.length === 0 ? (<div className="text-center p-10 text-gray-500 font-bold">Koi result nahi mila.</div>) : (filteredRooms.map(room => (
              <div key={room._id} className={`bg-white rounded-3xl overflow-hidden shadow-md border ${room.isPromoted ? 'border-orange-200' : 'border-gray-50'}`}>
                <div className="relative"><img src={getImageUrl(room.image)} className="w-full h-48 object-cover bg-gray-200" alt="Room" />{room.isPromoted && <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">⭐ Featured</div>}<div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-brand font-black">{room.price}</div></div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-gray-900 text-lg leading-tight">{room.title}</h3><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ml-2">{room.type} • {room.category}</span></div>
                  <p className="text-sm font-bold text-gray-500">📍 {room.landmark || 'Hanumangarh'}</p>
                  <div className="flex gap-3 mt-4"><a href={`tel:${room.mobile}`} className="flex-1 bg-brand text-white py-2 rounded-xl font-black flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"><Phone size={16}/> Call</a><a href={`https://wa.me/91${room.mobile}?text=${encodeURIComponent(`Namaste! Maine RoomKhojo par aapka room "${room.title}" dekha. Kya ye abhi available hai? \n\nRoom Link: ${window.location.href}`)}`} target="_blank" rel="noreferrer" className="w-12 border-2 border-[#25D366] text-[#25D366] flex items-center justify-center rounded-xl active:scale-95 transition-transform"><MessageCircle size={18}/></a></div>
                </div>
              </div>
            )))}
          </div>
        </div>

        {selectedRoom && view === 'map' && !isPickingLocation && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] bg-white rounded-3xl shadow-2xl z-[100] p-4 border border-gray-100">
            <button onClick={() => setSelectedRoom(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600"><X size={18}/></button>
            <div className="flex gap-4 mb-3"><img src={getImageUrl(selectedRoom.image)} className="w-20 h-20 object-cover rounded-2xl bg-gray-200 shrink-0" alt="Room" /><div className="flex-1"><div className="flex justify-between items-start"><h3 className="font-black text-gray-800 line-clamp-1">{selectedRoom.title}</h3><span className="bg-brand/10 text-brand px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ml-1">{selectedRoom.category}</span></div><p className="text-brand font-black text-xl leading-none mt-1">{selectedRoom.price}</p><p className="text-[11px] font-bold text-gray-500 mt-1.5 flex items-center gap-1"><User size={12}/> {selectedRoom.ownerName || 'Owner'} <span className="mx-1">•</span> <Phone size={12}/> {selectedRoom.mobile}</p></div></div>
            {selectedRoom.description && (<div className="flex flex-wrap gap-1.5 mb-3 pt-2 border-t border-gray-50">{selectedRoom.description.split(', ').map(fac => (<span key={fac} className="bg-gray-50 text-gray-600 border px-2 py-1 rounded-md text-[9px] font-bold uppercase">{fac}</span>))}</div>)}
            <div className="flex gap-2"><a href={`tel:${selectedRoom.mobile}`} className="flex-1 bg-brand text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95"><Phone size={14}/> Call</a><a href={`https://wa.me/91${selectedRoom.mobile}?text=${encodeURIComponent(`Namaste! Maine RoomKhojo par aapka room "${selectedRoom.title}" dekha. Kya ye abhi available hai? \n\nRoom Link: ${window.location.href}`)}`} target="_blank" rel="noreferrer" className="flex-[1.5] border-2 border-[#25D366] text-[#25D366] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95"><MessageCircle size={14}/> WhatsApp</a></div>
          </div>
        )}
      </div>

      {isPickingLocation ? (<div className="bg-white border-t py-4 px-6 flex justify-between items-center z-50 h-[80px] shrink-0"><button onClick={() => { const center = map.current.getCenter(); setPostLng(center.lng); setPostLat(center.lat); setIsPickingLocation(false); setIsPostAdOpen(true); }} className="w-full bg-brand text-white py-3 rounded-2xl font-black shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-transform"><MapPin size={20}/> Confirm Location</button></div>) : (<footer className="bg-white border-t py-2 px-10 flex justify-between items-center z-50 h-[80px] shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]"><button onClick={() => setView('map')} className={`flex flex-col items-center gap-1 transition-all ${view === 'map' ? 'text-brand scale-110' : 'text-gray-400 opacity-60'}`}><MapIcon size={24} strokeWidth={view === 'map' ? 2.5 : 2} /><span className="text-[10px] font-black uppercase tracking-tighter">Map</span></button><button onClick={() => isLoggedIn ? setIsPostAdOpen(true) : setAuthMode('login')} className="relative bg-brand text-white w-14 h-14 flex items-center justify-center rounded-2xl -mt-12 shadow-xl shadow-brand/40 border-4 border-white active:scale-90 transition-all duration-200"><Plus size={34} strokeWidth={3} /></button><button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 transition-all ${view === 'list' ? 'text-brand scale-110' : 'text-gray-400 opacity-60'}`}><List size={24} strokeWidth={view === 'list' ? 2.5 : 2} /><span className="text-[10px] font-black uppercase tracking-tighter">List</span></button></footer>)}

      <div className={`fixed inset-0 z-[8000] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div><div className={`absolute top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white flex flex-col transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="p-6 bg-brand/5 border-b"><h2 className="text-3xl font-black text-gray-800">Room<span className="text-brand">Khojo</span></h2></div><div className="p-4 space-y-2 flex-1 overflow-y-auto mt-4"><button onClick={() => { setActiveLegalPage('about'); setIsMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"><div className="flex items-center gap-3"><Info size={20} className="text-brand"/> About Us</div> <ChevronRight size={18} className="text-gray-400"/></button><button onClick={() => { setActiveLegalPage('terms'); setIsMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"><div className="flex items-center gap-3"><FileText size={20} className="text-brand"/> Terms</div> <ChevronRight size={18} className="text-gray-400"/></button><button onClick={() => { setActiveLegalPage('refund'); setIsMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"><div className="flex items-center gap-3"><Shield size={20} className="text-brand"/> Refund Policy</div> <ChevronRight size={18} className="text-gray-400"/></button></div></div></div>
      <div className={`fixed inset-0 z-[7500] bg-white transition-transform duration-500 ${authMode ? 'translate-y-0' : 'translate-y-full'}`}>
        {authMode && (
          <div className="flex flex-col h-full p-8 justify-center relative"><button onClick={() => setAuthMode(null)} className="absolute top-8 right-8 p-2 bg-gray-100 rounded-full"><X size={24}/></button><div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mb-6"><Lock size={32}/></div><h2 className="text-4xl font-black mb-2">{authMode === 'login' ? 'Login' : 'Signup'}</h2><p className="text-gray-500 font-bold mb-8">{authMode === 'login' ? 'Welcome back!' : 'Join to post ads.'}</p><div className="w-full flex justify-center mb-6"><GoogleLogin onSuccess={credentialResponse => { const details = jwtDecode(credentialResponse.credential); const userData = { id: details.sub, name: details.name, email: details.email, pic: details.picture }; localStorage.setItem('roomkhojo_user', JSON.stringify(userData)); setCurrentUser(userData); setIsLoggedIn(true); setAuthMode(null); alert(`Namaste ${details.name}!`); }} onError={() => { alert('Google Login fail.'); }} useOneTap shape="rectangular" theme="outline" size="large" text="continue_with" width="300" /></div><div className="flex items-center gap-4 mb-6"><div className="flex-1 h-px bg-gray-200"></div><span className="text-xs font-bold text-gray-400 uppercase">OR EMAIL</span><div className="flex-1 h-px bg-gray-200"></div></div><div className="space-y-4 mb-6">{authMode === 'signup' && <input type="text" placeholder="Full Name" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />}<input type="email" placeholder="Email" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" /><input type="password" placeholder="Password" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" /></div><button onClick={() => { setIsLoggedIn(true); setAuthMode(null); }} className="w-full bg-brand text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-brand/20">Continue</button><p className="text-center font-bold text-gray-500 mt-6">{authMode === 'login' ? "New here? " : "Already member? "}<span onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-brand cursor-pointer">Click here</span></p></div>
        )}
      </div>

      <div className={`fixed inset-0 z-[7000] bg-black/60 transition-opacity ${isPostAdOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[30px] flex flex-col transition-transform duration-500 ${isPostAdOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '92dvh' }}>
          <div className="p-5 border-b shrink-0 flex justify-between items-center sticky top-0 bg-white rounded-t-[30px] z-10"><h2 className="text-xl font-black">Post Room Ad</h2><button onClick={() => setIsPostAdOpen(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
             <div className="flex bg-gray-100 p-1 rounded-2xl border"><button onClick={() => setAdType('regular')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all shadow-sm ${adType === 'regular' ? 'bg-white text-gray-900 border' : 'text-gray-400'}`}>Standard Ad</button><button onClick={() => setAdType('promo')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all shadow-md ${adType === 'promo' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>⭐ Promoted Ad</button></div>
             {adType === 'promo' && (<div className="flex gap-2"><button onClick={() => setPromoPlan('7')} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${promoPlan === '7' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>7 Days<br/><span className="text-lg">₹{sysSettings.pricing.promo7}</span></button><button onClick={() => setPromoPlan('15')} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${promoPlan === '15' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>15 Days<br/><span className="text-lg">₹{sysSettings.pricing.promo15}</span></button><button onClick={() => setPromoPlan('30')} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${promoPlan === '30' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>30 Days<br/><span className="text-lg">₹{sysSettings.pricing.promo30}</span></button></div>)}
             <div><label className="bg-brand/5 h-24 rounded-2xl border-2 border-dashed border-brand/30 flex flex-col items-center justify-center gap-2 text-brand cursor-pointer"><Camera size={24}/><span className="font-bold text-xs">{postImage ? 'Image Selected' : 'Upload Photo'}</span><input type="file" className="hidden" onChange={(e) => setPostImage(e.target.files[0])} accept="image/*" /></label></div>
             <div className="space-y-3"><input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Title" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" /><div className="flex gap-3"><select value={postCategory} onChange={(e) => setPostCategory(e.target.value)} className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm">{sysSettings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select><select value={postType} onChange={(e) => setPostType(e.target.value)} className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"><option value="Boys">Boys</option><option value="Girls">Girls</option><option value="Family">Family</option></select></div><div className="flex gap-3"><input type="number" value={postPrice} onChange={(e) => setPostPrice(e.target.value)} placeholder="Rent (₹)/Month" className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"/><input type="number" value={postMobile} onChange={(e) => setPostMobile(e.target.value)} placeholder="Mobile No." className="flex-[1.5] p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"/></div></div>
             <div><p className="text-xs font-black text-gray-500 mb-2 uppercase">Select Facilities</p><div className="flex flex-wrap gap-2">{facilityOptions.map(fac => (<button type="button" key={fac} onClick={() => setSelectedFacilities(prev => prev.includes(fac) ? prev.filter(f => f !== fac) : [...prev, fac])} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedFacilities.includes(fac) ? 'bg-brand text-white border-brand shadow-md' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{fac}</button>))}</div></div>
             <div className="flex gap-3 mt-2"><input type="text" value={postLandmark} onChange={(e) => setPostLandmark(e.target.value)} placeholder="Landmark" className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"/><button onClick={() => { setIsPostAdOpen(false); setIsPickingLocation(true); setView('map'); handleLiveLocation(); }} className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1 border-2 transition-colors ${postLng ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}><Target size={16}/> {postLng ? 'Pinned!' : 'Map'}</button></div>
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
              <button onClick={() => submitAd(payCode)} disabled={isSubmitting} className="w-full bg-green-50 text-green-700 py-4 rounded-2xl font-black flex items-center justify-center border border-green-200 active:scale-95 transition-transform">{isSubmitting ? 'Verifying...' : '✅ I have completed the payment'}</button>
              <button onClick={() => setShowPaymentWindow(false)} className="mt-4 text-sm font-bold text-gray-400 underline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}