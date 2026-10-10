import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Send } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://roomkhojo-api.onrender.com').replace('/api', '');
const CATEGORIES = ['Payment Issue', 'Ad Approval', 'Account & Login', 'Report Fake Ad', 'Other'];

const authHeaders = () => {
  const token = localStorage.getItem('roomkhojo_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Support() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [chatId, setChatId] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [pendingTickets, setPendingTickets] = useState([]);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatId, tickets]);

  const fetchTickets = () => {
    fetch(`${API_BASE}/api/support/mine`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setTickets(data.tickets || []); })
      .catch(() => {});
  };

  useEffect(() => {
    if (!localStorage.getItem('roomkhojo_user')) { navigate('/'); return; }
    fetchTickets();
  }, [navigate]);

  const pickPhoto = (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(f);
    setPhotoUrl(URL.createObjectURL(f));
    e.target.value = '';
  };

  // Optimistic send: button dabate hi list me dikho, upload background me.
  // Fail ho toh card par Retry (data state me safe rehta hai).
  const submitTicket = async (retry) => {
    const cat = retry ? retry.category : category;
    const msg = retry ? retry.message : message.trim();
    const file = retry ? retry.photoFile : photo;
    if (!retry && msg.length < 5) return alert('Apni dikkat thode detail me likho (min 5 letters).');
    const tempId = retry ? retry.tempId : `tmp-${Date.now()}`;
    const previewUrl = retry ? retry.photoUrl : (photoUrl || (file ? URL.createObjectURL(file) : ''));
    if (!retry) {
      setPendingTickets(prev => [...prev, { tempId, category: cat, message: msg, photoFile: file || null, photoUrl: previewUrl, failed: false }]);
      setMessage(''); setPhoto(null); setPhotoUrl('');
    } else {
      setPendingTickets(prev => prev.map(p => p.tempId === tempId ? { ...p, failed: false } : p));
    }
    try {
      const fd = new FormData();
      fd.append('category', cat);
      fd.append('message', msg);
      if (file) fd.append('images', file);
      const res = await fetch(`${API_BASE}/api/support`, { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json();
      if (data.success) {
        if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ } }
        setPendingTickets(prev => prev.filter(p => p.tempId !== tempId));
        fetchTickets();
      } else {
        alert(data.message);
        setPendingTickets(prev => prev.map(p => p.tempId === tempId ? { ...p, failed: true } : p));
      }
    } catch {
      setPendingTickets(prev => prev.map(p => p.tempId === tempId ? { ...p, failed: true } : p));
      alert('Net slow/fail — complaint saved hai, Retry dabao.');
    }
  };

  const sendReply = async (ticketId) => {
    const text = (replyText[ticketId] || '').trim();
    if (!text) return alert('Jawab likho pehle.');
    try {
      const res = await fetch(`${API_BASE}/api/support/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        setReplyText(prev => ({ ...prev, [ticketId]: '' }));
        fetchTickets();
      } else alert(data.message);
    } catch { alert('Server connection failed.'); }
  };

  const chatTicket = chatId ? tickets.find(x => x._id === chatId) || null : null;

  const statusStyle = (s) => s === 'open'
    ? 'bg-orange-100 text-orange-700'
    : s === 'replied' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 font-sans pb-10">
      <header className="bg-white px-4 py-3 flex items-center gap-3 border-b sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-600 active:scale-95"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-black text-gray-800">Support</h1>
      </header>

      {/* 💬 FULL-SCREEN CHAT */}
      {chatTicket && (
        <div className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col font-sans">
          <header className="bg-white px-3 py-3 flex items-center gap-2 border-b shrink-0">
            <button onClick={() => setChatId(null)} className="p-2 -ml-1 text-gray-600 active:scale-95"><ArrowLeft size={22} /></button>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-800 leading-tight truncate">{chatTicket.category}</p>
              <p className="text-[11px] font-bold text-gray-400">{chatTicket.status === 'open' ? 'Khula hai' : chatTicket.status === 'replied' ? 'Jawab aaya' : 'Band'}</p>
            </div>
            <button onClick={fetchTickets} className="px-3 py-2 bg-gray-100 rounded-full active:scale-90 text-gray-600 font-black text-xs">Refresh</button>
          </header>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="bg-white p-3 rounded-2xl rounded-tl-md shadow-sm border border-gray-100 max-w-[92%]">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Aapki complaint</p>
              <p className="text-sm font-bold text-gray-800">{chatTicket.message}</p>
              {chatTicket.image && <img src={chatTicket.image} className="w-full max-h-56 rounded-xl object-cover border border-gray-200 mt-2" alt="Proof" />}
            </div>
            {(chatTicket.replies || []).map((r, i) => (
              <div key={i} className={`p-3 rounded-2xl text-sm font-bold max-w-[88%] shadow-sm ${r.by === 'admin' ? 'bg-white border border-blue-100 text-blue-900 rounded-tl-md' : 'bg-brand text-white rounded-tr-md ml-auto'}`}>
                <p className="text-[10px] uppercase opacity-60 mb-0.5 font-black">{r.by === 'admin' ? 'RoomKhojo Team' : 'Aap'}</p>
                {r.text}
              </div>
            ))}
          </div>
          {chatTicket.status !== 'closed' ? (
            <div className="p-3 bg-white border-t flex gap-2 shrink-0">
              <input type="text" value={replyText[chatTicket._id] || ''} onChange={(e) => setReplyText(prev => ({ ...prev, [chatTicket._id]: e.target.value }))} placeholder="Jawab likho…" className="flex-1 p-3 bg-gray-50 rounded-2xl outline-none font-bold text-sm border" />
              <button onClick={() => sendReply(chatTicket._id)} className="bg-brand text-white w-12 rounded-2xl flex items-center justify-center active:scale-95"><Send size={18} /></button>
            </div>
          ) : (
            <p className="p-4 text-center text-xs font-bold text-gray-400 bg-white border-t">Ye ticket band ho chuka hai.</p>
          )}
        </div>
      )}

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Nayi complaint */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-800 mb-3">Nayi Complaint</h2>
          <label className="text-xs font-black text-gray-500 uppercase">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border mt-1 mb-3">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="text-xs font-black text-gray-500 uppercase">Dikkat likho</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Kya problem aa rahi hai? Detail me likho…" rows={4} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border mt-1 mb-3" />
          <div className="mb-4">
            {photoUrl && (
              <div className="relative w-32 mb-2">
                <img src={photoUrl} className="w-32 h-24 rounded-xl object-cover border border-gray-200" alt="Complaint proof" />
                <button onClick={() => { URL.revokeObjectURL(photoUrl); setPhoto(null); setPhotoUrl(''); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-black flex items-center justify-center shadow">✕</button>
              </div>
            )}
            <label className="bg-brand/5 h-16 rounded-xl border-2 border-dashed border-brand/30 flex items-center justify-center gap-2 text-brand cursor-pointer font-bold text-xs">
              <Camera size={20} /> {photo ? 'Photo badlo (optional)' : 'Photo lagao — dikkat wali screenshot (optional)'}
              <input type="file" className="hidden" accept="image/*" onChange={pickPhoto} />
            </label>
          </div>
          <button onClick={() => submitTicket()} className="w-full bg-brand text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 flex items-center justify-center gap-2">
            <Send size={18} /> Complaint Bhejo
          </button>
        </div>

        {/* Meri complaints */}
        {/* Bhej rahe / fail pending cards (optimistic) */}
        {pendingTickets.map(p => (
          <div key={p.tempId} className="bg-white rounded-3xl p-4 shadow-sm border border-dashed border-brand/40">
            <div className="flex justify-between items-center gap-2 mb-1">
              <span className="text-[10px] font-black px-2 py-1 rounded-lg uppercase bg-brand/10 text-brand">{p.category}</span>
              {p.failed
                ? <button onClick={() => submitTicket(p)} className="text-xs font-black text-white bg-red-500 px-3 py-1.5 rounded-lg active:scale-95">Retry</button>
                : <span className="text-[11px] font-black text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-brand border-t-transparent animate-spin" /> Bhej rahe hain…</span>}
            </div>
            <p className="text-sm font-bold text-gray-700">{p.message}</p>
            {p.failed && <p className="text-[11px] font-bold text-red-500 mt-1">Fail ho gaya — Retry dabao, text safe hai.</p>}
          </div>
        ))}

        <h2 className="font-black text-gray-800 px-1">Meri Complaints ({tickets.length})</h2>
        {tickets.length === 0 && (
          <p className="text-center text-gray-400 font-bold bg-white rounded-3xl p-8 border border-gray-100">Abhi koi complaint nahi hai.</p>
        )}
        {tickets.map(t => (
          <div key={t._id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start gap-2 mb-2">
              <div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${statusStyle(t.status)}`}>
                  {t.status === 'open' ? 'Khula' : t.status === 'replied' ? 'Jawab aaya' : 'Band'}
                </span>
                <p className="text-[11px] font-bold text-gray-400 mt-1">{t.category}</p>
              </div>
              <button onClick={() => setChatId(t._id)} className="text-xs font-black text-white bg-brand px-3 py-1.5 rounded-lg shrink-0 active:scale-95">Chat kholo</button>
            </div>
            <p className="text-sm font-bold text-gray-700">{t.message}</p>
            {t.image && <img src={t.image} className="w-32 h-24 rounded-xl object-cover border border-gray-200 mt-2" alt="Proof" />}
          </div>
        ))}
      </div>
    </div>
  );
}
