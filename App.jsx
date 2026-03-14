import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  increment,
  arrayUnion,
  query,
  addDoc,
  getDocs
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  Users, 
  Camera, 
  LogOut, 
  Star, 
  Sun, 
  UserCheck, 
  CheckCircle, 
  ChevronLeft,
  AlertCircle,
  X,
  User,
  Plus,
  Edit2,
  Save,
  Download,
  GraduationCap,
  FileSpreadsheet
} from 'lucide-react';

// --- KONFIGURASI ADMIN ---
const ADMIN_CREDENTIALS = {
  username: "guruSM",
  password: "berkat2024"
};

// --- PENGATURAN KELAS & PENDIDIKAN ---
const CLASSES = [
  { id: 'bintang', name: 'Kelas Bintang', icon: <Star className="w-5 h-5" />, color: 'bg-yellow-500', lightColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { id: 'cahaya', name: 'Kelas Cahaya', icon: <Sun className="w-5 h-5" />, color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700' },
  { id: 'pra-remaja', name: 'Kelas Pra Remaja', icon: <Users className="w-5 h-5" />, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-700' }
];

const EDUCATION_LEVELS = [
  "Belum Sekolah",
  "SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6",
  "SMP Kelas 1", "SMP Kelas 2", "SMP Kelas 3"
];

// --- DATA AWAL (SEED DATA) SESUAI REQUEST ---
const INITIAL_STUDENTS = [
  { 
    name: "Eldo Desenta Purba", 
    ttl: "Lahir: 2015", 
    usia: 9, 
    pendidikan: "SD Kelas 3", 
    classId: "cahaya", 
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eldo9" 
  },
  { 
    name: "Fahlepta Surbakti", 
    ttl: "Lahir: 2015", 
    usia: 9, 
    pendidikan: "SD Kelas 3", 
    classId: "cahaya", 
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fahlepta" 
  },
  { 
    name: "Ilona Siahaan", 
    ttl: "1 Maret 2024", 
    usia: 1, 
    pendidikan: "Belum Sekolah", 
    classId: "bintang", 
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ilona" 
  },
  { 
    name: "Eldo Desenta Purba (Senior)", 
    ttl: "Lahir: 2013", 
    usia: 11, 
    pendidikan: "SMP Kelas 1", 
    classId: "pra-remaja", 
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eldo11" 
  }
];

// --- INISIALISASI FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'e-absensi-sm-v2';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); 
  const [selectedClass, setSelectedClass] = useState(null);
  const [allStudents, setAllStudents] = useState({});
  const [scanningStudent, setScanningStudent] = useState(null);
  const [scanStatus, setScanStatus] = useState(null); 
  const [showNotification, setShowNotification] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({ name: '', ttl: '', usia: '', pendidikan: 'Belum Sekolah', classId: 'bintang' });
  const [loginState, setLoginState] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const videoRef = useRef(null);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const initScripts = async () => {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');
    };
    initScripts();
  }, []);

  useEffect(() => {
    const initAuthAndData = async () => {
      try {
        let currentUser;
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          const cred = await signInWithCustomToken(auth, __initial_auth_token);
          currentUser = cred.user;
        } else {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        }

        if (currentUser) {
          for (const student of INITIAL_STUDENTS) {
            const colRef = collection(db, 'artifacts', appId, 'public', 'data', `students_${student.classId}`);
            const snapshot = await getDocs(colRef);
            const exists = snapshot.docs.some(doc => doc.data().name === student.name);
            
            if (!exists) {
              await addDoc(colRef, { ...student, attendanceCount: 0, history: [] });
            }
          }
        }
      } catch (err) {
        console.error("Auth/Seed Error:", err);
      }
    };
    initAuthAndData();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribes = CLASSES.map(cls => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', `students_${cls.id}`));
      return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllStudents(prev => ({ ...prev, [cls.id]: docs }));
      }, (err) => console.error(err));
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // Fungsi Ekspor ke format CSV (Bisa dibuka di Google Sheets/Excel)
  const exportToCSV = (classId, className) => {
    const students = allStudents[classId] || [];
    if (students.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No,Nama Lengkap,Usia,Pendidikan,TTL,Total Kehadiran\n";

    students.forEach((s, i) => {
      const row = [
        i + 1,
        `"${s.name}"`,
        s.usia,
        `"${s.pendidikan}"`,
        `"${s.ttl}"`,
        s.attendanceCount
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekapan_Sheets_${className.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogin = () => {
    if (loginState.username === ADMIN_CREDENTIALS.username && loginState.password === ADMIN_CREDENTIALS.password) {
      setLoginError('');
      setActiveTab('dashboard');
    } else {
      setLoginError('Username atau Password salah!');
    }
  };

  const handleSaveStudent = async () => {
    if (!formData.name || !formData.usia || !user) return;
    try {
      const payload = {
        name: formData.name,
        ttl: formData.ttl,
        usia: parseInt(formData.usia),
        pendidikan: formData.pendidikan,
        classId: formData.classId
      };

      if (editingStudent) {
        const studentDocRef = doc(db, 'artifacts', appId, 'public', 'data', `students_${formData.classId}`, editingStudent.id);
        await updateDoc(studentDocRef, payload);
      } else {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', `students_${formData.classId}`);
        await addDoc(colRef, { 
          ...payload, 
          attendanceCount: 0, 
          history: [], 
          photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}` 
        });
      }
      setShowManageModal(false);
      setFormData({ name: '', ttl: '', usia: '', pendidikan: 'Belum Sekolah', classId: 'bintang' });
    } catch (err) {
      console.error(err);
    }
  };

  const startScanner = (student) => {
    setScanningStudent(student);
    setActiveTab('scanner');
    setScanStatus(null);
    setTimeout(() => {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
          .then(stream => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          })
          .catch(() => setErrorMessage("Kamera tidak dapat diakses."));
      }
    }, 100);
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCapturePhoto = async (student) => {
    if (!videoRef.current || !selectedClass || !user) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const photoData = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const studentDocRef = doc(db, 'artifacts', appId, 'public', 'data', `students_${selectedClass.id}`, student.id);
      await updateDoc(studentDocRef, { photo: photoData });
      stopScanner();
      setActiveTab('class-detail');
    } catch (err) {
      setErrorMessage("Gagal menyimpan foto.");
    }
  };

  const handleScanAction = async () => {
    if (!scanningStudent || !scanningStudent.photo) {
        setErrorMessage("Anak ini belum memiliki foto profil.");
        return;
    }
    setScanStatus('processing');
    try {
      const dateString = new Date().toLocaleString('id-ID');
      const studentDocRef = doc(db, 'artifacts', appId, 'public', 'data', `students_${selectedClass.id}`, scanningStudent.id);
      await updateDoc(studentDocRef, { 
        attendanceCount: increment(1),
        history: arrayUnion(dateString)
      });
      setScanStatus('success');
      setTimeout(() => setShowNotification(true), 500);
    } catch (err) {
      setScanStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10 font-sans">
      
      {activeTab === 'login' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-indigo-700 relative overflow-hidden">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center relative z-10 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <UserCheck size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Portal Guru SM</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 mb-8 italic">Data Terintegrasi</p>
            {loginError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">{loginError}</div>}
            <div className="space-y-4 text-left">
              <input type="text" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-indigo-500 outline-none font-semibold transition-all" placeholder="Username" onChange={(e) => setLoginState({...loginState, username: e.target.value})} />
              <input type="password" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-indigo-500 outline-none font-semibold transition-all" placeholder="Password" onChange={(e) => setLoginState({...loginState, password: e.target.value})} />
              <button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs active:scale-95 transition-all">Masuk</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="max-w-md mx-auto min-h-screen flex flex-col animate-in fade-in duration-500">
          <header className="bg-white p-6 rounded-b-[2.5rem] shadow-sm flex justify-between items-center border-b border-slate-100 sticky top-0 z-20">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Beranda</h2>
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest italic leading-none mt-1">Sistem Absensi Digital</p>
            </div>
            <button onClick={() => setActiveTab('login')} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100">
              <LogOut size={20} />
            </button>
          </header>

          <div className="p-6 space-y-5">
            {CLASSES.map(cls => (
              <div key={cls.id} className="relative">
                <button 
                  onClick={() => { setSelectedClass(cls); setActiveTab('class-detail'); }} 
                  className="w-full bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left active:scale-[0.98]"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-xl mr-4 ${cls.color} text-white`}>{cls.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-slate-800 leading-tight">{cls.name}</h4>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                        {(allStudents[cls.id] || []).length} Murid
                      </p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => exportToCSV(cls.id, cls.name)} 
                  title="Ekspor ke Spreadsheet"
                  className="absolute top-4 right-4 p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                >
                  <FileSpreadsheet size={16} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => { setEditingStudent(null); setShowManageModal(true); }} 
              className="w-full flex items-center p-5 bg-indigo-600 hover:bg-indigo-700 rounded-[2rem] text-white shadow-lg active:scale-95 transition-all mt-2 group"
            >
              <div className="p-3 rounded-xl mr-4 bg-white/20"><Plus size={20} /></div>
              <div className="text-left">
                <h4 className="font-black leading-none mb-1 text-sm uppercase">Pendaftaran Baru</h4>
                <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest tracking-tight">Tambah murid secara manual</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'class-detail' && (
        <div className="max-w-md mx-auto min-h-screen animate-in slide-in-from-right duration-300">
          <header className="p-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('dashboard')} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft /></button>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">{selectedClass?.name}</h2>
            </div>
            <button onClick={() => exportToCSV(selectedClass.id, selectedClass.name)} className="p-2 bg-green-50 text-green-600 rounded-lg"><FileSpreadsheet size={18} /></button>
          </header>

          <div className="p-4 space-y-3">
            {(allStudents[selectedClass.id] || []).map(s => (
              <div key={s.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 flex items-center justify-between hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-3">
                  <img src={s.photo} className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-50" alt={s.name} />
                  <div>
                    <h5 className="font-black text-slate-800 text-sm leading-none mb-1">{s.name}</h5>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded-full font-bold">{s.usia} Thn</span>
                      <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full font-bold uppercase">{s.pendidikan}</span>
                      <span className="text-[8px] text-slate-400 font-medium block w-full mt-0.5 ml-0.5">{s.ttl}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="text-center mr-2">
                    <span className="text-[7px] font-black block uppercase text-slate-300 leading-none">Hadir</span>
                    <span className="text-sm font-black text-indigo-600">{s.attendanceCount}</span>
                  </div>
                  <button onClick={() => startScanner(s)} className={`p-3 rounded-xl text-white shadow-md active:scale-90 transition-all ${selectedClass.color} hover:brightness-110`}>
                    <Camera size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black">{editingStudent ? 'Edit Data' : 'Daftar Baru'}</h3>
              <button onClick={() => setShowManageModal(false)} className="p-1 text-slate-300 hover:text-slate-500"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold focus:ring-2 ring-indigo-100" placeholder="Nama Lengkap" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={formData.usia} onChange={(e) => setFormData({...formData, usia: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold focus:ring-2 ring-indigo-100" placeholder="Usia" />
                <select value={formData.pendidikan} onChange={(e) => setFormData({...formData, pendidikan: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold focus:ring-2 ring-indigo-100">
                  {EDUCATION_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
              <select value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold focus:ring-2 ring-indigo-100">
                {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" value={formData.ttl} onChange={(e) => setFormData({...formData, ttl: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold focus:ring-2 ring-indigo-100" placeholder="Tempat, Tgl Lahir" />
              <button onClick={handleSaveStudent} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg uppercase text-[10px] mt-4 flex items-center justify-center gap-2 transition-all active:scale-95">
                <Save size={14} /> Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scanner' && (
        <div className="fixed inset-0 bg-slate-950 z-[120] flex flex-col animate-in fade-in duration-300">
          {showNotification && (
            <div className="absolute inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <div className="bg-white w-full max-w-xs rounded-3xl p-8 text-center animate-in zoom-in">
                 <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
                 <h3 className="text-xl font-black text-slate-800">Berhasil Hadir!</h3>
                 <p className="text-slate-400 text-[10px] mt-2 mb-6 uppercase font-bold">Data kehadiran <b>{scanningStudent?.name}</b> diperbarui.</p>
                 <button onClick={() => { setShowNotification(false); stopScanner(); setActiveTab('class-detail'); }} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all">Kembali</button>
              </div>
            </div>
          )}
          <div className="p-6 flex justify-between items-center text-white z-10">
            <button onClick={() => { stopScanner(); setActiveTab('class-detail'); }} className="p-3 bg-white/10 rounded-xl backdrop-blur-md"><ChevronLeft /></button>
            <div className="text-center">
              <h4 className="text-[10px] font-black uppercase tracking-widest">{scanningStudent?.name}</h4>
              <p className="text-[8px] text-white/40 font-bold uppercase mt-1">Sistem Pemindai Wajah</p>
            </div>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="w-full max-w-xs aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden relative border-4 border-white/10">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 border-[40px] border-slate-950/40 pointer-events-none"></div>
              {scanningStudent?.photo && scanStatus !== 'processing' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_indigo] animate-[scan_2s_infinite_ease-in-out]"></div>
              )}
            </div>
          </div>
          <div className="p-10 flex flex-col items-center gap-4">
            <button onClick={scanningStudent?.photo ? handleScanAction : () => handleCapturePhoto(scanningStudent)} disabled={scanStatus === 'processing'} className="w-20 h-20 rounded-full p-2 bg-white shadow-2xl active:scale-90 transition-all">
              <div className={`w-full h-full rounded-full flex items-center justify-center ${scanningStudent?.photo ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                <Camera size={28} className="text-white" />
              </div>
            </button>
            <p className="text-white/30 text-[9px] font-black uppercase tracking-widest leading-none">Tekan untuk {scanningStudent?.photo ? 'Verifikasi' : 'Simpan Foto'}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan { 0% { transform: translateY(0); } 100% { transform: translateY(350px); } }
      `}</style>
    </div>
  );
}