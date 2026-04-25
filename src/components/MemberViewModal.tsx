import React, { useRef, useState, useEffect } from 'react';
import { Member } from '../types';
import { X, Download, User, Droplets, Clock, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { formatDateDDMMYYYY, getDirectDriveLink, formatNameTitleCase } from '../lib/utils';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface MemberViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  ketuaJemaat?: string;
}

export default function MemberViewModal({ isOpen, onClose, member, ketuaJemaat = "Pdt. R.H. Siregar, M.Th" }: MemberViewModalProps) {
  const { isDarkMode } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const updateScale = () => {
      if (modalContentRef.current) {
        const parentWidth = modalContentRef.current.offsetWidth;
        // Padding is p-6 (24px) * 2 = 48px, plus small safe margin
        const availableWidth = parentWidth - 64; 
        if (availableWidth < 856) {
           setScale(availableWidth / 856);
        } else {
           setScale(1);
        }
      }
    };
    
    setTimeout(updateScale, 50);
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isOpen]);

  if (!isOpen || !member) return null;

  const prepareImage = async () => {
    if (!printRef.current) return null;
    
    // Simpan skala asli dan force reset ke 1 sebelum capture agar tidak terpotong
    const originalScale = scale;
    setScale(1);
    
    // Memberikan waktu browser untuk me-render gambar pada ukuran asli (scale 1)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const dataUrl = await toPng(printRef.current, { 
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true, // Melewati proses parsing font internal yang sering menyebabkan error ".trim()"
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        width: 856,
        height: 540,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
        }
      });
      return dataUrl;
    } finally {
      // Kembalikan ke skala tampilan semula
      setScale(originalScale);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const dataUrl = await prepareImage();
      if (!dataUrl) return;
      
      // Menggunakan ukuran standar kartu ID/KTP Landscape: 85.6mm x 53.98mm (CR80)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 53.98] });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Kartu_Jemaat_${formatNameTitleCase(member.nama_lengkap).replace(/\s+/g, '_')}.pdf`);
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
      link.download = `Kartu_Jemaat_${formatNameTitleCase(member.nama_lengkap).replace(/\s+/g, '_')}.png`;
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
        <div ref={modalContentRef} className="p-6 md:p-8 overflow-y-auto overflow-x-hidden print:p-0 flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col items-center">
          
          {/* Printable Card Container (Landscape ID Proportions width 856px, height 540px) 
              We use a CSS Transform scale wrapper to avoid any scrollable boundaries clipping html-to-image captures.
          */}
          <div 
            className="relative shrink-0 transition-transform duration-200"
            style={{ width: `${856 * scale}px`, height: `${540 * scale}px` }}
          >
            <div 
              ref={printRef} 
              className="bg-white dark:bg-slate-900 shadow-xl overflow-hidden print:shadow-none print:m-0 flex flex-col absolute top-0 left-0 origin-top-left font-sans shrink-0 border border-slate-200 dark:border-slate-800 rounded-xl"
              style={{ 
                width: '856px', 
                height: '540px',
                transform: `scale(${scale})`
              }}
            >
              {/* Header / Banner */}
              <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-8 py-5 border-b-[6px] border-amber-400 flex flex-row items-center gap-6 relative overflow-hidden text-left h-[100px] shrink-0">
                 {/* Decorative background circle */}
                 <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
                 <div className="absolute bottom-0 right-20 -mb-12 w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-xl"></div>
                 
                 <div className="h-16 w-auto shrink-0 relative z-10 flex items-center justify-center bg-white p-1.5 rounded-xl shadow-md">
                    <img src="https://i.ibb.co.com/Xfg0zs6D/GPSTIAA-LOGO.png" alt="GPSTIAA" className="h-full w-auto object-contain" crossOrigin="anonymous" />
                 </div>
                 <div className="relative z-10">
                    <h1 className="text-2xl font-black uppercase tracking-widest drop-shadow-md leading-tight">KARTU JEMAAT</h1>
                    <h2 className="text-sm font-semibold text-blue-100 uppercase tracking-wider mt-0.5">GPSTIAA Siloam</h2>
                 </div>
              </div>
              
              <div className="px-8 pb-8 pt-6 flex flex-row gap-8 relative z-10 flex-1">
                 {/* Left Column: Photo & Status */}
                 <div className="w-40 flex flex-col items-center shrink-0 pt-2">
                    <div className="w-[120px] h-[160px] bg-slate-100 dark:bg-slate-800 rounded-xl border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden relative mb-4 flex items-center justify-center">
                         <div className="text-center p-2 flex flex-col items-center justify-center h-full absolute z-0">
                           <User className="w-10 h-10 text-slate-300 dark:text-slate-500 mb-2" />
                           <span className="text-[9px] text-slate-400 font-medium font-mono">3 x 4</span>
                         </div>
                       {member.foto_url && (
                         <img src={getDirectDriveLink(member.foto_url)} alt="Foto Jemaat" className="w-full h-full object-cover relative z-10" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
               <div className="flex-1 w-full flex flex-col justify-start pt-2">
                  <div className="mb-4">
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight truncate">{formatNameTitleCase(member.nama_lengkap)}</h2>
                     <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 pb-2 border-b-2 border-slate-100 dark:border-slate-800">
                        NIA: {member.nomor_anggota || '-'}
                     </p>
                  </div>

                  <div className="space-y-2 text-xs">
                     <div className="grid grid-cols-[100px_1fr] md:grid-cols-[110px_1fr] gap-x-2 items-start">
                        <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Jenis Kelamin</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{member.jenis_kelamin || '-'}</span>
                     </div>
                     <div className="grid grid-cols-[100px_1fr] md:grid-cols-[110px_1fr] gap-x-2 items-start">
                        <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">TTL</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                           {member.tempat_lahir || '-'}, {formatDateDDMMYYYY(member.tanggal_lahir)}
                        </span>
                     </div>
                     <div className="grid grid-cols-[100px_1fr] md:grid-cols-[110px_1fr] gap-x-2 items-start">
                        <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Alamat</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words line-clamp-2" title={member.alamat_asal}>{member.alamat_asal || '-'}</span>
                     </div>
                     <div className="grid grid-cols-[100px_1fr] md:grid-cols-[110px_1fr] gap-x-2 items-start">
                        <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">No. Telepon</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{member.no_telp || '-'}</span>
                     </div>
                  </div>

                  {/* Church Data Section */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                     <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1.5 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Droplets className="w-8 h-8 text-blue-900 dark:text-blue-100" />
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                           <Droplets className="w-2.5 h-2.5 text-blue-500" /> Status Baptis
                        </p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{member.jenis_baptis || 'Belum/Kosong'}</p>
                     </div>
                     
                     <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1.5 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Clock className="w-8 h-8 text-emerald-900 dark:text-emerald-100" />
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                           <Clock className="w-2.5 h-2.5 text-emerald-500" /> Riwayat Masuk
                        </p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                           {formatDateDDMMYYYY(member.tanggal_masuk)}
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Signature Area */}
            <div className="absolute bottom-6 right-8 text-center w-36">
               {/* Decorative faint stamp placeholder */}
               <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none -mt-4">
                  <div className="w-16 h-16 rounded-full border-2 border-slate-900 dark:border-white"></div>
               </div>
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-8">Ketua Jemaat</p>
               <div className="border-b-[1.5px] border-slate-800 dark:border-slate-300 w-full mb-0.5"></div>
               <p className="text-[8px] text-slate-500 font-medium whitespace-nowrap">{ketuaJemaat}</p>
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
