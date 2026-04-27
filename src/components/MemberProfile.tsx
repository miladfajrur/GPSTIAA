import React from 'react';
import { Member } from '../types';
import { ArrowLeft, User, Calendar, MapPin, FileText, Phone, Cross, Heart, Info, Clock, CheckCircle, Gift } from 'lucide-react';
import { formatNameTitleCase, getDaysToBirthday, getDirectDriveLink } from '../lib/utils';

interface MemberProfileProps {
  member: Member;
  onBack: () => void;
}

export default function MemberProfile({ member, onBack }: MemberProfileProps) {

  const isActive = !member.tanggal_keluar;
  const daysToBirthday = member.tanggal_lahir ? getDaysToBirthday(member.tanggal_lahir) : null;
  const isBirthdayToday = daysToBirthday === 0;

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden sm:block">Profil Anggota</h2>
        </div>
        <div className="flex items-center gap-2">
           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
            {isActive ? 'Status: Aktif' : 'Status: Keluar'}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Section: Photo & Basic Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
           {/* Cover Background pattern */}
           <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative overflow-hidden">
               <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', backgroundSize: '32px 32px' }}></div>
           </div>

           <div className="px-6 pb-6 pt-0 sm:px-8 sm:pb-8 relative -mt-16 flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              {/* Profile Picture Placeholder */}
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-lg relative z-10 overflow-hidden">
                  <User className="w-12 h-12 text-slate-400 dark:text-slate-500 absolute z-0" />
                  {member.foto_url && (
                    <img src={getDirectDriveLink(member.foto_url)} alt={member.nama_lengkap} className="w-full h-full object-cover relative z-10" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
              </div>

              <div className="text-center sm:text-left flex-1 w-full relative z-10 pt-2">
                 <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                   <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white" style={{textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>
                      {formatNameTitleCase(member.nama_lengkap)}
                   </h1>
                   {isBirthdayToday && (
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold animate-pulse w-fit self-center sm:self-auto border border-amber-200 dark:border-amber-800/50">
                       🎉 Ulang Tahun Hari Ini!
                     </span>
                   )}
                 </div>
                 <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-2 mt-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                      <span className="font-mono">{member.nomor_anggota || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <User className="w-4 h-4" />
                      <span>{member.jenis_kelamin}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           
           {/* Section 1: Data Pribadi */}
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                <Info className="w-4 h-4" /> Data Pribadi
              </h3>
              
              <div className="space-y-3">
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tempat, Tanggal Lahir</p>
                   <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                     <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                     <span>{member.tempat_lahir || '-'}, {member.tanggal_lahir ? new Date(member.tanggal_lahir).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</span>
                     {member.tanggal_lahir && (() => {
                        const birthDateObj = new Date(member.tanggal_lahir);
                        if (isNaN(birthDateObj.getTime())) return null;
                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        const nextBirthdayThisYear = new Date(todayDate.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate());
                        const hasPassed = nextBirthdayThisYear.getTime() <= todayDate.getTime();
                        let currentAge = todayDate.getFullYear() - birthDateObj.getFullYear();
                        if (!hasPassed) {
                           currentAge -= 1;
                        }
                        if (currentAge < 0) currentAge = 0;
                        return (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold border border-blue-100 dark:border-blue-800">
                            {currentAge} Tahun
                          </span>
                        );
                     })()}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">No. Telepon / HP</p>
                   <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                     <Phone className="w-4 h-4 text-slate-400" />
                     {member.no_telp || '-'}
                   </p>
                 </div>
              </div>
           </div>

           {/* Section 2: Data Alamat */}
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                <MapPin className="w-4 h-4" /> Alamat Domisili
              </h3>
              
              <div className="space-y-3">
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Alamat Domisili / Asal</p>
                   <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                     {member.alamat_asal || '-'}
                   </p>
                 </div>
              </div>
           </div>

           {/* Section 3: Data Rohani & Gerejawi */}
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                <FileText className="w-4 h-4" /> Data Rohani
              </h3>
              
              <div className="space-y-4">
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Riwayat Baptis</p>
                   <div className="flex flex-col gap-1.5 mt-1">
                      {member.jenis_baptis ? (
                         <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                           <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                           <div>
                             <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{member.jenis_baptis}</p>
                           </div>
                         </div>
                      ) : (
                         <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">Belum ada data baptis</p>
                      )}
                   </div>
                 </div>

                 {/* Removed Gereja Asal */}
                 
                 {member.tanggal_keluar && (
                   <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                         <Clock className="w-3.5 h-3.5" /> Tanggal Keluar
                      </p>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                         {new Date(member.tanggal_keluar).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                      </p>
                   </div>
                 )}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
