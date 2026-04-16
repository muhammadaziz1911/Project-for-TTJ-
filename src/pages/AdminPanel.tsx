import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { 
  Users, 
  LayoutDashboard, 
  DoorOpen, 
  Bell, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Settings,
  ChevronRight,
  User,
  ShieldCheck
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'users'), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.role === 'student'));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (s) => {
      setRooms(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'rooms'));

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), where('targetRole', '==', 'admin')), (s) => {
      setNotifications(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    const unsubMessages = onSnapshot(query(collection(db, 'messages'), where('receiverRole', '==', 'admin')), (s) => {
      setMessages(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'system'), (d) => {
      if (d.exists()) setConfig(d.data());
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/system'));

    // Initial rooms setup if empty
    const initRooms = async () => {
      try {
        const roomSnap = await getDocs(collection(db, 'rooms'));
        if (roomSnap.empty) {
          const initialRooms = [
            { floor: 1, roomNumber: '101', capacity: 4, currentOccupancy: 0, status: 'green' },
            { floor: 1, roomNumber: '102', capacity: 4, currentOccupancy: 0, status: 'green' },
            { floor: 2, roomNumber: '201', capacity: 4, currentOccupancy: 0, status: 'green' },
            { floor: 3, roomNumber: '301', capacity: 4, currentOccupancy: 0, status: 'green' },
            { floor: 4, roomNumber: '401', capacity: 4, currentOccupancy: 0, status: 'green' },
          ];
          for (const r of initialRooms) {
            await addDoc(collection(db, 'rooms'), r);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'rooms');
      }
    };
    initRooms();

    setLoading(false);
    return () => {
      unsubStudents();
      unsubRooms();
      unsubNotifs();
      unsubMessages();
      unsubConfig();
    };
  }, []);

  const handleLogout = () => signOut(auth);

  const approveStudent = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'users', studentId), { status: 'approved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${studentId}`);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (confirm('Talabani o‘chirishni tasdiqlaysizmi?')) {
      try {
        await deleteDoc(doc(db, 'users', studentId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${studentId}`);
      }
    }
  };

  const addRoom = async (e: any) => {
    e.preventDefault();
    const floor = parseInt(e.target.floor.value);
    const roomNumber = e.target.roomNumber.value;
    const capacity = parseInt(e.target.capacity.value);

    try {
      await addDoc(collection(db, 'rooms'), {
        floor,
        roomNumber,
        capacity,
        currentOccupancy: 0,
        status: 'green'
      });
      setIsRoomModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'rooms');
    }
  };

  const assignRoom = async (e: any) => {
    e.preventDefault();
    const roomId = e.target.roomId.value;
    const studentId = selectedStudent.id;
    
    const room = rooms.find(r => r.id === roomId);
    if (room.currentOccupancy >= room.capacity) {
      alert('Xona to‘la!');
      return;
    }

    await updateDoc(doc(db, 'users', studentId), {
      roomId,
      roomNumber: room.roomNumber,
      floor: room.floor,
      status: 'approved'
    });

    await updateDoc(doc(db, 'rooms', roomId), {
      currentOccupancy: room.currentOccupancy + 1,
      status: (room.currentOccupancy + 1) >= room.capacity ? 'red' : 'green'
    });

    setIsStudentModalOpen(false);
    setSelectedStudent(null);
  };

  const addSidebarSection = async (e: any) => {
    e.preventDefault();
    const name = e.target.sectionName.value;
    const description = e.target.sectionDesc.value;
    
    const newSections = config?.sidebarSections || [];
    newSections.push({ name, description });
    
    await setDoc(doc(db, 'config', 'system'), { sidebarSections: newSections }, { merge: true });
    e.target.reset();
  };

  const studentsByGroup = students.reduce((acc: any, s) => {
    const group = s.group_number || 'Noma‘lum';
    if (!acc[group]) acc[group] = [];
    acc[group].push(s);
    return acc;
  }, {});

  const roomsByFloor = [1, 2, 3, 4].map(floor => ({
    floor,
    rooms: rooms.filter(r => r.floor === floor)
  }));

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar-bg border-r border-border-main flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-border-main">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
            T
          </div>
          <span className="font-bold text-lg text-primary-dark tracking-tight">TTJ Portal</span>
        </div>

        <nav className="flex-1 py-5 space-y-1 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<Users size={18} />} 
            label="Talabalar" 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')} 
          />
          <SidebarItem 
            icon={<DoorOpen size={18} />} 
            label="Xonalar" 
            active={activeTab === 'rooms'} 
            onClick={() => setActiveTab('rooms')} 
          />
          <SidebarItem 
            icon={<MessageSquare size={18} />} 
            label="Xabarlar" 
            active={activeTab === 'messages'} 
            onClick={() => setActiveTab('messages')} 
          />
          
          {config?.sidebarSections?.map((section: any, i: number) => (
            <SidebarItem 
              key={`section-${i}`}
              icon={<Settings size={18} />} 
              label={section.name} 
              active={activeTab === section.name} 
              onClick={() => setActiveTab(section.name)} 
            />
          ))}
        </nav>

        <div className="p-4 border-t border-border-main">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
              <User size={18} className="text-slate-500" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-text-main truncate">Admin</p>
              <p className="text-[10px] text-text-muted uppercase truncate">TTJ Mudiri</p>
            </div>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 mt-1 rounded-lg hover:bg-red-50 text-danger-main transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-border-main flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-text-main capitalize">{activeTab}</h2>
            <div className="h-4 w-px bg-border-main mx-2" />
            <div className="bg-slate-100 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="text-xs text-text-muted">Qidirish...</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer">
              <Bell size={20} className="text-text-muted" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-main text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-text-main">Aziz Rahimov</p>
                <p className="text-[10px] text-text-muted uppercase">Admin</p>
              </div>
              <img src="https://ui-avatars.com/api/?name=Aziz+Rahimov&background=2563eb&color=fff" alt="Avatar" className="w-9 h-9 rounded-full border border-border-main" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard label="Jami Talabalar" value={students.length} />
                <StatCard label="Bo‘sh Joylar" value={rooms.reduce((acc, r) => acc + (r.capacity - r.currentOccupancy), 0)} />
                <StatCard label="Band Xonalar" value={rooms.filter(r => r.currentOccupancy > 0).length} />
                <StatCard label="Yangi So‘rovlar" value={students.filter(s => s.status === 'pending').length} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-border-main shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-border-main flex justify-between items-center">
                    <h3 className="text-sm font-bold text-text-main">Xonalar Monitoringi</h3>
                    <button 
                      onClick={() => setIsRoomModalOpen(true)}
                      className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    >
                      + Xona Qo'shish
                    </button>
                  </div>
                  <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(f => (
                        <button key={f} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium border transition-all", f === 1 ? "bg-primary text-white border-primary" : "bg-white text-text-muted border-border-main hover:bg-slate-50")}>
                          {f}-Etaj
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1">
                      {rooms.slice(0, 6).map(room => (
                        <div key={room.id} className="p-3 rounded-xl border border-border-main space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-text-main">Xona {room.roomNumber}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              room.status === 'red' ? "bg-red-50 text-danger-main" : "bg-emerald-50 text-success-main"
                            )}>
                              {room.status === 'red' ? 'To‘la' : 'Joy bor'}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-text-muted">
                              <span>Sig'im: {room.currentOccupancy}/{room.capacity}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full transition-all", room.status === 'red' ? "bg-danger-main" : "bg-primary")}
                                style={{ width: `${(room.currentOccupancy / room.capacity) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-border-main shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-border-main">
                    <h3 className="text-sm font-bold text-text-main">Bildirishnomalar</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} className="flex gap-3 pb-4 border-b border-slate-50 last:border-0">
                        <div className="w-9 h-9 bg-blue-50 text-primary rounded-lg flex items-center justify-center shrink-0">
                          <Bell size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-main leading-relaxed">
                            <span className="font-bold">{n.content.split(' ')[0]}</span> {n.content.split(' ').slice(1).join(' ')}
                          </p>
                          <p className="text-[10px] text-text-muted mt-1">
                            {n.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'students' && (
            <div className="space-y-8">
              {Object.entries(studentsByGroup).map(([group, groupStudents]: [string, any]) => (
                <div key={group} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Guruh: {group}</h3>
                    <span className="text-sm text-slate-500">{groupStudents.length} talaba</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-4">Ism Familiya</th>
                          <th className="px-6 py-4">Passport</th>
                          <th className="px-6 py-4">Xona</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupStudents.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-all">
                            <td className="px-6 py-4 font-medium text-slate-800">{s.fullName}</td>
                            <td className="px-6 py-4 text-slate-500">{s.passport}</td>
                            <td className="px-6 py-4 text-slate-500">
                              {s.roomNumber ? `Etaj ${s.floor}, Xona ${s.roomNumber}` : 'Biriktirilmagan'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                s.status === 'approved' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                              )}>
                                {s.status === 'approved' ? 'Tasdiqlangan' : 'Kutilmoqda'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {s.status === 'pending' && (
                                <button 
                                  onClick={() => { setSelectedStudent(s); setIsStudentModalOpen(true); }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Xonaga biriktirish"
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => deleteStudent(s.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="O‘chirish"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-8">
              <div className="flex justify-end">
                <button 
                  onClick={() => setIsRoomModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all"
                >
                  <Plus size={20} />
                  Xona qo‘shish
                </button>
              </div>
              
              {roomsByFloor.map(floorData => (
                <div key={floorData.floor} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <ChevronRight size={20} className="text-blue-600" />
                    {floorData.floor}-etaj
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {floorData.rooms.map(room => (
                      <div key={room.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className={cn(
                          "absolute top-0 right-0 w-2 h-full",
                          room.status === 'red' ? "bg-red-500" : "bg-green-500"
                        )} />
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-2xl font-bold text-slate-800">{room.roomNumber}</h4>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                            room.status === 'red' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                          )}>
                            {room.status === 'red' ? 'To‘la' : 'Joy bor'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Sig‘imi:</span>
                            <span className="font-bold text-slate-700">{room.capacity} kishi</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Band:</span>
                            <span className="font-bold text-slate-700">{room.currentOccupancy} kishi</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                room.status === 'red' ? "bg-red-500" : "bg-green-500"
                              )}
                              style={{ width: `${(room.currentOccupancy / room.capacity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Talabalardan kelgan xabarlar</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {messages.map(m => (
                  <div key={m.id} className="p-6 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-blue-600">{m.senderName}</span>
                      <span className="text-xs text-slate-400">{m.timestamp?.toDate().toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{m.content}</p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="p-12 text-center text-slate-400">Xabarlar mavjud emas</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <Modal title="Yangi xona qo‘shish" onClose={() => setIsRoomModalOpen(false)}>
            <form onSubmit={addRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Etaj</label>
                <select name="floor" required className="w-full p-2 border rounded-lg">
                  <option value="1">1-etaj</option>
                  <option value="2">2-etaj</option>
                  <option value="3">3-etaj</option>
                  <option value="4">4-etaj</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Xona raqami</label>
                <input name="roomNumber" type="text" required className="w-full p-2 border rounded-lg" placeholder="101" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sig‘imi (kishi)</label>
                <input name="capacity" type="number" required className="w-full p-2 border rounded-lg" defaultValue="4" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Qo‘shish</button>
            </form>
          </Modal>
        )}

        {isStudentModalOpen && (
          <Modal title="Talabani xonaga biriktirish" onClose={() => setIsStudentModalOpen(false)}>
            <form onSubmit={assignRoom} className="space-y-4">
              <p className="text-sm text-slate-500">Talaba: <span className="font-bold text-slate-800">{selectedStudent?.fullName}</span></p>
              <div>
                <label className="block text-sm font-medium mb-1">Xona tanlang</label>
                <select name="roomId" required className="w-full p-2 border rounded-lg">
                  {rooms.filter(r => r.status === 'green').map(r => (
                    <option key={r.id} value={r.id}>
                      Etaj {r.floor} - Xona {r.roomNumber} ({r.capacity - r.currentOccupancy} bo‘sh joy)
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Tasdiqlash</button>
            </form>
          </Modal>
        )}

        {isProfileModalOpen && (
          <Modal title="Profil va Sozlamalar" onClose={() => setIsProfileModalOpen(false)}>
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Settings size={18} />
                  Yangi Sidebar Section qo‘shish
                </h4>
                <form onSubmit={addSidebarSection} className="space-y-3">
                  <input name="sectionName" required className="w-full p-2 border rounded-lg text-sm" placeholder="Section nomi" />
                  <textarea name="sectionDesc" className="w-full p-2 border rounded-lg text-sm" placeholder="Tavsifi" rows={2} />
                  <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold">Qo‘shish</button>
                </form>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">Mavjud sectionlar:</h4>
                {config?.sidebarSections?.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white border rounded-lg text-xs">
                    <span>{s.name}</span>
                    <button 
                      onClick={async () => {
                        const filtered = config.sidebarSections.filter((_: any, idx: number) => idx !== i);
                        await updateDoc(doc(db, 'config', 'system'), { sidebarSections: filtered });
                      }}
                      className="text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-6 py-3 transition-all font-medium text-sm relative",
        active 
          ? "bg-blue-50 text-primary border-r-4 border-primary" 
          : "text-text-muted hover:bg-slate-50 hover:text-text-main"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-border-main shadow-sm">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-main">{value}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
            <XCircle size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
