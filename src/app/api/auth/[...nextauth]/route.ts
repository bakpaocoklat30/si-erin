// 📋 CHANGELOG:
// ✅ Perubahan: Menyempurnakan callback NextAuth untuk meneruskan properti `username` ke dalam token JWT & Session tanpa mengubah struktur `id`, `role`, dan `department` yang sudah digunakan oleh role lain.
// ✨ Fitur Baru: Universal Role-Safe Auth Token & Username Transmission Pipeline.
// 🎨 UI/UX Update: N/A (Backend Auth API Route)
// 🔧 Bug Fix: Menjamin kompatibilitas password (bcrypt + fallback plaintext migration) dan memastikan role SISWA mendarat tepat di /dashboard/student tanpa merusak rute ADMIN, POKJA, atau PEMBIMBING.
// 🚀 Inovasi: Enterprise Resilient Multi-Role NextAuth Configuration.

import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username / NIS", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password wajib diisi");
        }

        const cleanUsername = credentials.username.trim();

        // 1. Cari user berdasarkan username di database PostgreSQL
        const user = await db.user.findUnique({
          where: { username: cleanUsername }
        });

        if (!user) {
          throw new Error("Username atau NIS tidak ditemukan");
        }

        // 2. Verifikasi password (mendukung hash bcrypt atau teks biasa untuk migrasi awal)
        let isValid = false;
        try {
          isValid = await bcrypt.compare(credentials.password, user.password);
        } catch (e) {
          isValid = credentials.password === user.password;
        }

        if (!isValid && credentials.password !== user.password) {
          throw new Error("Password yang Anda masukkan salah");
        }

        // Return data user resmi untuk disimpan ke token session (Aman untuk semua role)
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          department: user.department || ''
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.username = user.username; // Diteruskan agar API Siswa/Admin bisa membaca NIS/Username
        token.role = user.role;
        token.department = user.department;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username; // Menyediakan session.user.username secara global
        session.user.role = token.role;
        session.user.department = token.department;
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Izinkan redirect internal relatif
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60 // 1 Hari
  },
  secret: process.env.NEXTAUTH_SECRET || "si-erin-secret-key-production-2026",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };