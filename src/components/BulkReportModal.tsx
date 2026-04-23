import React, { useState } from 'react';
import { X, Plus, Save, Trash2, TableProperties } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WeeklyReport } from '../types';
import DateInputMask from './DateInputMask';

interface BulkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const formatRupiah = (value: number | string) => {
  const numberString = value.toString().replace(/[^,\d]/g, '');
  if (!numberString) return '';
  return new Intl.NumberFormat('id-ID').format(Number(numberString));
};

const parseRupiah = (value: string) => {
  const numberString = value.replace(/[^,\d]/g, '');
  return numberString ? Number(numberString) : 0;
};

export default function BulkReportModal({ isOpen, onClose, onSuccess }: BulkReportModalProps) {
  const createEmptyRow = () => ({
    _localId: crypto.randomUUID(),
    tanggal_ibadah: "",
    nama_ibadah: "",
    kehadiran_dewasa: "0",
    kehadiran_pemuda: "0",
    kehadiran_anak: "0",
    persembahan_umum: "0",
    perpuluhan: "0",
    diakonia: "0",
    pemasukan_lainnya: "0",
    pengeluaran: "0",
    keterangan_pengeluaran: "",
    keterangan: ""
  });

  const [rows, setRows] = useState(Array.from({ length: 3 }, createEmptyRow));
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddRows = (count: number) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, createEmptyRow)]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r._localId !== id));
  };

  const handleChange = (id: string, field: string, value: string) => {
    setRows(prev => prev.map(row => 
      row._localId === id ? { ...row, [field]: value } : row
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextRowIndex = index + 1;
      const nextInput = document.querySelector(`[data-rowindex="${nextRowIndex}"][data-col="${field}"]`) as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      } else if (nextRowIndex === rows.length) {
        handleAddRows(1);
        setTimeout(() => {
          const addedInput = document.querySelector(`[data-rowindex="${nextRowIndex}"][data-col="${field}"]`) as HTMLElement;
          if (addedInput) addedInput.focus();
        }, 50);
      }
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.nama_ibadah.trim() !== "" && r.tanggal_ibadah.trim() !== "");
    
    if (validRows.length === 0) {
      alert("Tidak ada data valid untuk disimpan. Pastikan setidaknya kolom Tanggal dan Nama Ibadah terisi.");
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    try {
      for (const row of validRows) {
        const docId = doc(collection(db, "weekly_reports")).id;
        
        const reportData: WeeklyReport = {
          tanggal_ibadah: row.tanggal_ibadah,
          nama_ibadah: row.nama_ibadah.trim(),
          kehadiran_dewasa: Number(row.kehadiran_dewasa) || 0,
          kehadiran_pemuda: Number(row.kehadiran_pemuda) || 0,
          kehadiran_anak: Number(row.kehadiran_anak) || 0,
          persembahan_umum: parseRupiah(row.persembahan_umum),
          perpuluhan: parseRupiah(row.perpuluhan),
          diakonia: parseRupiah(row.diakonia),
          pemasukan_lainnya: parseRupiah(row.pemasukan_lainnya),
          pengeluaran: parseRupiah(row.pengeluaran),
          keterangan_pengeluaran: row.keterangan_pengeluaran.trim(),
          keterangan: row.keterangan.trim(),
          tenantId: "gpstiaa",
        };

        await setDoc(doc(db, "weekly_reports", docId), {
          ...reportData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        successCount++;
      }
      
      onSuccess(successCount);
      setRows(Array.from({ length: 3 }, createEmptyRow));
      onClose();
    } catch (error) {
      console.error("Error saving bulk report entry:", error);
      alert("Terjadi kesalahan saat menyimpan data ke server.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full min-w-[100px] bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
      
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Input Massal (Grid) Laporan Keuangan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tekan <strong>Tab</strong> untuk ke kanan, <strong>Enter</strong> untuk turun. Minimal 3 baris disediakan.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
          >
            Tutup
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {isSaving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Laporan</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-max border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-10 text-center">#</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tgl Ibadah *</th>
                <th className="px-3 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700 min-w-[200px]">Nama Ibadah *</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Hadir Dws</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Hadir Pmd</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Hadir Ank</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Persembahan (Rp)</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Perpuluhan (Rp)</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Diakonia (Rp)</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Pemasukan Lain (Rp)</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Pengeluaran (Rp)</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Ket Pengeluaran</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Keterangan Lain</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700 text-center w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {rows.map((row, index) => (
                <tr key={row._localId} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/80 group">
                  <td className="px-3 py-1 text-xs text-slate-400 text-center font-mono sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/80 z-10 transition-colors">{index + 1}</td>
                  
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors w-32 relative">
                    <DateInputMask
                      name="tanggal_ibadah" 
                      value={row.tanggal_ibadah} 
                      onChange={(e) => handleChange(row._localId, 'tanggal_ibadah', e.target.value)} 
                      onKeyDown={(e: any) => handleKeyDown(e, index, 'tanggal_ibadah')} 
                      data-col="tanggal_ibadah" 
                      data-rowindex={index} 
                      className={`${inputClass} font-mono`} 
                    />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.nama_ibadah} onChange={(e) => handleChange(row._localId, 'nama_ibadah', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'nama_ibadah')} data-col="nama_ibadah" data-rowindex={index} className={`${inputClass} font-semibold`} placeholder="Ibadah Raya..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="number" min="0" value={row.kehadiran_dewasa} onChange={(e) => handleChange(row._localId, 'kehadiran_dewasa', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'kehadiran_dewasa')} data-col="kehadiran_dewasa" data-rowindex={index} className={`${inputClass} w-16 text-center`} />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="number" min="0" value={row.kehadiran_pemuda} onChange={(e) => handleChange(row._localId, 'kehadiran_pemuda', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'kehadiran_pemuda')} data-col="kehadiran_pemuda" data-rowindex={index} className={`${inputClass} w-16 text-center`} />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="number" min="0" value={row.kehadiran_anak} onChange={(e) => handleChange(row._localId, 'kehadiran_anak', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'kehadiran_anak')} data-col="kehadiran_anak" data-rowindex={index} className={`${inputClass} w-16 text-center`} />
                  </td>

                  {/* Financial Inputs */}
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={formatRupiah(row.persembahan_umum)} onChange={(e) => handleChange(row._localId, 'persembahan_umum', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'persembahan_umum')} data-col="persembahan_umum" data-rowindex={index} className={`${inputClass} text-right font-mono min-w-[120px]`} placeholder="0" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={formatRupiah(row.perpuluhan)} onChange={(e) => handleChange(row._localId, 'perpuluhan', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'perpuluhan')} data-col="perpuluhan" data-rowindex={index} className={`${inputClass} text-right font-mono min-w-[120px]`} placeholder="0" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={formatRupiah(row.diakonia)} onChange={(e) => handleChange(row._localId, 'diakonia', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'diakonia')} data-col="diakonia" data-rowindex={index} className={`${inputClass} text-right font-mono min-w-[120px]`} placeholder="0" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={formatRupiah(row.pemasukan_lainnya)} onChange={(e) => handleChange(row._localId, 'pemasukan_lainnya', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'pemasukan_lainnya')} data-col="pemasukan_lainnya" data-rowindex={index} className={`${inputClass} text-right font-mono min-w-[120px]`} placeholder="0" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={formatRupiah(row.pengeluaran)} onChange={(e) => handleChange(row._localId, 'pengeluaran', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'pengeluaran')} data-col="pengeluaran" data-rowindex={index} className={`${inputClass} text-right font-mono text-red-500 min-w-[120px]`} placeholder="0" />
                  </td>
                  
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.keterangan_pengeluaran} onChange={(e) => handleChange(row._localId, 'keterangan_pengeluaran', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'keterangan_pengeluaran')} data-col="keterangan_pengeluaran" data-rowindex={index} className={`${inputClass} min-w-[150px]`} placeholder="..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.keterangan} onChange={(e) => handleChange(row._localId, 'keterangan', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'keterangan')} data-col="keterangan" data-rowindex={index} className={`${inputClass} min-w-[150px]`} placeholder="..." />
                  </td>

                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent text-center transition-colors">
                    <button 
                      onClick={() => handleRemoveRow(row._localId)}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors focus:outline-none"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <button
            onClick={() => handleAddRows(5)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
          >
            <Plus className="w-4 h-4" /> Tambah 5 Baris
          </button>
        </div>
      </div>
    </div>
  );
}
