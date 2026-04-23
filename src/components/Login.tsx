import React, { useState } from "react";
import { useAuth } from "../AuthContext";

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
      (username === "fajrur1" && password === "fajrur1")
    ) {
      login(username);
    } else {
      setError("Akun atau password salah");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center">
          <img
            src="https://i.ibb.co.com/Xfg0zs6D/GPSTIAA-LOGO.png"
            alt="GPSTIAA LOGO"
            className="h-24 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sistem Pendataan <br />
            <span className="text-blue-800 dark:text-blue-400">GPSTIAA Siloam</span>
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Akun / Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
              placeholder="Masukkan akun Anda"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
              placeholder="Masukkan password Anda"
            />
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Masuk ke Aplikasi
          </button>
        </form>
      </div>
    </div>
  );
}
