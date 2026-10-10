import { Info, FileText, Shield, Link, Camera } from 'lucide-react';

export const legalData = {
  about: {
    title: "About Us",
    icon: <Info size={24} className="text-brand" />,
    content: (
      <div className="space-y-4">
        <p>Har saal hazaron students, professionals aur coaching aane wale log ek naye shehar mein aate hain, aur unki sabse badi pareshani hoti hai—ek sahi, safe aur budget-friendly room dhoondhna. Maine khud Hanumangarh mein is pareshani ko qareeb se dekha aur jhela hai.</p>
        <p>Mera maqsad room dhoondhne ke is thaka dene wale process ko ekdum transparent aur digital banana hai.</p>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="font-bold text-gray-900 text-lg">Developed by 29 Dev's</h3>
          <p className="mt-1 text-gray-600">Is platform ko design aur develop <strong>Aman Bishnoi</strong> ne kiya hai.</p>
          <div className="flex flex-col gap-3 mt-5">
            <a href="https://aman-bishnoi-wrold.oneapp.dev/#portfolio" target="_blank" rel="noreferrer" className="text-brand font-black flex items-center gap-2 bg-brand/5 p-3 rounded-xl active:scale-95 transition-transform">
              <Link size={18} className="shrink-0" /> aman-bishnoi-wrold.oneapp.dev
            </a>
            <a href="https://www.instagram.com/29.devs" target="_blank" rel="noreferrer" className="text-pink-600 font-black flex items-center gap-2 bg-pink-50 p-3 rounded-xl active:scale-95 transition-transform">
              <Camera size={18} className="shrink-0" /> Instagram: @29.devs
            </a>
          </div>
        </div>
      </div>
    )
  },
  terms: {
    title: "Terms & Conditions",
    icon: <FileText size={24} className="text-brand" />,
    content: "1. Ad Approval Process (Vigyapan Ki Pustikaran)\nPlatform ki quality aur security ke liye, koi bhi naya room ad turant live nahi hota. Har ad ko pehle RoomKhojo ki Admin team review karti hai.\n\n2. Platform Ki Zimmedari (Zero Liability Clause)\nRoomKhojo sirf ek 'Digital Bridge' hai. Dono parties (Owner aur Tenant) ke beech hone wali kisi bhi baat-cheet ya financial deal mein RoomKhojo ki koi zimmedari nahi hogi.\n\n3. Room Data Edit Rule\nFraud rokne ke liye, ek baar room publish hone ke baad owner uski mukhya details badal nahi sakte. Unhe ad delete karke naya post karna hoga."
  },
  refund: {
    title: "Refund Policy",
    icon: <Shield size={24} className="text-brand" />,
    content: "1. Strict No-Refund Policy\nRoomKhojo par Promotional Ads ya Listing Fees ke liye No-Refund policy laagoo hai. Payment successful hone ke baad refund nahi hoga.\n\n2. Early Rent-Out Scenario\nAgar aapka room plan khatam hone se pehle rent par chala jata hai, tab bhi bache huye din ke liye refund nahi diya jayega.\n\n3. Lifetime Access\nEk baar approve ho jane wala Regular Ad aapke dashboard mein hamesha rahega. Aap use Inactive kar sakte hain."
  }
};
