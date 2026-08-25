export type UserRole = "USER" | "ADMIN";
export type UserTier = "FREE" | "PREMIUM";
export type IdentityProfile = { id:string; email:string; username:string; role:UserRole; tier:UserTier; created_at:string; updated_at:string; legacy_supabase_user_id:string|null };
export type CreateApplicationUserInput = { clerkUserId:string; email:string; username:string; applicationUserId?:string; role?:UserRole; tier?:UserTier; createdAt?:string; legacySupabaseUserId?:string };
export interface IdentityRepository {
  getUserByClerkId(clerkUserId:string):Promise<IdentityProfile|null>;
  getUserByApplicationId(applicationUserId:string):Promise<IdentityProfile|null>;
  isUsernameAvailable(username:string):Promise<boolean>;
  createApplicationUser(input:CreateApplicationUserInput):Promise<string>;
  mapClerkIdentity(clerkUserId:string,applicationUserId:string,migrationState?:"PENDING"|"ACTIVE"|"FAILED"):Promise<void>;
  getRole(clerkUserId:string):Promise<UserRole|null>;
  getTier(clerkUserId:string):Promise<UserTier|null>;
  updateProfile(clerkUserId:string,input:{username:string}):Promise<void>;
}
