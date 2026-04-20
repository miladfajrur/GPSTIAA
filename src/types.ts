export interface Member {
  id?: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: "Pria" | "Wanita" | "";
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat_asal: string;
  no_telp?: string;
  jenis_baptis: string;
  keterangan_baptis: string;
  tanggal_masuk: string;
  tanggal_keluar: string;
  foto_url: string;
  tenantId: string;
  createdAt?: any;
  updatedAt?: any;
}

export type AuthUser = {
  username: string;
};

export interface WeeklyReport {
  id?: string;
  tenantId: string;
  tanggal_ibadah: string;
  nama_ibadah: string;
  kehadiran_dewasa: number;
  kehadiran_pemuda: number;
  kehadiran_anak: number;
  persembahan_umum: number;
  perpuluhan: number;
  diakonia: number;
  pemasukan_lainnya: number;
  keterangan: string;
  createdAt?: any;
  updatedAt?: any;
}

