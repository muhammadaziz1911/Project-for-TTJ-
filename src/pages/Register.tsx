import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserPlus, ArrowLeft, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/utils';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    passport: '',
    group_number: '',
    fullName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedUsername = formData.username.trim();
    const trimmedPassword = formData.password.trim();

    // Validation for username format: Ism_Familiya
    if (!trimmedUsername.includes('_')) {
      setError('Username formati noto‘g‘ri (Ism_Familiya)');
      setLoading(false);
      return;
    }

    try {
      const email = `${trimmedUsername}@student.ttj.uz`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, trimmedPassword);
      
      // Save user to Firestore
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: trimmedUsername,
          fullName: formData.fullName.trim() || trimmedUsername.replace('_', ' '),
          passport: formData.passport.trim(),
          group_number: formData.group_number.trim(),
          role: 'student',
          status: 'pending',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${userCredential.user.uid}`);
      }

      // Send notification to Admin
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'registration',
          content: `${formData.username} ismli talaba TTJ da turish uchun so‘rov yubordi`,
          targetRole: 'admin',
          read: false,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'notifications');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ro‘yxatdan o‘tishda xatolik');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-xl border border-border-main shadow-sm overflow-hidden"
      >
        <div className="p-6 text-center border-b border-border-main flex items-center gap-4">
          <Link to="/login" className="p-2 hover:bg-slate-50 rounded-lg transition-all text-text-muted">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-text-main">Ro‘yxatdan o‘tish</h1>
        </div>

        <form onSubmit={handleRegister} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-danger-main p-3 rounded-lg text-xs border border-red-100 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">To‘liq ism (F.I.SH)</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="Ali Valiyev"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Username (Ism_Familiya)</label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="Ali_Valiyev"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Parol</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Passport (Seriya + Raqam)</label>
            <input
              type="text"
              name="passport"
              required
              value={formData.passport}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="AB1234567"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Guruh raqami</label>
            <input
              type="text"
              name="group_number"
              required
              value={formData.group_number}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="18A-23"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 text-sm"
          >
            {loading ? 'Yuborilmoqda...' : (
              <>
                <UserPlus size={18} />
                Ro‘yxatdan o‘tish
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
