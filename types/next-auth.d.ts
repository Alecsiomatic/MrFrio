import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string | null
      email: string | null
      role: "ADMIN" | "REPARTIDOR" | "SUPERVISOR"
      ruteroId: number | null
    }
  }

  interface User {
    id: string
    role: "ADMIN" | "REPARTIDOR" | "SUPERVISOR"
    ruteroId: number | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "ADMIN" | "REPARTIDOR" | "SUPERVISOR"
    ruteroId: number | null
  }
}

