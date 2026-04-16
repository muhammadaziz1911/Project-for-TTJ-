import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LogIn, UserPlus, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-generate Admin and Rector if they don't exist
  useEffect(() => {
    const initSystem = async () => {
      if (!auth.currentUser) return;

      try {
        // Check if already initialized via config
        const configDoc = await getDoc(doc(db, 'config', 'system'));
        if (configDoc.exists() && configDoc.data().initialized) return;

        // Only admins can check/init the users collection
        const adminQuery = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
        if (adminQuery.empty) {
          // Create default admin: admin@ttj.uz / admin123
          const userCredential = await createUserWithEmailAndPassword(auth, 'admin@ttj.uz', 'admin123');
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            username: 'admin',
            role: 'admin',
            fullName: 'Tizim Admini',
            status: 'approved'
          });
          console.log('Default admin created');
        }

        const rectorQuery = await getDocs(query(collection(db, 'users'), where('role', '==', 'rector')));
        if (rectorQuery.empty) {
          // Create default rector: rector@ttj.uz / rector123
          const userCredential = await createUserWithEmailAndPassword(auth, 'rector@ttj.uz', 'rector123');
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            username: 'rector',
            role: 'rector',
            fullName: 'Universitet Rektori',
            status: 'approved'
          });
          console.log('Default rector created');
        }

        // Mark as initialized
        await setDoc(doc(db, 'config', 'system'), { initialized: true }, { merge: true });
      } catch (e) {
        // Silently fail if no permissions, as this is just an auto-init helper
        console.log('System init check skipped or already initialized');
      }
    };
    
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) initSystem();
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedUsername = username.trim();

    try {
      let email = trimmedUsername;
      if (trimmedUsername === 'admin') email = 'admin@ttj.uz';
      else if (trimmedUsername === 'rector') email = 'rector@ttj.uz';
      else if (!trimmedUsername.includes('@')) email = `${trimmedUsername}@student.ttj.uz`;

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        // Lazy bootstrap for default accounts if they don't exist yet
        if ((signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found') && 
            ((trimmedUsername === 'admin' && password === 'admin123') || 
             (trimmedUsername === 'rector' && password === 'rector123'))) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/operation-not-allowed') {
              throw new Error('OPERATION_NOT_ALLOWED');
            }
            throw signInErr; // Rethrow original error if creation fails for other reasons
          }
        } else {
          throw signInErr;
        }
      }
      
      // Ensure user document exists for default accounts
      if (email === 'admin@ttj.uz' || email === 'rector@ttj.uz') {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            username: trimmedUsername,
            role: trimmedUsername === 'admin' ? 'admin' : 'rector',
            fullName: trimmedUsername === 'admin' ? 'Tizim Admini' : 'Universitet Rektori',
            status: 'approved'
          });
        }
      }
      
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.message === 'OPERATION_NOT_ALLOWED') {
        setError('Email/Parol orqali kirish o‘chirilgan. Iltimos, Firebase Console orqali yoqing.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Username yoki email noto‘g‘ri formatda');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Username yoki parol noto‘g‘ri (Hisob mavjud emas yoki parol xato)');
      } else {
        setError('Tizimga kirishda xatolik yuz berdi: ' + (err.message || err.code));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // If it's the hardcoded admin, ensure they have a user doc
      if (result.user.email === 'azizbekmaxmudov22@gmail.com') {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', result.user.uid), {
            username: 'azizbek',
            role: 'admin',
            fullName: result.user.displayName || 'Azizbek Maxmudov',
            status: 'approved'
          });
        }
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google orqali kirish o‘chirilgan. Iltimos, Firebase Console orqali yoqing.');
      } else {
        setError('Google orqali kirishda xatolik');
      }
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
        <div className="p-8 text-center border-b border-border-main">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4 text-white shadow-lg shadow-primary/20">
            <GraduationCap size={24} />
          </div>
          <h1 className="text-xl font-bold text-text-main">TTJ Portal</h1>
          <p className="text-text-muted text-xs mt-1 uppercase tracking-widest">Boshqaruv Tizimi</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-danger-main p-3 rounded-lg text-xs border border-red-100 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              placeholder="Ism_Familiya yoki admin/rector"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Parol</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
          >
            {loading ? 'Kirish...' : (
              <>
                <LogIn size={18} />
                Kirish
              </>
            )}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-main"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-text-muted">Yoki</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-text-main font-bold py-3.5 rounded-xl border border-border-main transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google orqali kirish
          </button>

          <div className="text-center pt-2">
            <Link 
              to="/register" 
              className="text-primary hover:text-primary-dark text-xs font-bold inline-flex items-center gap-1.5 uppercase tracking-wider"
            >
              <UserPlus size={14} />
              Ro‘yxatdan o‘tish
            </Link>
          </div>
        </form>

        
      </motion.div>
    </div>
  );
}
