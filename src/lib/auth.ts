// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mere-ekspor `authOptions` dari master auth route (@/app/api/auth/[...nextauth]/route).
// ✨ Fitur Baru: Single Source of Truth NextAuth Configuration.
// 🎨 UI/UX Update: N/A (Backend Auth Configuration Re-export)
// 🔧 Bug Fix: Menyelesaikan konflik definisi User / Prisma model pada NextAuth.
// 🚀 Inovasi: Enterprise Unified NextAuth Hub.
// ----------------------------------------------------------------------

export { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
export default authOptions;