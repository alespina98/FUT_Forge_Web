import "server-only";
import { getIdentityRepository,normalizeUsername,validUsername } from "./turso-identity-repository";
export { normalizeUsername,validUsername };
export async function checkUsernameAvailability(username:string){return getIdentityRepository().isUsernameAvailable(username)}
export async function getAppUserIdFromClerkId(clerkUserId:string){return(await getIdentityRepository().getUserByClerkId(clerkUserId))?.id??null}
export async function getProfileForClerkUser(clerkUserId:string){return getIdentityRepository().getUserByClerkId(clerkUserId)}
export async function createProfileForClerkUser(input:{clerkUserId:string;email:string;username:string}){return getIdentityRepository().createApplicationUser(input)}
export async function getUserRole(clerkUserId:string){return getIdentityRepository().getRole(clerkUserId)}
export async function getUserTier(clerkUserId:string){return getIdentityRepository().getTier(clerkUserId)}
export async function updateProfile(clerkUserId:string,input:{username:string}){return getIdentityRepository().updateProfile(clerkUserId,input)}
