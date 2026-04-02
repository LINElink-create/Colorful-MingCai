export type VerificationStatus = 'unverified' | 'pending' | 'verified'

export type BackendAccount = {
  id: number
  userUuid: string
  email?: string
  displayName?: string
  emailVerified?: boolean
  verificationStatus?: VerificationStatus
}

export type BackendAuthSession = {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: BackendAccount
}