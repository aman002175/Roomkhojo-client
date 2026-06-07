import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, FileText, Shield, ExternalLink } from 'lucide-react';

// =============================================
// PAGE DATA
// =============================================
const pages = {
  about: {
    title: 'About Us',
    icon: <Info size={28} className="text-white" />,
    gradient: 'from-brand to-blue-600',
    emoji: '🏠',
    sections: [
      {
        heading: 'Hamari Kahani',
        body: 'Har saal hazaron students, professionals aur coaching aane wale log ek naye shehar mein aate hain, aur unki sabse badi pareshani hoti hai — ek sahi, safe aur budget-friendly room dhoondhna. Maine khud Hanumangarh mein is pareshani ko qareeb se dekha aur jhela hai.',
      },
      {
        heading: 'Hamara Maqsad',
        body: 'Room dhoondhne ke is thaka dene wale process ko ekdum transparent aur digital banana hai. RoomKhojo ek aisa platform hai jahan owners apne rooms asaani se list kar sakein aur seekhne wale asaani se sahi room khoj sakein.',
      },
      {
        heading: 'Kyun RoomKhojo?',
        body: '✅ Real listings — koi fake ads nahi\n✅ Map-based search — aas paas ke rooms dekho\n✅ Direct contact — koi middleman nahi\n✅ Free listing — owners ke liye bilkul muft',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    icon: <FileText size={28} className="text-white" />,
    gradient: 'from-purple-500 to-indigo-600',
    emoji: '📋',
    sections: [
      {
        heading: '1. Ad Approval Process',
        body: 'Platform ki quality aur security ke liye, koi bhi naya room ad turant live nahi hota. Har ad ko pehle RoomKhojo ki Admin team review karti hai. Approval mein 24-48 ghante lag sakte hain.',
      },
      {
        heading: '2. Platform Ki Zimmedari (Zero Liability)',
        body: "RoomKhojo sirf ek 'Digital Bridge' hai. Dono parties (Owner aur Tenant) ke beech hone wali kisi bhi baat-cheet ya financial deal mein RoomKhojo ki koi zimmedari nahi hogi. Kisi bhi deal se pehle sab kuch verify kar lein.",
      },
      {
        heading: '3. Room Data Edit Rule',
        body: 'Fraud rokne ke liye, ek baar room publish hone ke baad owner uski mukhya details (price, location) badal nahi sakte. Unhe ad delete karke naya post karna hoga.',
      },
      {
        heading: '4. Account Suspension',
        body: 'Agar koi user fake information, spam ya kisi bhi tarah ki illegal activity karta hai, toh admin uska account bina notice ke suspend kar sakta hai.',
      },
    ],
  },
  refund: {
    title: 'Refund Policy',
    icon: <Shield size={28} className="text-white" />,
    gradient: 'from-orange-500 to-red-500',
    emoji: '💰',
    sections: [
      {
        heading: '1. Strict No-Refund Policy',
        body: 'RoomKhojo par Promotional Ads ya Listing Fees ke liye No-Refund policy laagoo hai. Payment successful hone ke baad kisi bhi condition mein refund nahi hoga.',
      },
      {
        heading: '2. Early Rent-Out Scenario',
        body: 'Agar aapka room plan khatam hone se pehle rent par chala jata hai, tab bhi bache huye din ke liye refund nahi diya jayega. Aap apna ad "Inactive" kar sakte hain.',
      },
      {
        heading: '3. Lifetime Access',
        body: 'Ek baar approve ho jane wala Regular Ad aapke dashboard mein hamesha rahega. Aap use kabhi bhi Inactive ya Active kar sakte hain — koi time limit nahi.',
      },
      {
        heading: '4. Payment Dispute',
        body: 'Agar payment deduct ho gayi lekin confirmation nahi aayi, toh apna payment screenshot lekar admin se contact karein. Hum 48 ghante mein jawab denge.',
      },
    ],
  },
};

// =============================================
// MAIN COMPONENT
// =============================================
export default function LegalPage({ type }) {
  const navigate = useNavigate();
  const page = pages[type];

  if (!page) return null;

  return (
    <div className="h-[100dvh] w-full bg-gray-50 flex flex-col font-sans overflow-y-auto">

      {/* ── HEADER ── */}
      <div className={`bg-gradient-to-br ${page.gradient} px-4 pt-12 pb-10 relative overflow-hidden`}>
        {/* decorative blobs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />

        <button
          onClick={() => navigate(-1)}
          className="relative z-10 mb-6 flex items-center gap-2 text-white/80 font-bold text-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} /> Back
        </button>

        <div className={`relative z-10 w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4`}>
          {page.icon}
        </div>
        <h1 className="relative z-10 text-3xl font-black text-white leading-tight">
          {page.title}
        </h1>
        <p className="relative z-10 text-white/70 font-bold text-sm mt-1">
          RoomKhojo • Last updated: May 2025
        </p>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {page.sections.map((sec, i) => (
          <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-black text-gray-800 text-base mb-2">{sec.heading}</h2>
            <p className="text-gray-600 font-medium text-sm leading-relaxed whitespace-pre-line">
              {sec.body}
            </p>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <footer className="px-4 py-8 text-center">
        <div className="inline-flex flex-col items-center gap-1">
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">
            RoomKhojo
          </p>
          <a
            href="https://aman-bishnoi-wrold.oneapp.dev/#portfolio"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-black text-gray-500 hover:text-brand transition-colors active:scale-95"
          >
            Built with 💝 by Aman Bishnoi
            <ExternalLink size={13} className="opacity-60" />
          </a>
          <p className="text-gray-300 text-xs font-bold mt-1">© 2025 29 Dev's. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
