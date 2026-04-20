import React, { useRef } from 'react';
import { Member } from '../types';
import { X, Printer, User, MapPin, Phone, Calendar, Droplets, BookOpen, Clock } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface MemberViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
}

export default function MemberViewModal({ isOpen, onClose, member }: MemberViewModalProps) {
  const { isDarkMode } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !member) return null;

  const handlePrint = () => {
    window.print();
  };

  const isActive = !member.tanggal_keluar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" 
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:h-auto border border-slate-200 dark:border-slate-700 w-full">
        
        {/* Header Action Bar */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:hidden">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Profil Detail Jemaat
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-semibold transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Zone */}
        <div className="p-6 md:p-8 overflow-y-auto print:p-0 flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none">
          
          {/* Printable Card Container */}
          <div 
            ref={printRef} 
            className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-xl shadow-sm border text-slate-800 dark:text-slate-200 print:shadow-none print:border-none print:m-0 mx-auto max-w-2xl border-slate-300 dark:border-slate-700 relative overflow-hidden"
          >
            {/* Watermark / Decoration */}
            <div className="absolute top-0 left-0 w-full h-3 bg-blue-600 dark:bg-blue-500 print:bg-blue-600"></div>
            
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-200 dark:border-slate-700">
              <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-white print:text-black">KARTU JEMAAT</h1>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">GPSTIAA Siloam</h2>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* Photo Area placeholder / actual photo */}
              <div className="w-32 h-40 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center shrink-0 overflow-hidden mx-auto md:mx-0">
                {member.foto_url ? (
                  <img src={member.foto_url} alt="Foto Jemaat" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-center p-2">
                    <User className="w-10 h-10 text-slate-300 dark:text-slate-500 mx-auto mb-2" />
                    <span className="text-[10px] text-slate-400 font-medium">Pas Foto 3x4</span>
                  </div>
                )}
              </div>
              
              {/* Data Table */}
              <div className="flex-1 w-full space-y-4">
                
                <div className="grid grid-cols-[120px_auto] sm:grid-cols-[140px_auto] gap-x-2 gap-y-1 align-top items-start">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1">No. Anggota</div>
                  <div className="font-mono font-bold text-base text-blue-700 dark:text-blue-400 py-1">{member.nomor_anggota || '-'}</div>

                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1 border-t border-slate-100 dark:border-slate-800 mt-2 pt-3">Nama Lengkap</div>
                  <div className="font-bold text-lg text-slate-800 dark:text-slate-100 py-1 border-t border-slate-100 dark:border-slate-800 mt-2 pt-3">{member.nama_lengkap}</div>
                  
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1">Jenis Kelamin</div>
                  <div className="font-medium text-sm text-slate-700 dark:text-slate-200 py-1">{member.jenis_kelamin || '-'}</div>
                  
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1">Tempat, Tgl Lahir</div>
                  <div className="font-medium text-sm text-slate-700 dark:text-slate-200 py-1">
                    {member.tempat_lahir || '-'}, {member.tanggal_lahir ? new Date(member.tanggal_lahir).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}
                  </div>
                  
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1">Alamat Asal</div>
                  <div className="font-medium text-sm text-slate-700 dark:text-slate-200 py-1">{member.alamat_asal || '-'}</div>
                  
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1">No. Telepon</div>
                  <div className="font-mono text-sm text-slate-700 dark:text-slate-200 py-1">{member.no_telp || '-'}</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mt-6 border border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Droplets className="w-3 h-3" /> Status Baptis
                      </p>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{member.jenis_baptis || 'Belum Baptis'}</p>
                      {member.keterangan_baptis && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{member.keterangan_baptis}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3" /> Riwayat
                      </p>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        Masuk: {member.tanggal_masuk ? new Date(member.tanggal_masuk).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}
                      </p>
                      {!isActive && member.tanggal_keluar && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                          Keluar: {new Date(member.tanggal_keluar).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right mt-8 pt-6">
                  <div className="inline-block text-center mr-8">
                     <p className="text-xs text-slate-500 dark:text-slate-400 mb-12">Ketua Jemaat / Pendeta</p>
                     <p className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-800 dark:border-slate-200 px-4">....................................</p>
                  </div>
                </div>
                
              </div>
            </div>
            
            {/* Status watermark */}
            <div className="absolute -bottom-8 -right-8 opacity-5 dark:opacity-[0.02] pointer-events-none rotate-[-15deg]">
              <span className="text-[150px] font-black uppercase text-slate-900 dark:text-white leading-none">
                {isActive ? 'AKTIF' : 'KELUAR'}
              </span>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #root {
            display: none;
          }
          .fixed.inset-0 {
            position: absolute !important;
            visibility: visible !important;
          }
          .fixed.inset-0 * {
            visibility: visible;
          }
        }
      `}} />
    </div>
  );
}
