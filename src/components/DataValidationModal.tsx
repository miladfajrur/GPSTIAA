import React, { useMemo } from 'react';
import { X, AlertTriangle, Edit2, AlertCircle } from 'lucide-react';
import { Member } from '../types';

interface DataValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onEditMember: (member: Member) => void;
}

export default function DataValidationModal({ isOpen, onClose, members, onEditMember }: DataValidationModalProps) {
  const issues = useMemo(() => {
    const findings: { type: string; message: string; member: Member; severity: 'error' | 'warning' }[] = [];
    
    // Group by nomor_anggota to find duplicates
    const nomorMap = new Map<string, Member[]>();
    members.forEach(m => {
      const num = m.nomor_anggota?.toLowerCase().trim();
      if (num) {
        if (!nomorMap.has(num)) nomorMap.set(num, []);
        nomorMap.get(num)!.push(m);
      }
    });

    members.forEach(m => {
      const num = m.nomor_anggota?.toLowerCase().trim();
      // 1. Duplicate Nomor Anggota
      if (num && nomorMap.get(num)!.length > 1) {
        findings.push({
          type: 'Duplikat No. Anggota',
          message: `Nomor Anggota "${m.nomor_anggota}" dipakai oleh ${nomorMap.get(num)!.length} jemaat.`,
          member: m,
          severity: 'error'
        });
      }
      
      // 2. Kosong Nomor Anggota
      if (!m.nomor_anggota || m.nomor_anggota.trim() === '') {
        findings.push({
          type: 'No. Anggota Kosong',
          message: 'Jemaat tidak memiliki Nomor Anggota.',
          member: m,
          severity: 'error'
        });
      }

      // 3. Nama Kosong
      if (!m.nama_lengkap || m.nama_lengkap.trim() === '') {
        findings.push({
          type: 'Nama Kosong',
          message: 'Jemaat tidak memiliki Nama Lengkap.',
          member: m,
          severity: 'error'
        });
      }

      // 4. Tanggal Lahir Kosong atau Tidak Valid
      if (!m.tanggal_lahir || m.tanggal_lahir.trim() === '') {
        findings.push({
          type: 'Tanggal Lahir Kosong',
          message: 'Tanggal lahir belum diisi.',
          member: m,
          severity: 'warning'
        });
      } else {
        const parts = m.tanggal_lahir.split('-');
        if (parts.length !== 3) {
          findings.push({
            type: 'Format Tgl Lahir Salah',
            message: `Format tidak valid: ${m.tanggal_lahir}. Harus YYYY-MM-DD.`,
            member: m,
            severity: 'error'
          });
        }
      }

      // 5. Jenis Kelamin Kosong
      if (!m.jenis_kelamin || (m.jenis_kelamin !== 'Pria' && m.jenis_kelamin !== 'Wanita')) {
        findings.push({
          type: 'Jenis Kelamin Tidak Valid',
          message: 'Jenis kelamin belum diisi atau format salah.',
          member: m,
          severity: 'warning'
        });
      }
    });

    return findings;
  }, [members]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 bg-slate-900/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Validasi Data Jemaat</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Memeriksa data ganda atau input yang tidak lengkap.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Data Terlihat Bagus!</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md">Tidak ditemukan duplikasi nomor anggota atau kesalahan input format dasar pada data jemaat Anda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ditemukan <span className="font-bold text-rose-600 dark:text-rose-400">{issues.length}</span> isu data
                </span>
              </div>
              <div className="grid gap-3">
                {issues.map((issue, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${issue.severity === 'error' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30'} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${issue.severity === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-500'}`}>
                        {issue.severity === 'error' ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm font-bold ${issue.severity === 'error' ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}`}>
                            {issue.type}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">• {issue.member.nama_lengkap || 'Nama Kosong'}</span>
                        </div>
                        <p className={`text-xs ${issue.severity === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {issue.message}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 sm:hidden">
                          <li><span className="font-medium">Nama:</span> {issue.member.nama_lengkap || '-'}</li>
                          <li><span className="font-medium">No. Anggota:</span> {issue.member.nomor_anggota || '-'}</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="hidden sm:block text-right">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 break-all max-w-[120px] truncate" title={issue.member.nomor_anggota}>{issue.member.nomor_anggota || '-'}</div>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onEditMember(issue.member);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Perbaiki
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
