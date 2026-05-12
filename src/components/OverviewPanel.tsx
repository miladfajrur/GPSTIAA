import React, { useMemo } from 'react';
import { Users, Gift, UserCheck, MapPin, PieChart, Camera, Folder, BookOpen, Globe, Settings, ArrowRight } from 'lucide-react';
import { Member } from '../types';
import { getDirectDriveLink } from '../lib/utils';

interface OverviewPanelProps {
  members: Member[];
  onNavigate: (tabId: string) => void;
  user: any;
}

export default function OverviewPanel({ members, onNavigate, user }: OverviewPanelProps) {
  const activeMembers = useMemo(() => members.filter(m => !m.tanggal_keluar).length, [members]);
  const totalMembers = members.length;

  // Let's get nearest birthdays list (in 7 days)
  const { birthdaysToday, birthdaysThisWeek } = useMemo(() => {
    const todayList: Member[] = [];
    const thisWeekList: Member[] = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Sort all relevant members by birthday
    const upcoming = members.filter(m => {
      if (!m.tanggal_lahir || m.tanggal_keluar) return false;
      const bDate = new Date(m.tanggal_lahir);
      if (isNaN(bDate.getTime())) return false;
      return true;
    }).map(m => {
      const bDate = new Date(m.tanggal_lahir!);
      let currentAge = today.getFullYear() - bDate.getFullYear();
      let nextBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      if (nextBday.getTime() < today.getTime()) {
        nextBday.setFullYear(today.getFullYear() + 1);
        currentAge++; // they will turn this age next year
      }
      return { member: m, nextBday, currentAge };
    });

    upcoming.sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime());

    upcoming.forEach(({ member, nextBday, currentAge }) => {
      if (nextBday.getTime() === today.getTime()) {
        todayList.push({ ...member, _tempAge: currentAge } as any); // attach age briefly
      } else if (nextBday.getTime() > today.getTime() && nextBday.getTime() <= nextWeek.getTime()) {
        thisWeekList.push({ ...member, _tempAge: currentAge } as any);
      }
    });

    return { birthdaysToday: todayList, birthdaysThisWeek: thisWeekList };
  }, [members]);

  const validationIssuesCount = useMemo(() => {
    let issues = 0;
    const nomorMap = new Map<string, number>();
    members.forEach(m => {
      const num = m.nomor_anggota?.toLowerCase().trim();
      if (num) {
        nomorMap.set(num, (nomorMap.get(num) || 0) + 1);
      }
    });

    members.forEach(m => {
      const num = m.nomor_anggota?.toLowerCase().trim();
      if (num && nomorMap.get(num)! > 1) issues++;
      else if (!m.nomor_anggota || m.nomor_anggota.trim() === '') issues++;
      else if (!m.nama_lengkap || m.nama_lengkap.trim() === '') issues++;
      else if (!m.tanggal_lahir || m.tanggal_lahir.trim() === '') issues++;
      // check format
      else if (m.tanggal_lahir.split('-').length !== 3) issues++;
      else if (!m.jenis_kelamin || (m.jenis_kelamin !== 'Pria' && m.jenis_kelamin !== 'Wanita')) issues++;
    });
    return issues;
  }, [members]);

  const nearestBirthdays = birthdaysToday.length + birthdaysThisWeek.length;

  const stats = [
    { label: 'Total Jemaat Aktif', value: activeMembers, total: totalMembers },
    { label: 'Ulang Tahun Terdekat', value: nearestBirthdays, badge: nearestBirthdays > 0 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
    { label: 'Isu Data Terdeteksi', value: validationIssuesCount, badge: validationIssuesCount > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' }
  ];

  const menuItems = [
    { id: 'members', label: 'Data Anggota', icon: <Users className="w-6 h-6 text-blue-500" />, desc: 'Kelola database anggota, tambah, edit, dan cetak kartu.', color: 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20' },
    { id: 'birthdays', label: 'Ulang Tahun', icon: <Gift className="w-6 h-6 text-rose-500" />, desc: 'Pantau hari ulang tahun jemaat minggu ini & bulan ini.', color: 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20' },
    { id: 'reports', label: 'Laporan Mingguan', icon: <UserCheck className="w-6 h-6 text-emerald-500" />, desc: 'Laporan kebaktian, jumlah kehadiran, dan statistik.', color: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'stats', label: 'Statistik Jemaat', icon: <PieChart className="w-6 h-6 text-purple-500" />, desc: 'Grafik demografi berdasarkan usia, kelamin, provinsi.', color: 'border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/20' },
    { id: 'map', label: 'Pemetaan Jemaat', icon: <MapPin className="w-6 h-6 text-indigo-500" />, desc: 'Lihat persebaran lokasi jemaat di Peta dan list rayon.', color: 'border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'mediarepo', label: 'Galeri Multimedia', icon: <Camera className="w-6 h-6 text-amber-500" />, desc: 'Simpan dokumentasi foto dan video kegiatan.', color: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20' },
    { id: 'documents', label: 'Arsip Dokumen', icon: <Folder className="w-6 h-6 text-cyan-500" />, desc: 'Penyimpanan surat bina, notulen, dan dokumen rapat.', color: 'border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-900/20' },
    { id: 'worship', label: 'Tema Ibadah', icon: <BookOpen className="w-6 h-6 text-teal-500" />, desc: 'Daftar jadwal ibadah, litos, dan pembawa firman.', color: 'border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-900/20' },
    { id: 'misikaltara', label: 'Misi Kaltara', icon: <Globe className="w-6 h-6 text-orange-500" />, desc: 'Pantau program dan data pengembangan misi daerah.', color: 'border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/20' },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-6 h-6 text-slate-500" />, desc: 'Kelola akun pengguna, konfigurasi, dan backup data.', color: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 dark:bg-slate-900/20 w-full min-h-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Selamat Datang, {user?.username === 'anabk' ? 'Dr. Ana Budi Kristiani, S.Sn., M.M' : (user?.username === 'fajrur' ? 'Fajrur' : (user?.username === 'BEM' ? 'Badan Exclusive Mahasiswa' : (user?.username === 'gpsttiaa' ? 'Administrator' : user?.username || 'Administrator')))}! 👋
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Berikut ini adalah tautan cepat untuk mengakses fitur aplikasi GPSTIAA.
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {stats.map((stat, i) => (
            <div key={i} className="flex-1 md:flex-none p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${stat.badge ? 'px-2 py-0.5 rounded-full text-base ' + stat.badge : 'text-slate-800 dark:text-slate-100'}`}>
                  {stat.value}
                </span>
                {stat.total !== undefined && (
                  <span className="text-sm font-medium text-slate-400">/ {stat.total}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(birthdaysToday.length > 0 || birthdaysThisWeek.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {birthdaysToday.length > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/10 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Gift className="w-24 h-24 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-rose-900 dark:text-rose-100">Ulang Tahun Hari Ini</h2>
                    <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{birthdaysToday.length} Jemaat berulang tahun hari ini!</p>
                  </div>
                </div>
                <div className="space-y-3 mt-5">
                  {birthdaysToday.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-rose-100 dark:border-rose-800/30">
                      {m.foto_url ? (
                        <img src={getDirectDriveLink(m.foto_url)} alt={m.nama_lengkap} className="w-12 h-12 rounded-full object-cover shadow-sm bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-300 font-bold text-lg shadow-sm">
                          {m.nama_lengkap?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{m.nama_lengkap}</p>
                        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Ke-{m._tempAge} Tahun</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {birthdaysThisWeek.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ulang Tahun Minggu Ini</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Dalam 7 hari ke depan</p>
                </div>
              </div>
              <div className="space-y-3 mt-5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {birthdaysThisWeek.map((m: any, i: number) => {
                  const bDate = new Date(m.tanggal_lahir);
                  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                  // Use nextBday or simplify with formatting string
                  const dateStr = `${bDate.getDate()} ${bulan[bDate.getMonth()]}`;
                  
                  return (
                    <div key={i} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {m.foto_url ? (
                        <img src={getDirectDriveLink(m.foto_url)} alt={m.nama_lengkap} className="w-10 h-10 rounded-full object-cover shadow-sm bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shadow-sm">
                          {m.nama_lengkap?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{m.nama_lengkap}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ke-{m._tempAge} • {dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-1">Akses Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.map((item) => {
            // Hide settings from non-admin and BEM only gets limited view
            if (item.id === 'settings' && user?.username === 'BEM') return null;
            if (user?.username === 'BEM' && item.id !== 'birthdays') return null;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group text-left flex flex-col p-5 rounded-2xl border ${item.color} hover:shadow-md transition-all duration-200 hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800/80 shadow-sm flex items-center justify-center border border-white/50 dark:border-slate-700/50">
                    {item.icon}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">{item.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
