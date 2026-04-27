import React, { useState } from 'react';
import { X, Plus, Save, Trash2, AlertCircle, TableProperties } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Member } from '../types';
import { formatNameTitleCase } from '../lib/utils';
import DateInputMask from './DateInputMask';

interface BulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export default function BulkEntryModal({ isOpen, onClose, onSuccess }: BulkEntryModalProps) {
  const createEmptyRow = () => ({
    _localId: crypto.randomUUID(),
    no_urut: "",
    tahun: "",
    nama_lengkap: "",
    jenis_kelamin: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    no_telp: "",
    alamat_asal: "",
    jenis_baptis: "",
    keterangan_baptis: "",
    tanggal_masuk: "",
    tanggal_keluar: "",
    foto_url: ""
  });

  const [rows, setRows] = useState(Array.from({ length: 10 }, createEmptyRow));
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
        // Automatically add more rows if we hit the bottom
        handleAddRows(1);
        setTimeout(() => {
          const addedInput = document.querySelector(`[data-rowindex="${nextRowIndex}"][data-col="${field}"]`) as HTMLElement;
          if (addedInput) addedInput.focus();
        }, 50);
      }
    }
  };

  const handleSave = async () => {
    // Filter only rows that have at least a Name
    const validRows = rows.filter(r => r.nama_lengkap.trim() !== "");
    
    if (validRows.length === 0) {
      alert("Tidak ada data valid untuk disimpan. Pastikan setidaknya kolom Nama Lengkap terisi.");
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    try {
      for (const row of validRows) {
        const docId = doc(collection(db, "members")).id;
        
        let nomorAnggota = "";
        if (row.no_urut && row.tahun) nomorAnggota = `${row.no_urut}/GPSTIAA/${row.tahun}`;
        else if (row.no_urut) nomorAnggota = row.no_urut;

        const memberData: Member = {
          nomor_anggota: nomorAnggota,
          nama_lengkap: formatNameTitleCase(row.nama_lengkap.trim()),
          jenis_kelamin: (row.jenis_kelamin === "Pria" || row.jenis_kelamin === "Wanita") ? row.jenis_kelamin : "",
          tempat_lahir: row.tempat_lahir.trim(),
          tanggal_lahir: row.tanggal_lahir,
          no_telp: row.no_telp.trim(),
          alamat_asal: row.alamat_asal.trim(),
          jenis_baptis: row.jenis_baptis,
          keterangan_baptis: row.keterangan_baptis.trim(),
          tanggal_masuk: row.tanggal_masuk,
          tanggal_keluar: row.tanggal_keluar,
          foto_url: typeof row.foto_url === 'string' ? row.foto_url.trim() : "",
          tenantId: "gpstiaa",
        };

        await setDoc(doc(db, "members", docId), {
          ...memberData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        successCount++;
      }
      
      onSuccess(successCount);
      // Reset form
      setRows(Array.from({ length: 15 }, createEmptyRow));
      onClose();
    } catch (error) {
      console.error("Error saving bulk entry:", error);
      alert("Terjadi kesalahan saat menyimpan data ke server.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full min-w-[120px] bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const selectClass = "w-full min-w-[110px] bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 px-1 py-1.5 text-sm text-slate-800 dark:text-slate-100 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Input Massal (Grid)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Isi baris layaknya spreadsheet Microsoft Excel. Tekan <strong>Tab</strong> untuk ke kanan, <strong>Enter</strong> untuk turun. Baris kosong akan diabaikan.</p>
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
            {isSaving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Semua Data</>}
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-max border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 select-none w-10 text-center">#</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">No Urut</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Thn Agt</th>
                <th className="px-3 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700 sticky left-10 bg-slate-50 dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#334155] min-w-[200px]">Nama Lengkap *</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">L / P</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tempat Lahir</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tgl Lahir</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700 min-w-[250px]">Alamat Asal</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">No Telp</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Jenis Baptis</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Ket Baptis</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tgl Masuk</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tgl Keluar</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Link Foto</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700 text-center select-none w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {rows.map((row, index) => (
                <tr key={row._localId} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/80 group">
                  <td className="px-3 py-1 text-xs text-slate-400 text-center font-mono sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/80 z-10 transition-colors">{index + 1}</td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.no_urut} onChange={(e) => handleChange(row._localId, 'no_urut', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'no_urut')} data-col="no_urut" data-rowindex={index} className={`${inputClass} w-16 text-center font-mono`} placeholder="001" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.tahun} onChange={(e) => handleChange(row._localId, 'tahun', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'tahun')} data-col="tahun" data-rowindex={index} className={`${inputClass} w-16 text-center font-mono`} placeholder="2024" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-200 dark:border-slate-700 sticky left-10 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/80 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#1e293b] transition-colors">
                    <input type="text" value={row.nama_lengkap} onChange={(e) => handleChange(row._localId, 'nama_lengkap', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'nama_lengkap')} data-col="nama_lengkap" data-rowindex={index} className={`${inputClass} font-semibold min-w-[200px]`} placeholder="Ketik nama (Wajib)..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <select value={row.jenis_kelamin} onChange={(e) => handleChange(row._localId, 'jenis_kelamin', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'jenis_kelamin')} data-col="jenis_kelamin" data-rowindex={index} className={selectClass}>
                      <option value="">--</option>
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.tempat_lahir} onChange={(e) => handleChange(row._localId, 'tempat_lahir', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'tempat_lahir')} data-col="tempat_lahir" data-rowindex={index} className={inputClass} placeholder="Kota lahir" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors w-32 relative">
                    <DateInputMask
                      name="tanggal_lahir" 
                      value={row.tanggal_lahir} 
                      onChange={(e) => handleChange(row._localId, 'tanggal_lahir', e.target.value)} 
                      onKeyDown={(e) => handleKeyDown(e as any, index, 'tanggal_lahir')} 
                      data-col="tanggal_lahir" 
                      data-rowindex={index} 
                      className={`${inputClass} font-mono`} 
                    />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.alamat_asal} onChange={(e) => handleChange(row._localId, 'alamat_asal', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'alamat_asal')} data-col="alamat_asal" data-rowindex={index} className={`${inputClass} min-w-[250px]`} placeholder="Alamat lengkap" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="tel" value={row.no_telp} onChange={(e) => handleChange(row._localId, 'no_telp', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'no_telp')} data-col="no_telp" data-rowindex={index} className={`${inputClass} font-mono`} placeholder="08..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <select value={row.jenis_baptis} onChange={(e) => handleChange(row._localId, 'jenis_baptis', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'jenis_baptis')} data-col="jenis_baptis" data-rowindex={index} className={selectClass}>
                      <option value="">Belum</option>
                      <option value="Baptis Kecil">B. Kecil</option>
                      <option value="SIDI">SIDI</option>
                      <option value="Baptis Dewasa">B. Dewasa</option>
                    </select>
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.keterangan_baptis} onChange={(e) => handleChange(row._localId, 'keterangan_baptis', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'keterangan_baptis')} data-col="keterangan_baptis" data-rowindex={index} className={inputClass} placeholder="Gereja Baptis..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors w-32 relative">
                    <DateInputMask
                      name="tanggal_masuk" 
                      value={row.tanggal_masuk} 
                      onChange={(e) => handleChange(row._localId, 'tanggal_masuk', e.target.value)} 
                      onKeyDown={(e) => handleKeyDown(e as any, index, 'tanggal_masuk')} 
                      data-col="tanggal_masuk" 
                      data-rowindex={index} 
                      className={`${inputClass} font-mono`} 
                    />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors w-32 relative">
                    <DateInputMask
                      name="tanggal_keluar" 
                      value={row.tanggal_keluar} 
                      onChange={(e) => handleChange(row._localId, 'tanggal_keluar', e.target.value)} 
                      onKeyDown={(e) => handleKeyDown(e as any, index, 'tanggal_keluar')} 
                      data-col="tanggal_keluar" 
                      data-rowindex={index} 
                      className={`${inputClass} font-mono`} 
                    />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="url" value={row.foto_url} onChange={(e) => handleChange(row._localId, 'foto_url', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'foto_url')} data-col="foto_url" data-rowindex={index} className={`${inputClass} min-w-[200px]`} placeholder="https://" />
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

        {/* Bottom Actions */}
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <button
            onClick={() => handleAddRows(5)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
          >
            <Plus className="w-4 h-4" /> Tambah 5 Baris
          </button>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ml-auto bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
            <AlertCircle className="w-4 h-4" />
            <span>Format No Anggota akan otomatis tergabung: <strong className="font-mono">NO_URUT / GPSTIAA / THN_AGT</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
}
