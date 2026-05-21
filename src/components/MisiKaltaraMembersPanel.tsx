import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { Plus, Edit2, Trash2, Users, Search } from "lucide-react";
import { db } from "../lib/firebase";
import { Member } from "../types";
import { formatDateDDMMYYYY, calculateAge } from "../lib/utils";

export default function MisiKaltaraMembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "misi_members"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Member[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      nama_lengkap: formData.get("nama_lengkap"),
      nomor_anggota: formData.get("nomor_anggota"),
      jenis_kelamin: formData.get("jenis_kelamin"),
      tanggal_lahir: formData.get("tanggal_lahir"),
      no_telp: formData.get("no_telp"),
      alamat_asal: formData.get("alamat_asal"),
    };

    if (selectedMember?.id) {
      await setDoc(doc(db, "misi_members", selectedMember.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(doc(collection(db, "misi_members")), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (memberToDelete) {
      await deleteDoc(doc(db, "misi_members", memberToDelete));
      setMemberToDelete(null);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.nama_lengkap?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (m.nomor_anggota?.toLowerCase() || "").includes(searchQuery.toLowerCase())    
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-800/50">
        <div className="flex-1 w-full max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama / no. anggota..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => { setSelectedMember(undefined); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Tambah Jemaat
        </button>
      </div>

      <div className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500 text-sm">Memuat data jemaat...</p>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Tidak ditemukan data jemaat.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMembers.map((m, idx) => (
              <div key={m.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  {m.nama_lengkap ? m.nama_lengkap.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{m.nama_lengkap}</h4>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{m.nomor_anggota || 'Tanpa No.'}</span>
                    <span>{m.jenis_kelamin}</span>
                    {m.tanggal_lahir && <span>{calculateAge(m.tanggal_lahir)} Thn</span>}
                    {m.no_telp && <span>☎ {m.no_telp}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setSelectedMember(m); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setMemberToDelete(m.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">{selectedMember ? "Edit" : "Tambah"} Jemaat Misi</h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input required name="nama_lengkap" defaultValue={selectedMember?.nama_lengkap} className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">No. Anggota</label>
                  <input name="nomor_anggota" defaultValue={selectedMember?.nomor_anggota} className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select required name="jenis_kelamin" defaultValue={selectedMember?.jenis_kelamin || "Pria"} className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="date" name="tanggal_lahir" defaultValue={selectedMember?.tanggal_lahir} className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">No Telepon / WA</label>
                  <input name="no_telp" defaultValue={selectedMember?.no_telp} className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea name="alamat_asal" defaultValue={selectedMember?.alamat_asal} rows={2} className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 font-medium">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">Hapus Data Jemaat?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Data jemaat yang dihapus tidak dapat dikembalikan lagi. Anda yakin?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMemberToDelete(null)} className="px-4 py-2 border dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
