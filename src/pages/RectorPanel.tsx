import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { 
  BarChart3, 
  Users, 
  DoorOpen, 
  Bell, 
  LogOut, 
  User,
  GraduationCap,
  PieChart,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion } from 'motion/react';

export default function RectorPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [rector, setRector] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'users'), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.role === 'student'));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (s) => {
      setRooms(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'rooms'));

    const unsubMessages = onSnapshot(query(collection(db, 'messages'), where('receiverRole', '==', 'rector')), (s) => {
      setMessages(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    if (auth.currentUser) {
      const unsubRector = onSnapshot(doc(db, 'users', auth.currentUser.uid), (d) => {
        setRector({ id: d.id, ...d.data() });
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`));
      return () => {
        unsubStudents();
        unsubRooms();
        unsubMessages();
        unsubRector();
      };
    }
  }, []);

  const handleLogout = () => signOut(auth);

  const updateProfile = async (e: any) => {
    e.preventDefault();
    const fullName = e.target.fullName.value;
    const newPass = e.target.password.value;

    try {
      await updateDoc(doc(db, 'users', rector.id), { fullName });
      if (newPass && auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
      }
      alert('Profil yangilandi!');
      setIsProfileModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${rector.id}`);
    }
  };

  const groups = Array.from(new Set(students.map(s => s.group_number))).filter(Boolean);
  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const occupied = rooms.reduce((acc, r) => acc + r.currentOccupancy, 0);

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <header className="bg-white border-b border-border-main sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              T
            </div>
            <div>
              <h1 className="font-bold text-base text-primary-dark tracking-tight">Rektor Monitoring</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">TTJ Boshqaruv Tizimi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-lg transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-text-main">{rector?.fullName || 'Rektor'}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Universitet Rektori</p>
              </div>
              <img src={`https://ui-avatars.com/api/?name=${rector?.fullName || 'Rektor'}&background=2563eb&color=fff`} alt="Avatar" className="w-9 h-9 rounded-full border border-border-main" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-danger-main transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <StatCard label="Jami Talabalar" value={students.length} />
          <StatCard label="Mavjud Guruhlar" value={groups.length} />
          <StatCard label="Xonalar Bandligi" value={`${Math.round((occupied / totalCapacity) * 100) || 0}%`} />
          <StatCard label="Xabarlar" value={messages.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Group Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-border-main shadow-sm">
              <h3 className="text-sm font-bold text-text-main mb-6 flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" />
                Guruhlar kesimida statistika
              </h3>
              <div className="space-y-4">
                {groups.map(group => {
                  const count = students.filter(s => s.group_number === group).length;
                  const percent = (count / students.length) * 100;
                  return (
                    <div key={group} className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-text-main">{group}</span>
                        <span className="text-text-muted">{count} talaba</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Status */}
            <div className="bg-white p-6 rounded-xl border border-border-main shadow-sm">
              <h3 className="text-sm font-bold text-text-main mb-6 flex items-center gap-2">
                <DoorOpen size={18} className="text-success-main" />
                Xonalar holati
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[10px] text-success-main font-bold uppercase mb-1">Bo‘sh</p>
                  <p className="text-xl font-bold text-text-main">{rooms.filter(r => r.status === 'green').length}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                  <p className="text-[10px] text-danger-main font-bold uppercase mb-1">To‘la</p>
                  <p className="text-xl font-bold text-text-main">{rooms.filter(r => r.status === 'red').length}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p className="text-[10px] text-primary font-bold uppercase mb-1">Jami Joy</p>
                  <p className="text-xl font-bold text-text-main">{totalCapacity}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-border-main text-center">
                  <p className="text-[10px] text-text-muted font-bold uppercase mb-1">Band Joy</p>
                  <p className="text-xl font-bold text-text-main">{occupied}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications/Messages */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-border-main shadow-sm h-full flex flex-col">
              <h3 className="text-sm font-bold text-text-main mb-6 flex items-center gap-2">
                <Bell size={18} className="text-warning-main" />
                Talabalar murojaatlari
              </h3>
              <div className="space-y-4 flex-1 overflow-y-auto">
                {messages.map(m => (
                  <div key={m.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-xs text-primary">{m.senderName}</span>
                      <span className="text-[10px] text-text-muted">{m.timestamp?.toDate().toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-text-main leading-relaxed line-clamp-3">{m.content}</p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-10 text-text-muted text-xs italic">Murojaatlar yo‘q</div>
                )}
              </div>
            </div>
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
                <input name="fullName" defaultValue={rector?.fullName} required className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
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

function StatCard({ label, value }: { label: string, value: any }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-border-main shadow-sm">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-main">{value}</p>
    </div>
  );
}
