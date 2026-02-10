const encoder = new TextEncoder()

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET

  if (!secret) {
    throw new Error(
      'JWT_SECRET no está definido en las variables de entorno. La aplicación no puede iniciarse de forma segura.'
    )
  }

  return secret
}

export function getJwtSecret(): string {
  return readJwtSecret()
}

export function getJwtSecretKey(): Uint8Array {
  return encoder.encode(readJwtSecret())
}
