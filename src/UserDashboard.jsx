import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Star, ArrowLeft, Settings, Bell, MapPin, Trash2, Edit3, X, Camera, ShieldAlert, Phone, Clock, Eye, Heart, RefreshCw, Link, AlertTriangle } from 'lucide-react';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = VITE_API_BASE_URL ? VITE_API_BASE_URL.replace('/api', '') : 'https://roomkhojo-api.onrender.com';
const getImageUrl = (path) => !path ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80' : path.startsWith('http') ? path : `${BASE_URL}${path}`;

// Logged-in API calls ke liye Bearer header
const authHeaders = () => {
  const token = localStorage.getItem('roomkhojo_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function UserDashboard() {
  const navigate = useNavigate();
  // Session lazy-load (refresh par login bana rehta hai)
  const [currentUser, setCurrentUser] = useState(() => {
    try { const saved = localStorage.getItem('roomkhojo_user'); return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  // ⚙️ Settings panel states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [myRooms, setMyRooms] = useState([]);

  // 🚨 EDIT STATES
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', type: 'Boys', category: 'PG', landmark: '', mobile: '', description: [] });
  const [editKeep, setEditKeep] = useState([]); // mevcut URLs (✕ se hatao)
  const [editNew, setEditNew] = useState([]); // nayi files [{file, url}]
  // 🔄 Renew states
  const [renewRoom, setRenewRoom] = useState(null);
  const [renewPlan, setRenewPlan] = useState('7');
  const [renewRef, setRenewRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sysSettings, setSysSettings] = useState({ facilities: ['Wi-Fi', 'AC', 'Water 24x7', 'Electricity', 'Geyser', 'RO Water', 'Parking', 'CCTV', 'Meals', 'Attached Washroom'] });

  // ❤️ Saved ads (favorites) + unsave
  const [savedRooms, setSavedRooms] = useState([]);

  const fetchSaved = () => {
    fetch(`${BASE_URL}/api/users/favorites`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setSavedRooms(data.rooms || []); })
      .catch(() => { /* saved optional */ });
  };

  const unsaveRoom = async (roomId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/favorites/${roomId}/toggle`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success && !data.saved) setSavedRooms(savedRooms.filter(r => r._id !== roomId));
    } catch { alert('Server connection failed.'); }
  };

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    fetch(`${BASE_URL}/api/rooms/user/${currentUser.id}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setMyRooms(data.rooms); })
      .catch((err) => console.error(err));
    fetch(`${BASE_URL}/api/admin/settings`)
      .then(res => res.json())
      .then(data => { if (data.success && data.settings) setSysSettings(data.settings); })
      .catch(() => { /* settings optional: defaults use honge */ });
    fetchSaved();
  }, [navigate, currentUser, refreshKey]);

  const handleLogout = () => { localStorage.removeItem('roomkhojo_user'); localStorage.removeItem('roomkhojo_token'); navigate('/'); window.location.reload(); };

  // 🔗 Apne puraane ads khud link karo — admin ki zaroorat nahi (one-tap)
  const handleClaimOrphans = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/claim-orphans`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      alert(data.message);
      if (data.success && data.migrated > 0) setRefreshKey(k => k + 1);
    } catch { alert('Server connection failed.'); }
  };

  const toggleRoomStatus = async (roomId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/toggle-status`, { method: 'PATCH', headers: authHeaders() });
      const data = await res.json();
      if (data.success) { setMyRooms(myRooms.map(room => room._id === roomId ? { ...room, isActive: data.isActive } : room)); }
    } catch { alert('Status update fail ho gaya.'); }
  };

  const deleteRoom = async (roomId) => {
    if (!window.confirm("Kya aap sach mein is Ad ko hamesha ke liye Delete karna chahte hain?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/${roomId}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) { setMyRooms(myRooms.filter(room => room._id !== roomId)); alert("Ad successfully deleted!"); }
    } catch { alert('Delete fail ho gaya.'); }
  };

  // 🚨 OPEN EDIT MODAL
  const openEditModal = (room) => {
    let facilities = [];
    if(room.description) facilities = room.description.split(', ');
    
    setEditForm({
      title: room.title, price: room.price.replace('₹', ''), type: room.type, 
      category: room.category, landmark: room.landmark, mobile: room.mobile, description: facilities
    });
    setEditingRoomId(room._id);
    setEditKeep(room.images && room.images.length > 0 ? [...room.images] : (room.image ? [room.image] : []));
    setEditNew([]);
    setIsEditModalOpen(true);
  };

  // 🚨 SUBMIT EDIT (Sends to Pending)
  const submitEdit = async () => {
    if(!editForm.title || !editForm.price || !editForm.mobile) return alert("All fields required!");
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', editForm.title); fd.append('price', `₹${editForm.price}`); fd.append('type', editForm.type);
      fd.append('category', editForm.category); fd.append('landmark', editForm.landmark); fd.append('mobile', editForm.mobile);
      fd.append('description', editForm.description.join(', '));
      fd.append('keepImages', JSON.stringify(editKeep));
      editNew.forEach(p => fd.append('images', p.file));

      const res = await fetch(`${BASE_URL}/api/rooms/${editingRoomId}/edit`, { method: 'PUT', headers: authHeaders(), body: fd });
      const data = await res.json();
      
      if(data.success) {
        alert("Ad Updated! Admin approval ke liye bhej diya gaya hai (Pending Mode).");
        setIsEditModalOpen(false);
        setRefreshKey(k => k + 1); // Refresh data
      }
    } catch { alert("Error saving edits."); }
    setIsSubmitting(false);
  };

  // 📸 Edit gallery me nayi photos add (max 6 total)
  const addEditPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (editKeep.length + editNew.length + files.length > 6) alert('Max 6 photos allowed hai.');
    const mapped = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setEditNew(prev => [...prev, ...mapped].slice(0, Math.max(0, 6 - editKeep.length)));
    e.target.value = '';
  };

  // 🔄 Renew helpers + submit (expired promo → payment → admin verify)
  const renewPrice = (d) => {
    const p = sysSettings.pricing || {};
    if (d === '7') return p.promo7 || '299';
    if (d === '15') return p.promo15 || '499';
    return p.promo30 || '899';
  };
  const renewUpiId = (sysSettings.pricing && sysSettings.pricing.upiId) || 'admin@ybl';

  const submitRenew = async () => {
    if (!renewRoom) return;
    if (!renewRef.trim()) return alert('UPI Ref / UTR No. daliye (payment ke baad milta hai).');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/${renewRoom._id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ promoPlan: renewPlan, paymentRef: renewRef.trim() })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) { setRenewRoom(null); setRenewRef(''); setRefreshKey(k => k + 1); }
    } catch { alert('Server connection failed.'); }
    setIsSubmitting(false);
  };

  // ⚙️ Settings: naam + password save
  const saveProfileName = async () => {
    if (!editName.trim()) return alert('Naam khaali nahi ho sakta.');
    try {
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: editName.trim() })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        const merged = { ...currentUser, ...data.user };
        setCurrentUser(merged);
        localStorage.setItem('roomkhojo_user', JSON.stringify(merged));
      }
    } catch { alert('Server connection failed.'); }
  };

  const saveNewPassword = async () => {
    if (!oldPw || !newPw) return alert('Puraana aur naya password dono daliye.');
    try {
      const res = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) { setOldPw(''); setNewPw(''); }
    } catch { alert('Server connection failed.'); }
  };

  const getDaysLeft = (expiryDate, plan) => {
    if (plan === 'regular' || !plan) return null;
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="h-[100dvh] w-full bg-gray-50 flex flex-col font-sans">
      <header className="bg-brand text-white p-6 rounded-b-[40px] shadow-lg relative shrink-0">
        <button onClick={() => navigate('/')} className="absolute top-6 left-6 p-2 bg-white/20 rounded-full active:scale-95 transition-transform"><ArrowLeft size={20}/></button>
        <button onClick={() => { setEditName(currentUser?.name || ''); setOldPw(''); setNewPw(''); setSettingsOpen(true); }} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full active:scale-95 transition-transform"><Settings size={20}/></button>
        <div className="flex flex-col items-center mt-6">
          {currentUser?.pic ? ( <img src={currentUser.pic} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 object-cover" /> ) : ( <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white shadow-xl mb-4"><User size={40}/></div> )}
          <h1 className="text-2xl font-black">Welcome, {currentUser?.name?.split(' ')[0] || 'User'}</h1>
          <p className="text-white/80 font-bold text-sm">{currentUser?.email || 'user@roomkhojo.com'}</p>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Star className="text-brand"/> My Posted Ads</h2>
          <span className="bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-black">{myRooms.length} Total</span>
        </div>
        
        {myRooms.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-5 rounded-3xl border border-blue-200 text-center">
                <p className="font-black text-blue-900 mb-1 flex items-center justify-center gap-1.5"><Link size={16} /> Purane ads hain?</p>
                <p className="text-xs font-bold text-blue-700 mb-3">Puraani site wale ads ek tap me link karo (admin ki zaroorat nahi).</p>
                <button onClick={handleClaimOrphans} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-sm active:scale-95">Mere Purane Ads Link Karo</button>
              </div>
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Bell size={24} className="text-gray-300"/></div><p className="text-gray-500 font-bold">Abhi aapne koi room ad post nahi kiya hai.</p><button onClick={() => navigate('/')} className="mt-4 text-brand font-black underline">Go post an ad</button></div>
            </div>
        ) : (
            <div className="grid gap-4 pb-10">
                {myRooms.map(room => {
                const daysLeft = getDaysLeft(room.expiryDate, room.promoPlan);
                const isExpired = daysLeft !== null && daysLeft <= 0;
                const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

                return (
                    <div key={room._id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 p-3 flex flex-col gap-2 relative">
                        {/* 🚨 STATUS BANNERS */}
                        {!room.isApproved && (
                          <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black text-center py-1 uppercase tracking-widest z-10 shadow-sm">
                            Verification Pending (Hidden)
                          </div>
                        )}
                        {room.isApproved && isExpired && (
                          <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-[10px] font-black text-center py-1 uppercase tracking-widest z-10 shadow-sm flex items-center justify-center gap-1">
                            <AlertTriangle size={12} /> Promo khatam — Normal ad live hai
                          </div>
                        )}
                        {room.isApproved && isExpiringSoon && (
                          <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-[10px] font-black text-center py-1 uppercase tracking-widest z-10 shadow-sm flex items-center justify-center gap-1">
                            <Clock size={12} /> Expiring in {daysLeft} Days
                          </div>
                        )}

                        <div className={`flex gap-4 ${(!room.isApproved || isExpired) ? 'mt-4 opacity-80' : isExpiringSoon ? 'mt-4' : ''}`}>
                          <img src={getImageUrl(room.image)} className="w-24 h-24 rounded-2xl object-cover bg-gray-200 shrink-0 border border-gray-100" alt="Room" />
                          <div className="flex-1 py-1 flex flex-col justify-between">
                              <div>
                                  <div className="flex justify-between items-start">
                                      <h3 className="font-black text-gray-800 leading-tight line-clamp-1">{room.title}</h3>
                                      {room.isPromoted && !isExpired && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-1 rounded-lg font-black uppercase shrink-0 ml-2 inline-flex items-center gap-1"><Star size={10} fill="currentColor" /> Promoted</span>}
                                  </div>
                                  <p className="text-brand font-black mt-1">{room.price}</p>
                                  <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1"><MapPin size={12}/> {room.landmark || 'Hanumangarh'}</p>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  <span className={`w-2 h-2 rounded-full ${room.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {room.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                                  <Eye size={12} /> {room.views || 0}
                                </span>
                                {daysLeft !== null && daysLeft > 3 && (
                                  <span className="text-[10px] font-bold text-gray-500">{daysLeft} Days Left</span>
                                )}
                              </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                          <button onClick={() => toggleRoomStatus(room._id)} className="text-[10px] font-bold text-gray-500 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-lg active:scale-95 transition-colors hover:bg-gray-100">Hide/Show</button>
                          <div className="flex gap-2">
                            {/* 🔄 RENEW BUTTON (expired promo par) */}
                            {isExpired && (<button onClick={() => { setRenewRoom(room); setRenewPlan(room.promoPlan && room.promoPlan !== 'regular' ? room.promoPlan : '7'); setRenewRef(''); }} className="text-[11px] font-black text-white bg-orange-500 px-3 py-1.5 rounded-lg active:scale-95 flex items-center gap-1"><RefreshCw size={12} /> Renew</button>)}
                            {!room.isPromoted && !isExpired && (<button onClick={() => { setRenewRoom(room); setRenewPlan('7'); setRenewRef(''); }} className="text-[11px] font-black text-white bg-brand px-3 py-1.5 rounded-lg active:scale-95 flex items-center gap-1"><Star size={12} fill="currentColor" /> Promote</button>)}
                            {/* 🚨 EDIT BUTTON */}
                            <button onClick={() => openEditModal(room)} className="text-[11px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 flex items-center gap-1 transition-colors hover:bg-blue-100"><Edit3 size={14}/> Edit</button>
                            <button onClick={() => deleteRoom(room._id)} className="text-[11px] font-black text-red-600 bg-red-50 p-1.5 px-3 rounded-lg active:scale-95 flex items-center gap-1 transition-colors hover:bg-red-100"><Trash2 size={14}/> Delete</button>
                          </div>
                        </div>
                    </div>
                );
            })}
        </div>
        )}
      </div>

      {/* Logout ab Settings panel me hai (upar gear button) */}

      {/* 🔄 RENEW MODAL (expired promo → payment → admin verify) */}
      {renewRoom && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[30px] sm:rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setRenewRoom(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full active:scale-90"><X size={20}/></button>
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">{renewRoom && renewRoom.promoPlan !== 'regular' ? (<><RefreshCw size={20} /> Renew Promo</>) : (<><Star size={20} className="text-orange-500" fill="currentColor" /> Promote Ad</>)}</h2>
            <p className="text-xs font-bold text-gray-500 mb-4 line-clamp-1">{renewRoom.title}</p>
            <div className="flex gap-2 mb-4">
              {['7', '15', '30'].map(d => (
                <button key={d} onClick={() => setRenewPlan(d)} className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-colors ${renewPlan === d ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-transparent text-gray-500'}`}>{d} Days<br /><span className="text-lg">₹{renewPrice(d)}</span></button>
              ))}
            </div>
            <a href={`upi://pay?pa=${renewUpiId}&pn=RoomKhojo&am=${renewPrice(renewPlan)}&cu=INR&tn=Renew: ${renewRoom.paymentCode}`} className="w-full bg-brand text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 mb-3 shadow-lg active:scale-95">Pay ₹{renewPrice(renewPlan)} via UPI App</a>
            <input type="text" value={renewRef} onChange={(e) => setRenewRef(e.target.value)} placeholder="UPI Ref / UTR No. (payment ke baad milta hai)" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border mb-3" />
            <button onClick={submitRenew} disabled={isSubmitting} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black active:scale-95">{isSubmitting ? 'Bhej rahe hain...' : 'I have paid — Send for Verification'}</button>
          </div>
        </div>
      )}

      {/* ⚙️ SETTINGS PANEL (profile + password + logout) */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[30px] sm:rounded-3xl flex flex-col max-h-[85dvh] shadow-2xl relative">
            <div className="p-5 border-b shrink-0 flex justify-between items-center sticky top-0 bg-white rounded-t-[30px] sm:rounded-t-3xl z-10">
              <h2 className="text-xl font-black flex items-center gap-2"><Settings size={20} /> Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="bg-gray-100 p-2 rounded-full active:scale-90"><X size={20}/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border">
                {currentUser?.pic ? (<img src={currentUser.pic} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow shrink-0" />) : (<div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center text-brand shrink-0"><User size={28}/></div>)}
                <div className="min-w-0"><p className="font-black text-gray-800 truncate">{currentUser?.name || 'User'}</p><p className="text-xs font-bold text-gray-500 truncate">{currentUser?.email || ''}</p></div>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 mb-2 uppercase">Display Name</p>
                <div className="flex gap-2"><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Apna naam" className="flex-1 p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" /><button onClick={saveProfileName} className="bg-slate-900 text-white px-4 rounded-xl font-black text-sm active:scale-95">Save</button></div>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 mb-2 uppercase">Password Badlo</p>
                <div className="space-y-2"><input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="Puraana password" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" /><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Naya password (min 6)" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" /><button onClick={saveNewPassword} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm active:scale-95">Update Password</button></div>
                <p className="text-[11px] font-bold text-gray-400 mt-2">Google se login karte ho? Toh password hai hi nahi — seedha logout/login karo.</p>
              </div>
            </div>
            <div className="p-4 border-t bg-white sticky bottom-0 z-10 shrink-0">
              <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95"><LogOut size={20}/> Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ❤️ SAVED ADS */}
      {savedRooms.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Heart size={20} className="text-pink-500" fill="currentColor" /> Saved Ads</h2>
            <span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-xs font-black">{savedRooms.length} Total</span>
          </div>
          <div className="grid gap-3 pb-10">
            {savedRooms.map(room => (
              <div key={room._id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-pink-100 p-3 flex gap-3 items-center">
                <img src={getImageUrl(room.image)} className="w-16 h-16 rounded-xl object-cover bg-gray-200 shrink-0" alt="Room" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-800 leading-tight truncate">{room.title}</h3>
                  <p className="text-brand font-black text-sm">{room.price}</p>
                  <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {room.landmark || 'Hanumangarh'}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a href={`tel:${room.mobile}`} className="bg-brand text-white p-2 rounded-xl flex items-center justify-center active:scale-95"><Phone size={16}/></a>
                  <button onClick={() => unsaveRoom(room._id)} className="bg-red-50 text-red-600 p-2 rounded-xl flex items-center justify-center active:scale-95"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚨 EDIT MODAL (Safe Mode) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[30px] sm:rounded-3xl flex flex-col h-[85dvh] sm:h-auto sm:max-h-[85dvh] shadow-2xl relative animate-slide-up">
            <div className="p-5 border-b shrink-0 flex justify-between items-center sticky top-0 bg-white rounded-t-[30px] sm:rounded-t-3xl z-10">
              <h2 className="text-xl font-black">Edit Your Ad</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="bg-gray-100 p-2 rounded-full active:scale-90"><X size={20}/></button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl flex gap-2 items-start text-xs font-bold">
                <ShieldAlert size={16} className="shrink-0 mt-0.5"/>
                <p>Edit save karne par aapka Ad "Pending" mode mein chala jayega aur verification ke baad dobara live hoga.</p>
              </div>

              <div>
                {(editKeep.length + editNew.length) > 0 && (<div className="grid grid-cols-3 gap-2 mb-2">
                  {editKeep.map((u, i) => (<div key={`k-${i}`} className="relative"><img src={getImageUrl(u)} className="w-full h-20 rounded-xl object-cover border border-gray-200" alt={`Photo ${i + 1}`} /><button type="button" onClick={() => setEditKeep(prev => prev.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-black flex items-center justify-center shadow">✕</button></div>))}
                  {editNew.map((p, i) => (<div key={`n-${i}`} className="relative"><img src={p.url} className="w-full h-20 rounded-xl object-cover border border-blue-200" alt="New photo" /><button type="button" onClick={() => { URL.revokeObjectURL(p.url); setEditNew(prev => prev.filter((_, j) => j !== i)); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-black flex items-center justify-center shadow">✕</button></div>))}
                </div>)}
                <label className="bg-brand/5 h-16 rounded-xl border-2 border-dashed border-brand/30 flex items-center justify-center gap-2 text-brand cursor-pointer"><Camera size={20}/><span className="font-bold text-[10px]">{(editKeep.length + editNew.length) > 0 ? `${editKeep.length + editNew.length}/6 Photos (tap to add)` : 'Tap to add Photos (max 6)'}</span><input type="file" className="hidden" multiple accept="image/*" onChange={addEditPhotos} /></label>
              </div>
              
              <div className="space-y-3">
                <div><label className="text-xs font-bold text-gray-500 ml-1">Title</label><input type="text" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" /></div>
                <div className="flex gap-3">
                  <div className="flex-1"><label className="text-xs font-bold text-gray-500 ml-1">Rent (₹)</label><input type="number" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border"/></div>
                  <div className="flex-1"><label className="text-xs font-bold text-gray-500 ml-1">Mobile No.</label><input type="number" value={editForm.mobile} onChange={(e) => setEditForm({...editForm, mobile: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border"/></div>
                </div>
                <div><label className="text-xs font-bold text-gray-500 ml-1">Landmark</label><input type="text" value={editForm.landmark} onChange={(e) => setEditForm({...editForm, landmark: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" /></div>
              </div>

              <div>
                <p className="text-xs font-black text-gray-500 mb-2 uppercase">Update Facilities</p>
                <div className="flex flex-wrap gap-2">
                  {(sysSettings.facilities || []).map(fac => (
                    <button type="button" key={fac} onClick={() => setEditForm({...editForm, description: editForm.description.includes(fac) ? editForm.description.filter(f => f !== fac) : [...editForm.description, fac]})} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${editForm.description.includes(fac) ? 'bg-brand text-white border-brand shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {fac}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white sticky bottom-0 z-10 shrink-0">
              <button onClick={submitEdit} disabled={isSubmitting} className="w-full bg-brand text-white py-4 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                {isSubmitting ? 'Saving Changes...' : 'Save & Send for Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
