import { SignJWT, jwtVerify } from 'jose'
import type { FastifyReply, FastifyRequest } from 'fastify'

const ALG = 'HS256'

export async function signToken(email: string, secret: string, ttl = '7d'): Promise<string> {
  return new SignJWT({ sub: email })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(new TextEncoder().encode(secret))
}

export async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: [ALG] })
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

// preHandler: exige Authorization: Bearer <JWT> y deja el email en request.
declare module 'fastify' {
  interface FastifyRequest {
    operatorEmail?: string
  }
}

export function requireAuth(secret: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    const email = token ? await verifyToken(token, secret) : null
    if (!email) {
      reply.code(401).send({ error: 'unauthorized' })
      return reply
    }
    req.operatorEmail = email
  }
}
