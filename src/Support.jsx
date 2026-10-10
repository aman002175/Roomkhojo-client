import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Send } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://roomkhojo-api.onrender.com';
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
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [openId, setOpenId] = useState(null);

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

  const submitTicket = async () => {
    if (message.trim().length < 5) return alert('Apni dikkat thode detail me likho (min 5 letters).');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('message', message.trim());
      if (photo) fd.append('images', photo);
      const res = await fetch(`${API_BASE}/api/support`, { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setMessage(''); setPhoto(null);
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        setPhotoUrl('');
        fetchTickets();
      }
    } catch { alert('Server connection failed.'); }
    setSending(false);
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

  const statusStyle = (s) => s === 'open'
    ? 'bg-orange-100 text-orange-700'
    : s === 'replied' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 font-sans pb-10">
      <header className="bg-white px-4 py-3 flex items-center gap-3 border-b sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-600 active:scale-95"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-black text-gray-800">Support</h1>
      </header>

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
          <button onClick={submitTicket} disabled={sending} className="w-full bg-brand text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 flex items-center justify-center gap-2">
            <Send size={18} /> {sending ? 'Bhej rahe hain…' : 'Complaint Bhejo'}
          </button>
        </div>

        {/* Meri complaints */}
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
              <button onClick={() => setOpenId(openId === t._id ? null : t._id)} className="text-xs font-black text-brand underline shrink-0">
                {openId === t._id ? 'Band karo' : 'Dekho / Jawab do'}
              </button>
            </div>
            <p className="text-sm font-bold text-gray-700">{t.message}</p>
            {t.image && <img src={t.image} className="w-32 h-24 rounded-xl object-cover border border-gray-200 mt-2" alt="Proof" />}
            {openId === t._id && (
              <div className="mt-3 pt-3 border-t space-y-2">
                {(t.replies || []).map((r, i) => (
                  <div key={i} className={`p-2.5 rounded-xl text-xs font-bold max-w-[90%] ${r.by === 'admin' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'bg-gray-100 text-gray-700 ml-auto'}`}>
                    <p className="text-[10px] uppercase opacity-60 mb-0.5">{r.by === 'admin' ? 'RoomKhojo Team' : 'Aap'}</p>
                    {r.text}
                  </div>
                ))}
                {t.status !== 'closed' ? (
                  <div className="flex gap-2">
                    <input type="text" value={replyText[t._id] || ''} onChange={(e) => setReplyText(prev => ({ ...prev, [t._id]: e.target.value }))} placeholder="Jawab likho…" className="flex-1 p-2.5 bg-gray-50 rounded-xl outline-none font-bold text-sm border" />
                    <button onClick={() => sendReply(t._id)} className="bg-brand text-white px-4 rounded-xl active:scale-95"><Send size={16} /></button>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-gray-400">Ye ticket band ho chuka hai.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
