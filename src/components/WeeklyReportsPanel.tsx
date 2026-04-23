import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Plus, Edit2, Trash2, Download, Printer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { db } from "../lib/firebase";
import { WeeklyReport } from "../types";
import WeeklyReportModal from "./WeeklyReportModal";
import BulkReportModal from "./BulkReportModal";
import { TableProperties } from "lucide-react";

export default function WeeklyReportsPanel() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [ibadahFilter, setIbadahFilter] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | undefined>(undefined);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Extract unique "Nama Ibadah" for dropdown filter
  const uniqueNamaIbadah = Array.from(new Set(reports.map(r => r.nama_ibadah).filter(Boolean)));

  const filteredReports = reports.filter(r => ibadahFilter === "Semua" ? true : r.nama_ibadah === ibadahFilter);

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
    const csvData = filteredReports.map(r => ({
      "Tanggal Ibadah": r.tanggal_ibadah,
      "Nama Ibadah": r.nama_ibadah,
      "Kehadiran Dewasa": r.kehadiran_dewasa,
      "Kehadiran Pemuda": r.kehadiran_pemuda,
      "Kehadiran Anak": r.kehadiran_anak,
      "Total Kehadiran": r.kehadiran_dewasa + r.kehadiran_pemuda + r.kehadiran_anak,
      "Persembahan Umum": r.persembahan_umum,
      "Perpuluhan": r.perpuluhan,
      "Diakonia": r.diakonia,
      "Pemasukan Lainnya": r.pemasukan_lainnya || 0,
      "Total Pemasukan": (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0),
      "Total Pengeluaran": r.pengeluaran || 0,
      "Keterangan Pengeluaran": r.keterangan_pengeluaran || "",
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    // Title
    doc.setFontSize(16);
    doc.text(`Laporan Ringkasan Total Keuangan${ibadahFilter !== 'Semua' ? ` (${ibadahFilter})` : ''}`, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 28);
    
    // Prepare table data
    const totalAllPemasukan = filteredReports.reduce((acc, r) => acc + (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0), 0);
    const totalAllPengeluaran = filteredReports.reduce((acc, r) => acc + (r.pengeluaran || 0), 0);
    const totalSaldo = totalAllPemasukan - totalAllPengeluaran;

    const summaryData = [
      ["Total Keseluruhan Pemasukan", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAllPemasukan)],
      ["Total Keseluruhan Pengeluaran", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAllPengeluaran)],
      ["Selisih / Saldo Akhir", new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalSaldo)]
    ];

    autoTable(doc, {
      startY: 35,
      head: [["Keterangan", "Total (Rp)"]],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 11, cellPadding: 6 },
      columnStyles: {
        0: { cellWidth: 'min' },
        1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' } // align right for currency
      },
      didParseCell: function(data) {
        // Change color for summary
        if (data.row.index === 2 && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = totalSaldo >= 0 ? [37, 99, 235] : [220, 38, 38];
        }
        if (data.row.index === 1 && data.section === 'body') {
            data.cell.styles.textColor = [220, 38, 38];
        }
        if (data.row.index === 0 && data.section === 'body') {
            data.cell.styles.textColor = [16, 185, 129];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 35;
    
    doc.setFontSize(10);
    doc.text("Keterangan:", 14, finalY + 15);
    doc.setFontSize(9);
    doc.text("- Dokumen ini digenerate secara otomatis oleh sistem.", 14, finalY + 22);

    doc.save(`Ringkasan_Keuangan_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const chartData = [...filteredReports].reverse().map(r => ({
    name: formatDate(r.tanggal_ibadah).split(' ').slice(0, 2).join(' '),
    Dewasa: r.kehadiran_dewasa || 0,
    Pemuda: r.kehadiran_pemuda || 0,
    Anak: r.kehadiran_anak || 0,
    Total: (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0),
    TotalPemasukan: (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0),
    TotalPengeluaran: r.pengeluaran || 0
  }));

  const totalAllPemasukan = filteredReports.reduce((acc, r) => acc + (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0), 0);
  const totalAllPengeluaran = filteredReports.reduce((acc, r) => acc + (r.pengeluaran || 0), 0);
  const totalSaldo = totalAllPemasukan - totalAllPengeluaran;

  const summaryChartData = [
    { name: 'Pemasukan', value: totalAllPemasukan, fill: '#10B981' },
    { name: 'Pengeluaran', value: totalAllPengeluaran, fill: '#EF4444' },
    { name: 'Selisih', value: totalSaldo, fill: totalSaldo >= 0 ? '#3B82F6' : '#F59E0B' }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Kebaktian & Keuangan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Arsip data kehadiran jemaat dan laporan pemasukan mingguan gereja</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none"
          >
            <Printer className="w-4 h-4" /> Unduh Ringkasan PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none"
          >
            <Download className="w-4 h-4" /> Unduh Laporan CSV
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none"
          >
            <TableProperties className="w-4 h-4" /> Input Massal
          </button>
          <button
            onClick={() => {
              setSelectedReport(undefined);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none flex items-center gap-2"
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
               <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Grafik Keuangan (Pemasukan vs Pengeluaran)</h3>
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
                     <Line type="monotone" name="Total Pengeluaran" dataKey="TotalPengeluaran" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>
        )}
        
        {/* Table Controls (Filter) */}
        {!isLoading && reports.length > 0 && (
          <div className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 px-4 py-3 flex justify-end">
            <div className="flex items-center gap-2">
              <label htmlFor="ibadah-filter" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Filter Ibadah:</label>
              <select
                id="ibadah-filter"
                className="text-sm border flex-1 md:w-auto border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                value={ibadahFilter}
                onChange={(e) => setIbadahFilter(e.target.value)}
              >
                <option value="Semua">Semua Ibadah</option>
                {uniqueNamaIbadah.map((nama, idx) => (
                  <option key={idx} value={nama}>{nama}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700/50 shadow-sm z-10">
            <tr className="text-slate-500 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 whitespace-nowrap hidden sm:table-cell">Tanggal</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700">Nama Ibadah</th>
              <th className="p-3 text-center border-r border-slate-200 dark:border-slate-700">Kehadiran<br/><span className="text-[10px] font-normal">(Dewasa/Pemuda/Anak)</span></th>
              <th className="p-3 whitespace-nowrap text-right">Pemasukan</th>
              <th className="p-3 whitespace-nowrap text-right border-r border-slate-200 dark:border-slate-700 hidden xl:table-cell">Pengeluaran</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">Memuat data...</td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">Tidak ada laporan minggu ini.</td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const totalKehadiran = (report.kehadiran_dewasa || 0) + (report.kehadiran_pemuda || 0) + (report.kehadiran_anak || 0);
                const totalPemasukan = (report.persembahan_umum || 0) + (report.perpuluhan || 0) + (report.diakonia || 0) + (report.pemasukan_lainnya || 0);
                const totalPengeluaran = report.pengeluaran || 0;
                
                return (
                  <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                    <td className="p-3 whitespace-nowrap font-medium hidden sm:table-cell">{formatDate(report.tanggal_ibadah)}</td>
                    <td className="p-3 font-semibold text-blue-700 dark:text-blue-400 border-r border-slate-100 dark:border-slate-700/50">
                      <div className="sm:hidden text-[10px] font-normal text-slate-500 mb-1">{formatDate(report.tanggal_ibadah)}</div>
                      {report.nama_ibadah}
                      {(report.keterangan || report.keterangan_pengeluaran) && <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-1">{report.keterangan} {report.keterangan_pengeluaran ? `(Pengeluaran: ${report.keterangan_pengeluaran})` : ''}</div>}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100 dark:border-slate-700/50">
                      <div className="font-bold text-sm">{totalKehadiran}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-center gap-2">
                        <span title="D">{report.kehadiran_dewasa || 0}</span> | 
                        <span title="P">{report.kehadiran_pemuda || 0}</span> | 
                        <span title="A">{report.kehadiran_anak || 0}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalPemasukan)}</td>
                    <td className="p-3 text-right whitespace-nowrap font-mono font-bold text-red-500 border-r border-slate-100 dark:border-slate-700/50 hidden xl:table-cell">{formatRupiah(totalPengeluaran)}</td>
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
          {filteredReports.length > 0 && !isLoading && (
            <tfoot className="bg-slate-50 dark:bg-slate-700/80 font-bold border-t-2 border-slate-200 dark:border-slate-600 shadow-sm z-10 sticky bottom-0">
              <tr>
                <td colSpan={3} className="p-3 text-right">TOTAL KESELURUHAN:</td>
                <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(totalAllPemasukan)}</td>
                <td className="p-3 text-right font-mono text-red-500 xl:table-cell hidden">{formatRupiah(totalAllPengeluaran)}</td>
                <td className="p-3"></td>
              </tr>
              <tr>
                <td colSpan={3} className="p-3 text-right">SELISIH (SALDO):</td>
                <td colSpan={2} className={`p-3 text-center sm:text-right font-mono text-lg ${totalSaldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{formatRupiah(totalSaldo)}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {filteredReports.length > 0 && !isLoading && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 shrink-0 mt-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">Ringkasan Total</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Pemasukan</div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(totalAllPemasukan)}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Pengeluaran</div>
                    <div className="text-xl font-bold font-mono text-red-500">{formatRupiah(totalAllPengeluaran)}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm sm:col-span-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Selisih (Saldo)</div>
                    <div className={`text-2xl font-bold font-mono ${totalSaldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{formatRupiah(totalSaldo)}</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Grafik Komparasi</h3>
                <div className="h-48 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryChartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 11, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b', fontSize: '12px' }}
                        formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                        cursor={{fill: document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {summaryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <WeeklyReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedReport}
        onSave={handleSaveReport}
      />

      <BulkReportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={(count) => {
          alert(`Input massal berhasil! ${count} laporan baru ditambahkan.`);
        }}
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
