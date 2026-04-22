import React, { useRef, useState } from 'react';
import { Member } from '../types';
import { X, Download, User, Droplets, Clock, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { formatDateDDMMYYYY, getDirectDriveLink } from '../lib/utils';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface MemberViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
}

export default function MemberViewModal({ isOpen, onClose, member }: MemberViewModalProps) {
  const { isDarkMode } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  if (!isOpen || !member) return null;

  const prepareImage = async () => {
    if (!printRef.current) return null;
    return await toPng(printRef.current, { 
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      fontEmbedCSS: '', 
      style: { fontFamily: 'Inter, system-ui, sans-serif' }
    });
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const dataUrl = await prepareImage();
      if (!dataUrl) return;
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const finalWidth = pdfWidth - (margin * 2);
      const finalHeight = (imgProps.height * finalWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', margin, margin, finalWidth, finalHeight);
      pdf.save(`Kartu_Jemaat_${member.nama_lengkap.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
       console.error("PDF generation failed:", e);
       alert("Gagal membuat PDF. Coba kembali.");
    } finally {
       setIsGeneratingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsGeneratingImg(true);
    try {
      const dataUrl = await prepareImage();
      if (!dataUrl) return;
      
      const link = document.createElement('a');
      link.download = `Kartu_Jemaat_${member.nama_lengkap.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
       console.error("Image generation failed:", e);
       alert("Gagal mengunduh gambar. Coba kembali.");
    } finally {
       setIsGeneratingImg(false);
    }
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
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:hidden flex-wrap gap-2">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Profil Detail Jemaat
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isGeneratingImg || isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGeneratingImg ? <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span> : <ImageIcon className="w-4 h-4" />}
              {isGeneratingImg ? "Memproses..." : "Unduh JPG"}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf || isGeneratingImg}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGeneratingPdf ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span> : <Download className="w-4 h-4" />}
              {isGeneratingPdf ? "Memproses..." : "Unduh PDF"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Zone */}
        <div className="p-6 md:p-8 overflow-y-auto print:p-0 flex-1 bg-slate-100 dark:bg-slate-950">
          
          {/* Printable Card Container */}
          <div 
            ref={printRef} 
            style={{ fontFamily: 'Inter, sans-serif' }}
            className="bg-white dark:bg-slate-900 mx-auto max-w-2xl shadow-xl overflow-hidden print:shadow-none print:m-0 flex flex-col relative"
          >
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-6 md:p-8 border-b-[6px] border-amber-400 flex items-center gap-6 relative overflow-hidden">
               {/* Decorative background circle */}
               <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
               <div className="absolute bottom-0 right-20 -mb-12 w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-xl"></div>
               
               <div className="w-16 h-16 bg-white rounded-full p-1 shrink-0 shadow-lg relative z-10 flex items-center justify-center">
                  <img src="https://i.ibb.co.com/Xfg0zs6D/GPSTIAA-LOGO.png" alt="GPSTIAA" className="w-full h-full object-contain drop-shadow-sm" />
               </div>
               <div className="relative z-10">
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest drop-shadow-md">KARTU JEMAAT</h1>
                  <h2 className="text-sm md:text-base font-semibold text-blue-100 uppercase tracking-wider mt-1">GPSTIAA Siloam</h2>
               </div>
            </div>
            
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 relative z-10">
               {/* Left Column: Photo & Status */}
               <div className="w-full md:w-48 flex flex-col items-center shrink-0">
                  <div className="w-32 h-40 md:w-36 md:h-48 bg-slate-100 dark:bg-slate-800 rounded-xl border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden relative mb-4">
                     {member.foto_url ? (
                       <img src={getDirectDriveLink(member.foto_url)} alt="Foto Jemaat" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="text-center p-2 flex flex-col items-center justify-center h-full">
                         <User className="w-12 h-12 text-slate-300 dark:text-slate-500 mb-2" />
                         <span className="text-[10px] text-slate-400 font-medium font-mono">3 x 4</span>
                       </div>
                     )}
                  </div>
                  
                  <div className="w-full text-center">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status Keanggotaan</p>
                     <div className={`py-1.5 px-3 rounded-full text-xs font-bold tracking-widest uppercase shadow-inner border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>
                        {isActive ? 'JEMAAT AKTIF' : 'KELUAR'}
                     </div>
                  </div>
               </div>

               {/* Right Column: Biodata */}
               <div className="flex-1 w-full flex flex-col justify-center">
                  <div className="mb-6">
                     <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase leading-tight">{member.nama_lengkap}</h2>
                     <p className="text-sm md:text-base font-mono font-bold text-blue-600 dark:text-blue-400 mt-1 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                        NIA: {member.nomor_anggota || '-'}
                     </p>
                  </div>

                  <div className="space-y-4 text-sm">
                     <div className="grid grid-cols-[120px_1fr] md:grid-cols-[140px_1fr] gap-x-3 items-start">
                        <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Jenis Kelamin</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{member.jenis_kelamin || '-'}</span>
                     </div>
                     <div className="grid grid-cols-[120px_1fr] md:grid-cols-[140px_1fr] gap-x-3 items-start">
                        <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">TTL</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                           {member.tempat_lahir || '-'}, {formatDateDDMMYYYY(member.tanggal_lahir)}
                        </span>
                     </div>
                     <div className="grid grid-cols-[120px_1fr] md:grid-cols-[140px_1fr] gap-x-3 items-start">
                        <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Alamat</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">{member.alamat_asal || '-'}</span>
                     </div>
                     <div className="grid grid-cols-[120px_1fr] md:grid-cols-[140px_1fr] gap-x-3 items-start">
                        <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">No. Telepon</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{member.no_telp || '-'}</span>
                     </div>
                  </div>

                  {/* Church Data Section */}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Droplets className="w-12 h-12 text-blue-900 dark:text-blue-100" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                           <Droplets className="w-3 h-3 text-blue-500" /> Status Baptis
                        </p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{member.jenis_baptis || 'Belum/Kosong'}</p>
                        {member.keterangan_baptis && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{member.keterangan_baptis}</p>}
                     </div>
                     
                     <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Clock className="w-12 h-12 text-emerald-900 dark:text-emerald-100" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                           <Clock className="w-3 h-3 text-emerald-500" /> Riwayat Masuk
                        </p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                           {formatDateDDMMYYYY(member.tanggal_masuk)}
                        </p>
                        {!isActive && member.tanggal_keluar && (
                          <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                             <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Tgl Keluar</span>
                             <span className="text-xs font-semibold text-red-700 dark:text-red-400">{formatDateDDMMYYYY(member.tanggal_keluar)}</span>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* Signature Area */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 flex justify-end border-t border-slate-100 dark:border-slate-800 mt-auto">
               <div className="text-center w-48 relative">
                  {/* Decorative faint stamp placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                     <div className="w-24 h-24 rounded-full border-4 border-slate-900 dark:border-white"></div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-12">Ketua Jemaat / Pendeta</p>
                  <div className="border-b-[1.5px] border-slate-800 dark:border-slate-300 w-full mb-1"></div>
                  <p className="text-[10px] text-slate-500 font-medium">GPSTIAA Siloam</p>
               </div>
            </div>

            {/* Giant Background Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] dark:opacity-[0.03] pointer-events-none rotate-[-15deg] select-none scale-150 transform-gpu">
               <span className="text-[180px] font-black uppercase text-slate-900 dark:text-white leading-none whitespace-nowrap">
                 {isActive ? 'GPSTIAA' : 'KELUAR'}
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
