import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

// Hash a plain text password before storing
// 12 rounds is the production standard — slow enough to resist brute force
// but fast enough for real use (~300ms per hash)
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS)
}

// Compare a plain text password against a stored hash
// Returns true if they match, false otherwise
// bcrypt.compare is timing-safe — prevents timing attacks
export const comparePassword = async (
    password: string,
    hash: string
): Promise<boolean> => {
    return bcrypt.compare(password, hash)
}