import React, { useState } from 'react';
import { Save, TableProperties, Trash2, Plus } from 'lucide-react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import DateInputMask from './DateInputMask';
import { useToast } from '../ToastContext';

interface BulkThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export default function BulkThemeModal({ isOpen, onClose, onSuccess }: BulkThemeModalProps) {
  const { addToast } = useToast();
  
  const parseIndonesianDate = (dateStr: string) => {
    dateStr = dateStr.trim();
    if (!dateStr) return "";

    // if already YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    
    // if DD/MM/YYYY or DD-MM-YYYY
    if (dateStr.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
      const [d, m, y] = dateStr.split(/[\/\-]/);
      return `${y}-${m}-${d}`;
    }

    // Handle text like "12 Januari 2023" or "2 Jan 2023"
    const textRegex = /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/;
    const match = dateStr.match(textRegex);
    if (match) {
      const d = match[1].padStart(2, '0');
      const mStr = match[2].toLowerCase();
      
      const monthMap: Record<string, string> = {
        januari: "01", jan: "01",
        februari: "02", pebruari: "02", feb: "02",
        maret: "03", mar: "03",
        april: "04", apr: "04",
        mei: "05",
        juni: "06", jun: "06",
        juli: "07", jul: "07",
        agustus: "08", agu: "08", aug: "08",
        september: "09", sep: "09",
        oktober: "10", okt: "10", oct: "10",
        november: "11", nov: "11",
        desember: "12", des: "12", dec: "12"
      };

      const m = monthMap[mStr];
      if (m) {
        return `${match[3]}-${m}-${d}`;
      }
    }
    return dateStr;
  };

  const createEmptyRow = () => ({
    _localId: crypto.randomUUID(),
    tanggal: "",
    jenis: "Ibadah Umum",
    tema: "",
    ayat: "",
    deskripsi: "",
    pembicara: "",
    perjamuan_kudus: false
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

  const handleChange = (id: string, field: string, value: string | boolean) => {
    setRows(prev => prev.map(row => 
      row._localId === id ? { ...row, [field]: value } : row
    ));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
    
    const target = e.target as HTMLElement;
    const rowIndexStr = target.getAttribute('data-rowindex');
    const colName = target.getAttribute('data-col');
    
    if (rowIndexStr == null || colName == null) return;
    
    e.preventDefault();
    
    const startRowIndex = parseInt(rowIndexStr, 10);
    const colNames = ['tanggal', 'jenis', 'tema', 'ayat', 'deskripsi', 'pembicara', 'perjamuan_kudus'];
    const startColIndex = colNames.indexOf(colName);
    
    if (startColIndex === -1) return;

    const parsedRows = text.split(/\r?\n/).filter(line => line !== '').map(line => line.split('\t'));
    
    setRows(prevRows => {
      const newRows = [...prevRows];
      
      parsedRows.forEach((parsedRow, i) => {
        const targetRowIndex = startRowIndex + i;
        
        while (targetRowIndex >= newRows.length) {
          newRows.push(createEmptyRow());
        }
        
        const rowToUpdate = { ...newRows[targetRowIndex] };
        
        parsedRow.forEach((cellValue, j) => {
          const targetColIndex = startColIndex + j;
          if (targetColIndex < colNames.length) {
            const field = colNames[targetColIndex];
            (rowToUpdate as any)[field] = cellValue.trim();
          }
        });
        
        newRows[targetRowIndex] = rowToUpdate;
      });
      
      return newRows;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const colNames = ['tanggal', 'jenis', 'tema', 'ayat', 'deskripsi', 'pembicara', 'perjamuan_kudus'];
      const currentColIndex = colNames.indexOf(field);
      
      let nextRowIndex = index;
      let nextColName = field;

      if (currentColIndex < colNames.length - 1) {
        nextColName = colNames[currentColIndex + 1];
      } else {
        nextColName = colNames[0];
        nextRowIndex = index + 1;
      }
      
      const nextInput = document.querySelector(`[data-rowindex="${nextRowIndex}"][data-col="${nextColName}"]`) as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      } else if (nextRowIndex === rows.length) {
        handleAddRows(1);
        setTimeout(() => {
          const addedInput = document.querySelector(`[data-rowindex="${nextRowIndex}"][data-col="${nextColName}"]`) as HTMLElement;
          if (addedInput) addedInput.focus();
        }, 50);
      }
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.tema.trim() !== "" && r.tanggal.trim() !== "");
    
    if (validRows.length === 0) {
      addToast("Tidak ada data valid untuk disimpan. Pastikan setidaknya kolom Tanggal dan Tema terisi.", "error");
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    try {
      const batch = writeBatch(db);
      for (const row of validRows) {
        const docRef = doc(collection(db, "worship_themes"));
        
        let typeStr = row.jenis || "Ibadah Umum";
        if (typeStr !== "Ibadah Umum" && typeStr !== "Sekolah Minggu" && typeStr !== "Pemahaman Alkitab") {
          typeStr = "Ibadah Umum";
        }
        
        let formattedDate = parseIndonesianDate(row.tanggal);
        
        let hasHolyCommunion = typeof row.perjamuan_kudus === 'boolean' 
            ? row.perjamuan_kudus 
            : String(row.perjamuan_kudus).toLowerCase() === 'ya' || String(row.perjamuan_kudus).toLowerCase() === 'true';

        batch.set(docRef, {
          date: formattedDate,
          theme: row.tema.trim(),
          verse: row.ayat.trim(),
          description: row.deskripsi.trim(),
          speaker: row.pembicara.trim(),
          hasHolyCommunion: hasHolyCommunion,
          type: typeStr,
          tenantId: "gpstiaa",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        successCount++;
      }
      
      await batch.commit();
      onSuccess(successCount);
      setRows(Array.from({ length: 3 }, createEmptyRow));
      onClose();
    } catch (error) {
      console.error("Error saving bulk theme entry:", error);
      addToast("Terjadi kesalahan saat menyimpan data ke server.", "error");
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
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Input Massal (Grid) Tema Ibadah</h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 inline-block px-2 py-0.5 rounded">💡 Tips: Anda dapat <strong>Copy-Paste langsung dari Excel</strong>. Klik pada sel pertama lalu Paste (Ctrl+V / Cmd+V).</p>
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
            {isSaving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Entri</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-max border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-10 text-center">#</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tanggal *</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Jenis Ibadah *</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Tema/Judul *</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Ayat</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Deskripsi</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Pengkhotbah (Opsional)</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">Perjamuan Kudus</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700 text-center w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60" onPaste={handlePaste}>
              {rows.map((row, index) => (
                <tr key={row._localId} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/80 group">
                  <td className="px-3 py-1 text-xs text-slate-400 text-center font-mono sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/80 z-10 transition-colors">{index + 1}</td>
                  
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors w-32 relative">
                    <DateInputMask
                      name="tanggal" 
                      value={row.tanggal} 
                      onChange={(e) => handleChange(row._localId, 'tanggal', e.target.value)} 
                      onKeyDown={(e) => handleKeyDown(e as any, index, 'tanggal')} 
                      data-col="tanggal" 
                      data-rowindex={index} 
                      className={`${inputClass} font-mono`} 
                    />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.jenis} onChange={(e) => handleChange(row._localId, 'jenis', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'jenis')} data-col="jenis" data-rowindex={index} className={`${inputClass} font-semibold`} placeholder="Ibadah Umum" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.tema} onChange={(e) => handleChange(row._localId, 'tema', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'tema')} data-col="tema" data-rowindex={index} className={`${inputClass}`} placeholder="Tema..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.ayat} onChange={(e) => handleChange(row._localId, 'ayat', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'ayat')} data-col="ayat" data-rowindex={index} className={`${inputClass}`} placeholder="mis. Yoh 3:16" />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.deskripsi} onChange={(e) => handleChange(row._localId, 'deskripsi', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'deskripsi')} data-col="deskripsi" data-rowindex={index} className={`${inputClass}`} placeholder="Deskripsi..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent transition-colors">
                    <input type="text" value={row.pembicara} onChange={(e) => handleChange(row._localId, 'pembicara', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'pembicara')} data-col="pembicara" data-rowindex={index} className={`${inputClass}`} placeholder="Pdt. / Pengerja..." />
                  </td>
                  <td className="px-2 py-1 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 group-hover:bg-transparent text-center transition-colors">
                    <input type="checkbox" checked={row.perjamuan_kudus} onChange={(e) => handleChange(row._localId, 'perjamuan_kudus', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
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
