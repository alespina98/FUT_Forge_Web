export type UserRole = "USER" | "ADMIN";
export type UserTier = "FREE" | "PREMIUM";
export type MigrationState = "PENDING" | "PASSWORD_RECOVERY_REQUIRED" | "ACTIVE" | "FAILED";
export type LoginRouting = { recoveryRequired: boolean; email?: string };
export type IdentityProfile = { id:string; email:string; username:string; role:UserRole; tier:UserTier; created_at:string; updated_at:string; legacy_supabase_user_id:string|null };
export type AdminUser = IdentityProfile & { migration_state:MigrationState; total_count?:number };
export type AdminAuditEntry = { id:string; actor_application_user_id:string; target_application_user_id:string; action:string; old_value:string|null; new_value:string|null; created_at:string };
export type EntitlementOverride = { feature_id:string; enabled:boolean; updated_at:string };
export type CreateApplicationUserInput = { clerkUserId:string; email:string; username:string; applicationUserId?:string; role?:UserRole; tier?:UserTier; createdAt?:string; legacySupabaseUserId?:string };
export interface IdentityRepository {
  getUserByClerkId(clerkUserId:string):Promise<IdentityProfile|null>;
  getUserByApplicationId(applicationUserId:string):Promise<IdentityProfile|null>;
  getUserByLegacySupabaseId(legacySupabaseUserId:string):Promise<IdentityProfile|null>;
  isUsernameAvailable(username:string):Promise<boolean>;
  createApplicationUser(input:CreateApplicationUserInput):Promise<string>;
  mapClerkIdentity(clerkUserId:string,applicationUserId:string,migrationState?:MigrationState):Promise<void>;
  getLoginRouting(identifier:string):Promise<LoginRouting>;
  completePasswordMigration(clerkUserId:string):Promise<void>;
  getRole(clerkUserId:string):Promise<UserRole|null>;
  getTier(clerkUserId:string):Promise<UserTier|null>;
  updateProfile(clerkUserId:string,input:{username:string}):Promise<void>;
  // Self-service (no actor/admin check) read of a user's own entitlement
  // overrides - the caller is responsible for having already authenticated
  // applicationUserId itself. Distinct from getAdminOverrides, which checks
  // the actor is an admin looking at someone else's account.
  getEntitlementOverrides(applicationUserId:string):Promise<EntitlementOverride[]>;
  listAdminUsers(input:{actorApplicationUserId:string;search?:string;role?:UserRole;tier?:UserTier;limit:number;offset:number}):Promise<{users:AdminUser[];total:number}>;
  getAdminUser(actorApplicationUserId:string,targetApplicationUserId:string):Promise<AdminUser|null>;
  getAdminOverrides(actorApplicationUserId:string,targetApplicationUserId:string):Promise<EntitlementOverride[]>;
  getAdminAudit(actorApplicationUserId:string,targetApplicationUserId:string):Promise<AdminAuditEntry[]>;
  adminSetRole(actorApplicationUserId:string,targetApplicationUserId:string,role:UserRole):Promise<void>;
  adminSetTier(actorApplicationUserId:string,targetApplicationUserId:string,tier:UserTier):Promise<void>;
  adminSetUsername(actorApplicationUserId:string,targetApplicationUserId:string,username:string):Promise<void>;
  adminSetEntitlement(actorApplicationUserId:string,targetApplicationUserId:string,featureId:string,state:"DEFAULT"|"ENABLED"|"DISABLED"):Promise<void>;
}
