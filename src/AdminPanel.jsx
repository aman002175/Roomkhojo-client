import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, Check, X, Settings, Lock, ShieldAlert, Save, Plus, BarChart3, Clock, MessageCircle, Smartphone } from 'lucide-react';

const BASE_URL = `https://roomkhojo-api.onrender.com`;
const API_URL = `${BASE_URL}/api/rooms`;
const ADMIN_API = `${BASE_URL}/api/admin`;
const getImageUrl = (path) => !path ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80' : path.startsWith('http') ? path : `${BASE_URL}${path}`;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [adminRooms, setAdminRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('analytics');
  
  const [showCatModal, setShowCatModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [sysCategories, setSysCategories] = useState([]);
  const [sysPricing, setSysPricing] = useState({ regular: '0', promo7: '299', promo15: '499', promo30: '899', upiId: '' });

  useEffect(() => { 
    if (isAuthenticated) { fetchAdminRooms(); fetchSystemSettings(); } 
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginUser.trim(), password: loginPass.trim() }) });
      const data = await res.json();
      if (data.success) setIsAuthenticated(true); else alert(data.message);
    } catch (e) { alert("Server Error."); }
  };

  const handleChangeCredentials = async () => {
    if (!oldPass) return alert("Old Password zaroori hai!");
    if (!newAdminUser && !newAdminPass) return alert("New credentials daliye!");
    if (!window.confirm("⚠️ WARNING: Kya aap sach mein Admin Username/Password change karna chahte hain?")) return;
    try {
      const res = await fetch(`${ADMIN_API}/change-credentials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: oldPass, newUsername: newAdminUser, newPassword: newAdminPass }) });
      const data = await res.json(); alert(data.message);
      if(data.success) { setOldPass(''); setNewAdminUser(''); setNewAdminPass(''); if(newAdminPass) setIsAuthenticated(false); }
    } catch (e) { alert("Error."); }
  };

  const fetchAdminRooms = async () => { 
    try { const res = await fetch(`${API_URL}/admin/all`, { headers: { 'x-admin-secret': 'my-secret-key' } }); const data = await res.json(); if (data.success) setAdminRooms(data.rooms); } catch (e) {} 
  };

  const fetchSystemSettings = async () => { 
    try { const res = await fetch(`${ADMIN_API}/settings`); const data = await res.json(); if (data.success && data.settings) { setSysCategories(data.settings.categories || []); setSysPricing(data.settings.pricing || { regular: '0', promo7: '299', promo15: '499', promo30: '899', upiId: '' }); } } catch (e) {} 
  };

  // 🚨 SMART ERROR TRACKER (Ise Update Kiya Hai)
  const saveSystemSettings = async (updatedCategories, updatedPricing) => {
    try {
      // Yahan maine seedha aapka live link daal diya hai!
      const res = await fetch("https://roomkhojo-api.onrender.com/api/admin/settings", { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ categories: updatedCategories || sysCategories, pricing: updatedPricing || sysPricing }) 
      });
      
      const textData = await res.text(); 
      try {
          const data = JSON.parse(textData);
          if (data.success) {
              alert("✅ Settings & UPI ID Successfully Saved!");
          } else {
              alert("❌ Backend Error: " + data.message);
          }
      } catch(parseErr) {
          alert("❌ Server Error/Crash! Backend terminal check karein. Response: " + textData.substring(0, 100));
      }
    } catch (e) { 
      alert("❌ Connection Error: Backend server band ho gaya hai. Apna Termux check karein."); 
    }
  };

  const handleAddCategory = () => {
    if(!newCategoryName.trim()) return;
    const updated = [...(sysCategories || []), newCategoryName.trim()];
    setSysCategories(updated);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (catToRemove) => {
    const updated = (sysCategories || []).filter(cat => cat !== catToRemove);
    setSysCategories(updated);
  };

  const handleApprove = async (id) => { try { await fetch(`${API_URL}/${id}/approve`, { method: 'PATCH' }); fetchAdminRooms(); } catch (e) {} };
  const handleDelete = async (id) => { if (!window.confirm("⚠️ Room delete karna hai? Ye action wapas nahi hoga.")) return; try { await fetch(`${API_URL}/${id}`, { method: 'DELETE' }); fetchAdminRooms(); } catch (e) {} };

  const getDaysLeft = (expiryDate, plan) => {
    if (plan === 'regular' || !plan) return <span className="text-gray-500">Lifetime</span>;
    if (!expiryDate) return <span className="text-blue-500 font-bold">Pending</span>;
    const diff = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? <span className="text-green-600 font-bold">{diff} Days</span> : <span className="text-red-500 font-bold">Expired</span>;
  };

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] w-full bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><ShieldAlert size={32}/></div>
          <h1 className="text-2xl font-black text-center mb-2">Admin Portal</h1>
          <div className="space-y-4 mb-8 mt-6">
            <input type="text" value={loginUser} onChange={(e)=>setLoginUser(e.target.value)} placeholder="Admin Username" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold border" />
            <input type="password" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} placeholder="Password" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold border" />
          </div>
          <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex justify-center items-center gap-2 active:scale-95"><Lock size={18} className="shrink-0"/> Unlock</button>
        </div>
      </div>
    );
  }

  const pendingAds = adminRooms.filter(r => !r.isApproved);
  const liveAds = adminRooms.filter(r => r.isApproved);
  const promotedCount = adminRooms.filter(r => r.isPromoted).length;
  const estRevenue = ((adminRooms.length - promotedCount) * Number(sysPricing.regular || 0)) + (promotedCount * Number(sysPricing.promo7 || 299));
  const uniqueUsersCount = new Set(adminRooms.filter(r => r.userId && r.userId !== 'unknown_user').map(r => r.userId)).size;

  return (
    <div className="h-[100dvh] w-full bg-gray-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center"><User size={20} className="shrink-0"/></div>
          <div><h1 className="font-black text-lg leading-tight">Admin Console</h1></div>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="bg-white/10 p-2 rounded-lg text-sm font-bold flex items-center gap-2 active:scale-95"><LogOut size={16} className="shrink-0"/> Logout</button>
      </header>
      
      {/* Tabs */}
      <div className="flex px-4 py-3 gap-2 overflow-x-auto no-scrollbar bg-white shadow-sm border-b shrink-0">
        <button onClick={() => setActiveTab('analytics')} className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'analytics' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600'}`}><BarChart3 size={16} className="shrink-0"/> Analytics</button>
        <button onClick={() => setActiveTab('pending')} className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600'}`}><LayoutDashboard size={16} className="shrink-0"/> Pending ({pendingAds.length})</button>
        <button onClick={() => setActiveTab('live')} className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600'}`}><Check size={16} className="shrink-0"/> Live ({liveAds.length})</button>
        <button onClick={() => setActiveTab('system')} className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'system' ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600'}`}><Settings size={16} className="shrink-0"/> System</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 pb-10">
            <div className="grid grid-cols-2 gap-3"><div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase">Registered Users</p><p className="text-2xl font-black text-gray-800">{uniqueUsersCount}</p></div><div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100"><p className="text-xs font-bold text-green-700 uppercase">Est. Revenue</p><p className="text-2xl font-black text-green-800">₹{estRevenue}</p></div><div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase">Total Ads</p><p className="text-2xl font-black text-gray-800">{adminRooms.length}</p></div><div className="bg-orange-50 p-4 rounded-2xl shadow-sm border border-orange-100"><p className="text-xs font-bold text-orange-700 uppercase">Promo Ads</p><p className="text-2xl font-black text-orange-800">{promotedCount}</p></div></div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-4"><div className="p-4 border-b bg-gray-50"><h3 className="font-black text-gray-800 flex items-center gap-2"><Clock size={18}/> Users & Ad Status Report</h3></div><div className="p-0 overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b"><tr><th className="p-3">User/Owner</th><th className="p-3">Ad Title</th><th className="p-3 text-brand">Pay Code</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{adminRooms.map(room => (<tr key={room._id} className="hover:bg-gray-50"><td className="p-3 font-bold text-gray-800"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-brand/10 text-brand rounded-full flex justify-center items-center text-[10px] shrink-0"><User size={12}/></div>{room.ownerName || 'Owner'}</div></td><td className="p-3 text-gray-600 line-clamp-1 max-w-[150px]">{room.title}</td><td className="p-3 font-black text-brand bg-brand/5 border-x">{room.paymentCode || 'FREE'}</td><td className="p-3">{room.isPromoted ? <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Promo {room.promoPlan}D</span> : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Regular</span>}</td><td className="p-3">{getDaysLeft(room.expiryDate, room.promoPlan)}</td><td className="p-3"><a href={`https://wa.me/91${room.mobile}?text=${encodeURIComponent(`Namaste ${room.ownerName || 'Owner'}!\nRoomKhojo par aapka Ad ("${room.title}") jald hi expire hone wala hai.`)}`} target="_blank" rel="noreferrer" className="bg-[#25D366]/10 text-[#25D366] px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-transform w-fit"><MessageCircle size={14}/> Alert</a></td></tr>))}</tbody></table></div></div>
          </div>
        )}

        {/* Pending & Live Tabs */}
        {activeTab === 'pending' && (pendingAds.map(room => (<div key={room._id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-200 flex flex-col gap-3"><div className="flex gap-3"><img src={getImageUrl(room.image)} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" /><div><h4 className="font-black text-gray-800 leading-tight">{room.title}</h4><p className="text-gray-500 text-xs font-bold mt-1">👤 {room.ownerName || 'Owner'} • Code: <span className="text-orange-600">{room.paymentCode}</span></p></div></div><div className="flex gap-2"><button onClick={() => handleApprove(room._id)} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-black flex items-center justify-center gap-1"><Check size={16}/> Verify Payment & Approve</button><button onClick={() => handleDelete(room._id)} className="w-12 bg-red-50 text-red-600 flex items-center justify-center rounded-lg"><X size={18}/></button></div></div>)))}
        {activeTab === 'live' && (liveAds.map(room => (<div key={room._id} className="bg-white p-4 rounded-2xl shadow-sm border border-green-200 flex justify-between items-center"><div className="flex gap-3 items-center"><img src={getImageUrl(room.image)} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" /><div><h4 className="font-bold text-gray-800">{room.title}</h4><p className="text-xs text-gray-500">👤 {room.ownerName}</p></div></div><button onClick={() => handleDelete(room._id)} className="bg-red-50 p-2 text-red-600 rounded-lg"><X size={16}/></button></div>)))}

        {/* System Tab */}
        {activeTab === 'system' && (
           <div className="space-y-4 pb-10">
             
             {/* UPI Card */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand/20">
               <h3 className="font-black text-brand mb-2 flex items-center gap-2"><Smartphone size={18}/> Admin UPI Details</h3>
               <p className="text-xs text-gray-500 mb-4 font-bold">Payments receive karne ke liye apni asli UPI ID daalein.</p>
               <input type="text" value={sysPricing.upiId || ''} onChange={e=>setSysPricing({...sysPricing, upiId: e.target.value})} placeholder="e.g. 9145891108@ybl" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-brand mb-3" />
               <button onClick={() => { if(window.confirm("💳 Kya aap sach mein UPI ID update karna chahte hain? Sabhi payments ab is naye UPI par aayengi.")) { saveSystemSettings(sysCategories, sysPricing); } }} className="bg-brand text-white font-black py-3 px-4 rounded-xl text-sm w-full active:scale-95 transition-transform">Save UPI ID</button>
             </div>

             {/* Security Card */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
               <h3 className="font-black text-red-600 mb-2 flex items-center gap-2"><Lock size={18}/> Security Settings</h3>
               <p className="text-xs text-gray-500 mb-4 font-bold">Admin Panel ka Username aur Password change karein.</p>
               <div className="space-y-3 mb-4">
                 <input type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} placeholder="Old Password (Required)" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-red-300" />
                 <input type="text" value={newAdminUser} onChange={e=>setNewAdminUser(e.target.value)} placeholder="New Username (Optional)" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-red-300" />
                 <input type="password" value={newAdminPass} onChange={e=>setNewAdminPass(e.target.value)} placeholder="New Password (Optional)" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-red-300" />
               </div>
               <button onClick={handleChangeCredentials} className="bg-red-600 text-white font-black py-3 px-4 rounded-xl text-sm w-full flex justify-center items-center gap-2 active:scale-95 transition-transform"><Save size={16}/> Update Security</button>
             </div>

             {/* Categories Card */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border">
               <h3 className="font-black text-gray-800 mb-2">Manage Categories</h3>
               <p className="text-xs text-gray-500 mb-4 font-bold">Add, remove or edit app categories.</p>
               <button onClick={() => setShowCatModal(true)} className="bg-brand/10 text-brand font-black py-3 px-4 rounded-xl text-sm w-full active:scale-95">Edit Categories List</button>
             </div>

             {/* Pricing Card */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border">
               <h3 className="font-black text-gray-800 mb-2">Customize Ad Plans</h3>
               <p className="text-xs text-gray-500 mb-4 font-bold">Change Regular and Promoted Ad pricing.</p>
               <button onClick={() => setShowPromoModal(true)} className="bg-orange-50 text-orange-600 font-black py-3 px-4 rounded-xl text-sm w-full active:scale-95">Edit Ad Pricing</button>
             </div>

           </div>
        )}
      </div>

      {/* CATEGORIES MODAL */}
      {showCatModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setShowCatModal(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full"><X size={16}/></button>
            <h2 className="text-xl font-black mb-4">Categories</h2>
            
            <div className="flex gap-2 mb-4">
              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New Category Name..." className="flex-1 p-3 bg-gray-50 rounded-xl font-bold border outline-none text-sm" />
              <button onClick={handleAddCategory} className="bg-brand text-white px-4 rounded-xl font-black"><Plus size={20}/></button>
            </div>
            
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
              {(sysCategories || []).map(cat => (
                <div key={cat} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl font-bold text-sm">
                  <span>{cat}</span>
                  <button onClick={() => handleRemoveCategory(cat)} className="text-red-500 active:scale-90"><X size={16}/></button>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-brand text-white py-3 rounded-xl font-black text-sm active:scale-95" onClick={() => { saveSystemSettings(sysCategories, sysPricing); setShowCatModal(false); }}>Save to Database</button>
          </div>
        </div>
      )}

      {/* PRICING MODAL */}
      {showPromoModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
             <button onClick={() => setShowPromoModal(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full"><X size={16}/></button>
             <h2 className="text-xl font-black mb-4">Ad Pricing</h2>
             <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
               <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                 <label className="text-xs font-black text-blue-700 uppercase">Regular Ad Fee (₹)</label>
                 <input type="number" value={sysPricing.regular} onChange={(e) => setSysPricing({...sysPricing, regular: e.target.value})} className="w-full p-2 bg-white rounded-lg font-bold border mt-1 outline-none" />
               </div>
               <div><label className="text-xs font-bold text-gray-500">7 Days Promo (₹)</label><input type="number" value={sysPricing.promo7} onChange={(e) => setSysPricing({...sysPricing, promo7: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border mt-1 outline-none" /></div>
               <div><label className="text-xs font-bold text-gray-500">15 Days Promo (₹)</label><input type="number" value={sysPricing.promo15} onChange={(e) => setSysPricing({...sysPricing, promo15: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border mt-1 outline-none" /></div>
               <div><label className="text-xs font-bold text-gray-500">30 Days Promo (₹)</label><input type="number" value={sysPricing.promo30} onChange={(e) => setSysPricing({...sysPricing, promo30: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border mt-1 outline-none" /></div>
             </div>
             <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-sm active:scale-95" onClick={() => { saveSystemSettings(sysCategories, sysPricing); setShowPromoModal(false); }}>Update Database</button>
          </div>
        </div>
      )}
    </div>
  );
}