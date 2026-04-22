import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import Papa from "papaparse";
import { Plus, Edit2, Trash2, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../lib/firebase";
import { WeeklyReport } from "../types";
import WeeklyReportModal from "./WeeklyReportModal";

export default function WeeklyReportsPanel() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | undefined>(undefined);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "weekly_reports"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("tanggal_ibadah", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: WeeklyReport[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as WeeklyReport);
      });
      setReports(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveReport = async (reportData: Partial<WeeklyReport>) => {
    try {
      if (selectedReport && selectedReport.id) {
        // Edit
        const docRef = doc(db, "weekly_reports", selectedReport.id);
        const submitData = { ...reportData, updatedAt: serverTimestamp() };
        delete submitData.id;
        await setDoc(docRef, submitData, { merge: true });
      } else {
        // Create
        const docRef = doc(collection(db, "weekly_reports"));
        await setDoc(docRef, {
          ...reportData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      try {
        await deleteDoc(doc(db, "weekly_reports", reportToDelete));
        setReportToDelete(null);
      } catch (error) {
        console.error("Error deleting report: ", error);
        alert("Gagal menghapus laporan.");
      }
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleExportCSV = () => {
    const csvData = reports.map(r => ({
      "Tanggal Ibadah": r.tanggal_ibadah,
      "Nama Ibadah": r.nama_ibadah,
      "Kehadiran Dewasa": r.kehadiran_dewasa,
      "Kehadiran Pemuda": r.kehadiran_pemuda,
      "Kehadiran Anak": r.kehadiran_anak,
      "Total Kehadiran": r.kehadiran_dewasa + r.kehadiran_pemuda + r.kehadiran_anak,
      "Persembahan Umum": r.persembahan_umum,
      "Perpuluhan": r.perpuluhan,
      "Diakonia": r.diakonia,
      "Pemasukan Lainnya": r.pemasukan_lainnya,
      "Total Pemasukan": r.persembahan_umum + r.perpuluhan + r.diakonia + r.pemasukan_lainnya,
      "Keterangan": r.keterangan || ""
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_kebaktian_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = [...reports].reverse().map(r => ({
    name: formatDate(r.tanggal_ibadah).split(' ').slice(0, 2).join(' '),
    Dewasa: r.kehadiran_dewasa,
    Pemuda: r.kehadiran_pemuda,
    Anak: r.kehadiran_anak,
    Total: r.kehadiran_dewasa + r.kehadiran_pemuda + r.kehadiran_anak,
    TotalPemasukan: r.persembahan_umum + r.perpuluhan + r.diakonia + r.pemasukan_lainnya
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Kebaktian & Keuangan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Arsip data kehadiran jemaat dan laporan pemasukan mingguan gereja</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2 focus:outline-none"
          >
            <Download className="w-4 h-4" /> Unduh Laporan
          </button>
          <button
            onClick={() => {
              setSelectedReport(undefined);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-semibold transition-colors focus:outline-none flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Laporan
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col">
        {reports.length > 0 && !isLoading && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div>
               <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Grafik Tren Kehadiran</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                     <XAxis dataKey="name" tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" />
                     <YAxis tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b', fontSize: '12px' }}
                        itemStyle={{ color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#475569' }}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px', color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#475569' }} />
                     <Line type="monotone" dataKey="Dewasa" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 3 }} />
                     <Line type="monotone" dataKey="Pemuda" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                     <Line type="monotone" dataKey="Anak" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                     <Line type="monotone" dataKey="Total" stroke="#64748B" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
             
             <div>
               <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Grafik Tren Pemasukan</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                     <XAxis dataKey="name" tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" />
                     <YAxis tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b', fontSize: '12px' }}
                        itemStyle={{ color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#475569' }}
                        formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px' }} />
                     <Line type="monotone" name="Total Pemasukan" dataKey="TotalPemasukan" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>
        )}
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700/50 shadow-sm z-10">
            <tr className="text-slate-500 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 whitespace-nowrap hidden sm:table-cell">Tanggal</th>
              <th className="p-3">Nama Ibadah</th>
              <th className="p-3 text-center">Kehadiran<br/><span className="text-[10px] font-normal">(Dewasa/Pemuda/Anak)</span></th>
              <th className="p-3 whitespace-nowrap text-right">Persembahan</th>
              <th className="p-3 whitespace-nowrap text-right hidden lg:table-cell">Perpuluhan</th>
              <th className="p-3 whitespace-nowrap text-right hidden xl:table-cell">Total Pemasukan</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">Memuat data...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">Tidak ada laporan minggu ini.</td>
              </tr>
            ) : (
              reports.map((report) => {
                const totalKehadiran = report.kehadiran_dewasa + report.kehadiran_pemuda + report.kehadiran_anak;
                const totalPemasukan = report.persembahan_umum + report.perpuluhan + report.diakonia + report.pemasukan_lainnya;
                
                return (
                  <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                    <td className="p-3 whitespace-nowrap font-medium hidden sm:table-cell">{formatDate(report.tanggal_ibadah)}</td>
                    <td className="p-3 font-semibold text-blue-700 dark:text-blue-400">
                      <div className="sm:hidden text-[10px] font-normal text-slate-500 mb-1">{formatDate(report.tanggal_ibadah)}</div>
                      {report.nama_ibadah}
                      {(report.keterangan) && <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-1">{report.keterangan}</div>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="font-bold text-sm">{totalKehadiran}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-center gap-2">
                        <span title="D">{report.kehadiran_dewasa}</span> | 
                        <span title="P">{report.kehadiran_pemuda}</span> | 
                        <span title="A">{report.kehadiran_anak}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-mono">{formatRupiah(report.persembahan_umum)}</td>
                    <td className="p-3 text-right whitespace-nowrap font-mono hidden lg:table-cell">{formatRupiah(report.perpuluhan)}</td>
                    <td className="p-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400 hidden xl:table-cell">{formatRupiah(totalPemasukan)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit Laporan"
                      >
                        <Edit2 className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => report.id && setReportToDelete(report.id)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Laporan"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <WeeklyReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedReport}
        onSave={handleSaveReport}
      />

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Konfirmasi Penghapusan</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus laporan kebaktian ini?
            </p>
            <div className="flex justify-end gap-3 w-full">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
