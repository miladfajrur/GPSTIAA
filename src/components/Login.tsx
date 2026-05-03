import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { motion } from "motion/react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (username === "gpsttiaa" && password === "gpsttiaa") ||
      (username === "fajrur" && password === "fajrur") ||
      (username === "anabk" && password === "anabk") ||
      (username === "BEM" && password === "BEM")
    ) {
      login(username);
    } else {
      setError("Akun atau password salah");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1120] border-box relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [-40, 40, -40], x: [-20, 20, -20], rotate: [0, 45, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ y: [40, -40, 40], x: [20, -20, 20], rotate: [0, -45, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-40 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"
        />

        {/* Floating Particles (Anti-gravity effect) */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              y: Math.random() * window.innerHeight, 
              x: Math.random() * window.innerWidth,
              opacity: Math.random() * 0.5 + 0.1,
              scale: Math.random() * 0.5 + 0.5 
            }}
            animate={{ 
              y: [null, Math.random() * -500],
              opacity: [null, 0] 
            }}
            transition={{ 
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-2 h-2 rounded-full bg-blue-400 blur-[1px]"
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md z-10 mx-4"
      >
        <motion.div 
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-[2.5rem] bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3)] relative overflow-hidden"
        >
          {/* Inner glass reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none rounded-[2.5rem]" />
          
          <div className="mb-10 flex flex-col items-center relative z-10">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, type: "spring", bounce: 0.5 }}
              className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] flex items-center justify-center gap-4 relative group"
            >
              <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
              <div className="h-20 w-20 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 shrink-0 shadow-xl relative z-10 mx-auto">
                <img
                  src="https://i.ibb.co.com/HTcTMCcr/GPSTIAA-LOGO-1.png"
                  alt="GPSTIAA LOGO"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <img
                src="https://i.ibb.co.com/zHfFFrd1/AA-2-1-2-1.png"
                alt="STTIAA LOGO"
                className="h-20 w-auto object-contain drop-shadow-2xl relative z-10"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-8 text-center text-2xl font-extrabold tracking-tight text-white leading-tight"
            >
              Sistem Pendataan <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 text-xl block mt-2">
                Gereja Persekutuan Sekolah Tinggi Teologi Injili Abdi Allah (STTIAA)
              </span>
            </motion.h2>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 text-center font-medium backdrop-blur-md"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-300 ml-1 mb-2"
              >
                Akun / Username
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="relative block w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-white placeholder-slate-500 backdrop-blur-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                  placeholder="Masukkan akun Anda"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 ml-1 mb-2"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-white placeholder-slate-500 backdrop-blur-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                  placeholder="Masukkan password Anda"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="pt-2"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="relative flex w-full justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 group"
              >
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative">Masuk ke Aplikasi</span>
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
        
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1, duration: 1 }}
           className="mt-8 text-center text-slate-400 text-xs sm:text-sm font-medium tracking-wide pb-4 relative z-10"
        >
          <p>Kontak: gpsttiaa@gmail.com | Bank: 614-055-5795 an. Ana Budi Kristiani</p>
        </motion.div>

      </motion.div>
    </div>
  );
}
