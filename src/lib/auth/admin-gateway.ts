import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getIdentityRepository } from "./turso-identity-repository";

export class AdminAccessError extends Error { constructor(public readonly status:401|404|503){super("Admin access unavailable")} }

export async function requireClerkAdmin(){
  let clerkUserId:string|null;
  try{clerkUserId=(await auth()).userId}catch{throw new AdminAccessError(503)}
  if(!clerkUserId)throw new AdminAccessError(401);
  let actor;
  try{actor=await getIdentityRepository().getUserByClerkId(clerkUserId)}catch{throw new AdminAccessError(503)}
  if(!actor||actor.role!=="ADMIN")throw new AdminAccessError(404);
  return{actor,repository:getIdentityRepository()};
}
