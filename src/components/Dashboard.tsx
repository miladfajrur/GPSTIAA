import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import Papa from "papaparse";
import { Download, Plus, Search, LogOut, Edit2, Trash2, Filter, Users, PieChart as PieChartIcon, MapPin, Settings, Upload, Menu, UserCheck } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { db } from "../lib/firebase";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { Member } from "../types";
import MemberModal from "./MemberModal";
import WeeklyReportsPanel from "./WeeklyReportsPanel";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("members"); // "members", "stats", "map", "settings"
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [baptisFilter, setBaptisFilter] = useState("");
  const [sortBy, setSortBy] = useState("nama_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const q = query(
      collection(db, "members"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Member[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveMember = async (memberData: Member) => {
    const { id, ...dataToSave } = memberData;
    const docId = id || doc(collection(db, "members")).id;
    const isNew = !id;
    
    await setDoc(doc(db, "members", docId), {
      ...dataToSave,
      tenantId: "gpstiaa",
      createdAt: isNew ? serverTimestamp() : dataToSave.createdAt,
      updatedAt: serverTimestamp(),
    }, { merge: false }); // Using merge: false to enforce strict schema replacement
  };

  const handleDeleteClick = (id: string) => {
    setMemberToDelete(id);
  };

  const confirmDelete = async () => {
    if (memberToDelete) {
      try {
        await deleteDoc(doc(db, "members", memberToDelete));
      } catch (error) {
        console.error("Error deleting member:", error);
      } finally {
        setMemberToDelete(null);
      }
    }
  };

  const handleExportCSV = () => {
    const csvData = members.map((m, index) => ({
      "No": index + 1,
      "Nomor Anggota": m.nomor_anggota,
      "Nama Lengkap": m.nama_lengkap,
      "Jenis Kelamin": m.jenis_kelamin,
      "Tempat Lahir": m.tempat_lahir,
      "Tanggal Lahir": m.tanggal_lahir,
      "No. Telp": m.no_telp || "-",
      "Alamat Asal": m.alamat_asal,
      "Jenis Baptis": m.jenis_baptis,
      "Keterangan Baptis": m.keterangan_baptis,
      "Tanggal Masuk": m.tanggal_masuk,
      "Tanggal Keluar": m.tanggal_keluar,
      "Link Foto": m.foto_url
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'Buku_Induk_GPSTIAA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          let importedCount = 0;
          for (const row of rows) {
            const memberData: Member = {
              nomor_anggota: row["Nomor Anggota"] || "",
              nama_lengkap: row["Nama Lengkap"] || "",
              jenis_kelamin: (row["Jenis Kelamin"] === "Pria" || row["Jenis Kelamin"] === "Wanita") ? row["Jenis Kelamin"] : "",
              tempat_lahir: row["Tempat Lahir"] || "",
              tanggal_lahir: row["Tanggal Lahir"] || "",
              no_telp: row["No. Telp"] || "",
              alamat_asal: row["Alamat Asal"] || "",
              jenis_baptis: row["Jenis Baptis"] || "",
              keterangan_baptis: row["Keterangan Baptis"] || "",
              tanggal_masuk: row["Tanggal Masuk"] || "",
              tanggal_keluar: row["Tanggal Keluar"] || "",
              foto_url: row["Link Foto"] || "",
              tenantId: "gpstiaa"
            };

            // Basic validation
            if (memberData.nama_lengkap) {
              const docId = doc(collection(db, "members")).id;
              await setDoc(doc(db, "members", docId), {
                ...memberData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              importedCount++;
            }
          }
          alert(`Impor data berhasil! ${importedCount} jemaat telah ditambahkan.`);
        } catch (error) {
          console.error("Error importing:", error);
          alert("Terjadi kesalahan saat menyimpan data impor ke server.");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("Gagal membaca file CSV.");
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase();
    const noTelpSafe = m.no_telp || "";
    const alamatSafe = m.alamat_asal || "";
    
    const matchesSearch = 
      m.nama_lengkap.toLowerCase().includes(term) || 
      m.nomor_anggota.toLowerCase().includes(term) ||
      alamatSafe.toLowerCase().includes(term) ||
      noTelpSafe.toLowerCase().includes(term);
    
    const matchesGender = genderFilter ? m.jenis_kelamin === genderFilter : true;
    const matchesBaptis = baptisFilter ? m.jenis_baptis === baptisFilter : true;
    
    return matchesSearch && matchesGender && matchesBaptis;
  }).sort((a, b) => {
    switch (sortBy) {
      case "nama_asc":
        return a.nama_lengkap.localeCompare(b.nama_lengkap);
      case "nama_desc":
        return b.nama_lengkap.localeCompare(a.nama_lengkap);
      case "tgl_masuk_desc":
        return new Date(b.tanggal_masuk || 0).getTime() - new Date(a.tanggal_masuk || 0).getTime();
      case "tgl_masuk_asc":
        return new Date(a.tanggal_masuk || 0).getTime() - new Date(b.tanggal_masuk || 0).getTime();
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, genderFilter, baptisFilter, sortBy]);

  const renderNavLinks = () => (
    <>
      <button 
        onClick={() => setActiveTab("members")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'members' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'members' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Users className="w-4 h-4" />}
        Data Anggota
      </button>
      <button 
        onClick={() => setActiveTab("reports")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'reports' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'reports' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <UserCheck className="w-4 h-4" />}
        Data Kebaktian
      </button>
      <button 
        onClick={() => setActiveTab("stats")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'stats' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'stats' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <PieChartIcon className="w-4 h-4" />}
        Statistik Jemaat
      </button>
      <button 
        onClick={() => setActiveTab("map")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'map' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'map' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <MapPin className="w-4 h-4" />}
        Pemetaan Jemaat
      </button>
      <button 
        onClick={() => setActiveTab("settings")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'settings' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'settings' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Settings className="w-4 h-4" />}
        Pengaturan Sistem
      </button>
    </>
  );

  return (
    <div className={`flex h-screen w-full font-sans text-slate-800 dark:text-slate-100 overflow-hidden bg-slate-50 dark:bg-slate-900 ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`bg-slate-900 dark:bg-slate-950 text-white flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64" : "w-0"}`}>
        <div className="w-64 p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white p-1 rounded-md">
              <img src="https://i.ibb.co.com/Xfg0zs6D/GPSTIAA-LOGO.png" alt="GPSTIAA" className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-xs font-bold leading-tight opacity-70 uppercase tracking-widest">Buku Induk</h1>
              <p className="text-sm font-semibold">GPSTIAA Siloam</p>
            </div>
          </div>
          <nav className="space-y-1 flex-1">
            {renderNavLinks()}
          </nav>
          <div className="mt-auto pt-6 border-t border-white border-opacity-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center font-bold uppercase shrink-0">
                  {user?.username?.[0] || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-xs opacity-50">Administrator</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-red-400 hover:text-red-300 transition-colors focus:outline-none shrink-0" title="Keluar">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-900">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 h-full">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
              {activeTab === 'members' && "Data Anggota"}
              {activeTab === 'reports' && "Laporan Mingguan"}
              {activeTab === 'stats' && "Statistik Jemaat"}
              {activeTab === 'map' && "Pemetaan Jemaat"}
              {activeTab === 'settings' && "Pengaturan Sistem"}
            </h2>
          </div>
          {activeTab === 'members' && (
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleImportCSV}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2 focus:outline-none disabled:opacity-50"
              >
                {isImporting ? (
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"></span>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? "Mengimpor..." : "Impor CSV"}
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2 focus:outline-none"
              >
                <span>📥</span> Unduh Excel
              </button>
              <button
                onClick={() => {
                  setSelectedMember(undefined);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-semibold transition-colors focus:outline-none"
              >
                + Tambah Data
              </button>
            </div>
          )}
        </header>

        <div className="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
          {activeTab === 'members' && (
            <>
              <div className="grid grid-cols-4 gap-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <p className="text-xs text-slate-500 font-medium uppercase">Total Anggota</p>
                  <p className="text-2xl font-bold text-blue-900">{members.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <p className="text-xs text-slate-500 font-medium uppercase">Jemaat Pria</p>
                  <p className="text-2xl font-bold text-blue-900">{members.filter(m => m.jenis_kelamin === 'Pria').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <p className="text-xs text-slate-500 font-medium uppercase">Jemaat Wanita</p>
                  <p className="text-2xl font-bold text-blue-900">{members.filter(m => m.jenis_kelamin === 'Wanita').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <p className="text-xs text-slate-500 font-medium uppercase">Update Terakhir</p>
                  <p className="text-2xl font-bold text-blue-900 text-sm mt-2">Real-time (Active)</p>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] flex flex-col min-h-0">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center shrink-0 gap-3">
                  <div className="flex flex-wrap gap-2">
                      <input
                      type="text"
                      placeholder="Cari nama, no. hp, atau alamat..."
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-64 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                    >
                      <option value="">Semua Kelamin</option>
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                    <select
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      value={baptisFilter}
                      onChange={(e) => setBaptisFilter(e.target.value)}
                    >
                      <option value="">Semua Status Baptis</option>
                      <option value="Baptis Kecil">Baptis Kecil</option>
                      <option value="SIDI">SIDI</option>
                      <option value="Baptis Dewasa">Baptis Dewasa</option>
                    </select>
                    <select
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="nama_asc">Nama (A-Z)</option>
                      <option value="nama_desc">Nama (Z-A)</option>
                      <option value="tgl_masuk_desc">Terbaru Masuk</option>
                      <option value="tgl_masuk_asc">Terlama Masuk</option>
                    </select>
                  </div>
                  <span className="text-[10px] text-slate-400 italic">Data tersinkronisasi Firebase</span>
                </div>
                
                <div className="overflow-auto flex-1">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="text-slate-400 uppercase font-bold border-b border-slate-200">
                        <th className="p-3">#</th>
                        <th className="p-3">No. Anggota</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">JK</th>
                        <th className="p-3">TTL</th>
                        <th className="p-3">No. Telp</th>
                        <th className="p-3">Alamat Asal</th>
                        <th className="p-3">Jenis Baptis</th>
                        <th className="p-3">Tgl Masuk</th>
                        <th className="p-3">Foto</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">Memuat data...</td>
                        </tr>
                      ) : filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-slate-500">Tidak ada data jemaat yang cocok.</td>
                        </tr>
                      ) : (
                        paginatedMembers.map((member, idx) => {
                          const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                          let badgeStyle = "bg-slate-100 text-slate-700";
                          if (member.jenis_baptis === "SIDI") badgeStyle = "bg-blue-100 text-blue-700";
                          else if (member.jenis_baptis === "Baptis Dewasa") badgeStyle = "bg-emerald-100 text-emerald-700";
                          else if (member.jenis_baptis === "Baptis Kecil") badgeStyle = "bg-amber-100 text-amber-700";

                          return (
                            <tr key={member.id} className="hover:bg-slate-50 group">
                              <td className="p-3">{globalIdx}</td>
                              <td className="p-3 font-mono text-blue-600">{member.nomor_anggota}</td>
                              <td className="p-3 font-semibold text-slate-800">{member.nama_lengkap}</td>
                              <td className="p-3">{member.jenis_kelamin === 'Pria' ? 'Pria' : 'Wanita'}</td>
                              <td className="p-3">{member.tempat_lahir}, {member.tanggal_lahir}</td>
                              <td className="p-3 font-mono">{member.no_telp || '-'}</td>
                              <td className="p-3 max-w-[150px] truncate" title={member.alamat_asal}>{member.alamat_asal}</td>
                              <td className="p-3">
                                {member.jenis_baptis ? (
                                  <span className={`text-[10px] px-2 py-[2px] rounded-full font-semibold uppercase ${badgeStyle}`}>
                                    {member.jenis_baptis}
                                  </span>
                                ) : '-'}
                                {member.keterangan_baptis && (
                                  <>
                                    <br />
                                    <span className="text-[9px] opacity-60">{member.keterangan_baptis}</span>
                                  </>
                                )}
                              </td>
                              <td className="p-3">{member.tanggal_masuk || '-'}</td>
                              <td className="p-3">
                                {member.foto_url ? (
                                  <a href={member.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700">Link Drive</a>
                                ) : '-'}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setIsModalOpen(true);
                                  }}
                                  className="text-blue-500 hover:text-blue-700 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4 inline" />
                                </button>
                                <button
                                  onClick={() => member.id && handleDeleteClick(member.id)}
                                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Hapus"
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

                {totalPages > 1 && (
                  <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                    <span className="text-xs text-slate-500 font-medium">
                      Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMembers.length)} dari {filteredMembers.length} jemaat
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold focus:outline-none transition-colors"
                      >
                        Sebelumnya
                      </button>
                      
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = currentPage - 2 + i;
                          if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded border text-xs font-semibold focus:outline-none transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold focus:outline-none transition-colors"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'reports' && (
            <WeeklyReportsPanel />
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] p-6 overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Statistik Jemaat</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 text-center mb-4 uppercase tracking-wider">Demografi Kelamin</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Pria', value: members.filter(m => m.jenis_kelamin === 'Pria').length },
                            { name: 'Wanita', value: members.filter(m => m.jenis_kelamin === 'Wanita').length },
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          <Cell fill="#1E3A8A" />
                          <Cell fill="#10B981" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#1E3A8A]"></span>Pria</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10B981]"></span>Wanita</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 text-center mb-4 uppercase tracking-wider">Status Baptis</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Belum', value: members.filter(m => !m.jenis_baptis || m.jenis_baptis === '').length },
                        { name: 'Kecil', value: members.filter(m => m.jenis_baptis === 'Baptis Kecil').length },
                        { name: 'Dewasa', value: members.filter(m => m.jenis_baptis === 'Baptis Dewasa').length },
                        { name: 'SIDI', value: members.filter(m => m.jenis_baptis === 'SIDI').length }
                      ]}>
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] p-6 flex flex-col">
              <h2 className="text-xl font-bold text-slate-800 mb-6 shrink-0">Pemetaan Jemaat Berdasarkan Alamat</h2>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    members.reduce((acc, m) => {
                      const addr = m.alamat_asal || 'Tidak Diketahui';
                      // simple grouping by first word of address
                      const groupName = addr.split(' ')[0] || 'Lainnya';
                      acc[groupName] = (acc[groupName] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([group, count]) => (
                    <div key={group} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-800 truncate" title={group}>{group}</p>
                        <p className="text-xs text-slate-500">Area</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] p-6 overflow-y-auto">
              <div className="max-w-xl mx-auto space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Pengaturan Sistem</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Kelola preferensi akun dan aplikasi Buku Induk GPSTIAA Siloam.</p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Akun</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Nama Pengguna</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{user?.username}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full">Administrator</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Preferensi Tampilan</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Tema Gelap (Dark Mode)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Beralih ke tampilan gelap untuk kenyamanan mata</p>
                    </div>
                    <button 
                      onClick={toggleDarkMode}
                      className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Sistem Eksternal</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Status Sinkronisasi Firebase</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Database Firestore Real-time</p>
                    </div>
                    <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Terhubung
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedMember}
        onSave={handleSaveMember}
      />

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Konfirmasi Penghapusan</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus data jemaat ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none shadow-sm"
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
