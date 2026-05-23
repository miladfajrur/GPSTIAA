import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { MisiFinance } from '../types';
import { parseIndonesianDateInput } from '../lib/utils';

interface BulkMisiFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: MisiFinance[]) => void;
}

export default function BulkMisiFinanceModal({ isOpen, onClose, onSave }: BulkMisiFinanceModalProps) {
  const [dataText, setDataText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = () => {
    setError(null);
    if (!dataText.trim()) {
      setError('Data tidak boleh kosong');
      return;
    }

    const lines = dataText.trim().split('\n');
    const parsedData: MisiFinance[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split('\t').map(col => col.trim());
      
      if (cols.length < 4) {
        setError(`Baris ${i + 1} tidak valid. Minimum butuh 4 kolom (Tanggal, Jenis, Kategori, Jumlah).`);
        return;
      }

      const rawDate = cols[0];
      const type = cols[1];
      const category = cols[2];
      const amountStr = cols[3];
      const desc = cols[4] || '';

      const date = parseIndonesianDateInput(rawDate.replace(/\//g, '-'));

      if (type !== 'Pemasukan' && type !== 'Pengeluaran') {
        setError(`Baris ${i + 1}: Jenis harus "Pemasukan" atau "Pengeluaran". Ditemukan "${type}"`);
        return;
      }

      const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(amount)) {
        setError(`Baris ${i + 1}: Jumlah tidak valid "${amountStr}"`);
        return;
      }

      parsedData.push({
        tenantId: 'gpstiaa',
        date,
        type: type as 'Pemasukan' | 'Pengeluaran',
        category,
        amount,
        description: desc
      });
    }

    onSave(parsedData);
    setDataText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <Upload className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Input Massal Keuangan (Paste dari Excel/Sheets)</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm mb-4">
            <p className="font-semibold mb-2">Urutan Kolom (Pisahkan dengan Tab/Copy dari Excel):</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Tanggal</strong> (Wajib, format DD-MM-YYYY atau YYYY-MM-DD)</li>
              <li><strong>Jenis</strong> (Wajib, "Pemasukan" atau "Pengeluaran")</li>
              <li><strong>Kategori</strong> (Wajib)</li>
              <li><strong>Jumlah</strong> (Wajib, angka saja/boleh pakai titik)</li>
              <li><strong>Keterangan</strong> (Opsional)</li>
            </ol>
          </div>

          <textarea
            value={dataText}
            onChange={(e) => setDataText(e.target.value)}
            className="w-full h-48 border dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder={`01-05-2024\tPemasukan\tPersembahan\t1500000\tIbadah Raya\n02-05-2024\tPengeluaran\tKonsumsi\t500000\tRapat Pengurus`}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-5 py-2.5 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
          <button onClick={handleProcess} className="px-5 py-2.5 font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" /> Proses Data
          </button>
        </div>
      </div>
    </div>
  );
}
