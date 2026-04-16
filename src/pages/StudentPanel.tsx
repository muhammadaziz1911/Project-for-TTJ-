import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { 
  User, 
  MessageSquare, 
  LogOut, 
  Send, 
  Home, 
  Info, 
  CheckCircle, 
  Clock,
  Shield,
  GraduationCap
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion } from 'motion/react';

export default function StudentPanel() {
  const [student, setStudent] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [receiver, setReceiver] = useState<'admin' | 'rector'>('admin');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (d) => {
        setStudent({ id: d.id, ...d.data() });
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`));
      return () => unsub();
    }
  }, []);

  const handleLogout = () => signOut(auth);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser?.uid,
        senderName: student.fullName,
        receiverRole: receiver,
        content: message,
        timestamp: serverTimestamp()
      });
      
      await addDoc(collection(db, 'notifications'), {
        type: 'message',
        content: `${student.fullName}dan yangi xabar keldi`,
        targetRole: receiver,
        read: false,
        timestamp: serverTimestamp()
      });

      setMessage('');
      alert('Xabar yuborildi!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e: any) => {
    e.preventDefault();
    const fullName = e.target.fullName.value;
    const newPass = e.target.password.value;

    try {
      await updateDoc(doc(db, 'users', student.id), { fullName });
      if (newPass && auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
      }
      alert('Profil yangilandi!');
      setIsProfileModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${student.id}`);
    }
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <header className="bg-white border-b border-border-main sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              T
            </div>
            <span className="font-bold text-lg text-primary-dark tracking-tight">TTJ Portal</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-lg transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-text-main leading-none">{student.fullName}</p>
                <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">{student.group_number}</p>
              </div>
              <img src={`https://ui-avatars.com/api/?name=${student.fullName}&background=2563eb&color=fff`} alt="Avatar" className="w-9 h-9 rounded-full border border-border-main" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-danger-main transition-all"
              title="Chiqish"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Status Card */}
        <div className="md:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl border border-border-main shadow-sm"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-text-main">Xush kelibsiz, {student.fullName}!</h2>
                <p className="text-sm text-text-muted mt-1">TTJ dagi holatingiz va xonangiz haqida ma‘lumot</p>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-full flex items-center gap-2 font-bold text-xs",
                student.status === 'approved' ? "bg-emerald-50 text-success-main" : "bg-orange-50 text-warning-main"
              )}>
                {student.status === 'approved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                {student.status === 'approved' ? 'Tasdiqlangan' : 'Kutilmoqda'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-xl border border-border-main">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Home size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Xona ma‘lumoti</span>
                </div>
                {student.roomNumber ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-text-main">{student.roomNumber}-xona</p>
                    <p className="text-xs text-text-muted">{student.floor}-etaj</p>
                  </div>
                ) : (
                  <p className="text-text-muted text-sm italic">Hali xona biriktirilmagan</p>
                )}
              </div>
              <div className="p-5 bg-slate-50 rounded-xl border border-border-main">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Info size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Guruh</span>
                </div>
                <p className="text-2xl font-bold text-text-main">{student.group_number}</p>
                <p className="text-xs text-text-muted">Passport: {student.passport}</p>
              </div>
            </div>
          </motion.div>

          {/* Message Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl border border-border-main shadow-sm"
          >
            <h3 className="text-base font-bold text-text-main mb-6 flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" />
              Xabar yuborish
            </h3>
            <form onSubmit={sendMessage} className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReceiver('admin')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                    receiver === 'admin' ? "border-primary bg-blue-50 text-primary" : "border-border-main text-text-muted hover:bg-slate-50"
                  )}
                >
                  <Shield size={16} />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setReceiver('rector')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                    receiver === 'rector' ? "border-primary bg-blue-50 text-primary" : "border-border-main text-text-muted hover:bg-slate-50"
                  )}
                >
                  <GraduationCap size={16} />
                  Rektor
                </button>
              </div>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Xabaringizni yozing..."
                className="w-full p-4 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[120px] resize-none text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
              >
                <Send size={18} />
                Yuborish
              </button>
            </form>
          </motion.div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-primary p-6 rounded-xl text-white shadow-lg shadow-primary/20">
            <h4 className="font-bold text-sm mb-4 uppercase tracking-widest opacity-90">Eslatma</h4>
            <ul className="space-y-4 text-xs text-blue-50">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
                <span>Xonaga joylashish uchun admin tasdig‘ini kuting.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
                <span>Xabar yuborganda muammoni to‘liq tushuntiring.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
                <span>Profil ma‘lumotlarini to‘g‘ri saqlang.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-xl text-slate-800">Profilni tahrirlash</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <LogOut size={20} className="rotate-180 text-slate-400" />
              </button>
            </div>
            <form onSubmit={updateProfile} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To‘liq ism</label>
                <input name="fullName" defaultValue={student.fullName} required className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yangi parol (ixtiyoriy)</label>
                <input name="password" type="password" className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4">Saqlash</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
