import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { DEFAULT_GAMES } from '../seedData';
import { 
  Users, 
  Sparkles, 
  Shield, 
  User as UserIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ClassroomDashboard: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    return () => unsubscribe();
  }, []);

  const seedGames = async () => {
    if (!auth.currentUser) return;
    setSeeding(true);
    try {
      for (const game of DEFAULT_GAMES) {
        const newGameRef = doc(collection(db, 'games'));
        await setDoc(newGameRef, {
          ...game,
          id: newGameRef.id,
          creatorId: auth.currentUser.uid,
          creatorName: auth.currentUser.displayName || 'Teacher',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          status: 'approved' as const,
          isPublic: true,
        });
      }
      toast.success('Default games have been seeded successfully!');
    } catch (error) {
      console.error('Seeding failed:', error);
      toast.error('Failed to seed default games');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-neutral-950 p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              Classroom Management
              <Shield className="w-8 h-8 text-emerald-500/50" />
            </h1>
            <p className="text-neutral-400 text-lg">View and manage all students registered in your class.</p>
          </div>
          <button 
            onClick={seedGames}
            disabled={seeding}
            className="flex items-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Sparkles className="w-5 h-5" />
            {seeding ? 'Seeding Templates...' : 'Seed Default Templates'}
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            icon={<Users className="w-5 h-5" />}
            label="Total Students"
            value={students.length.toString()}
            color="emerald"
          />
          <StatCard 
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Active Today"
            value={students.length.toString()} // Mocked for now
            color="blue"
          />
          <StatCard 
            icon={<Clock className="w-5 h-5" />}
            label="Recent Joins"
            value={students.slice(0, 3).length.toString()}
            color="amber"
          />
        </section>

        <div className="bg-neutral-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-8 py-5 text-xs font-bold text-neutral-500 uppercase tracking-widest">Student</th>
                <th className="px-8 py-5 text-xs font-bold text-neutral-500 uppercase tracking-widest">UID / Email</th>
                <th className="px-8 py-5 text-xs font-bold text-neutral-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-4">
                      <Users className="w-12 h-12 text-neutral-800" />
                      <p>No students have joined your classroom yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.uid} className="group hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img 
                            src={student.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.uid}`} 
                            className="w-10 h-10 rounded-2xl object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-neutral-900" />
                        </div>
                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{student.displayName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 flex flex-col">
                      <span className="text-neutral-400 text-sm font-medium">{student.email}</span>
                      <span className="text-[10px] text-neutral-600 font-mono tracking-tighter truncate max-w-[150px]">{student.uid}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase rounded-full border border-emerald-500/20 shadow-sm">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                        Online
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: 'emerald' | 'blue' | 'amber' }) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20"
  };

  return (
    <div className={cn("p-6 rounded-3xl border backdrop-blur-sm shadow-xl", colors[color])}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-white/5 rounded-xl">{icon}</div>
        <span className="text-3xl font-bold tracking-tighter">{value}</span>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest opacity-60">{label}</span>
    </div>
  );
}
