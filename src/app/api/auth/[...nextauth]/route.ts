import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        name: { label: "Nome", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          let user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          // Se não existe e tem nome válido, cria novo usuário
          if (!user && credentials.name && credentials.name.trim() !== "") {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                password: credentials.password,
                name: credentials.name.trim()
              }
            })
          }

          // Se não existe usuário, retorna null (login falhou)
          if (!user) {
            return null
          }

          // Verifica senha
          if (user.password !== credentials.password) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            diagnosticoCompleto: user.diagnosticoCompleto
          }
        } catch (error) {
          console.error("Erro na autenticação:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/signup"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.diagnosticoCompleto = (user as any).diagnosticoCompleto
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: token.name as string,
          email: token.email as string,
          diagnosticoCompleto: token.diagnosticoCompleto as boolean
        }
      }
    }
  }
})

export { handler as GET, handler as POST }
