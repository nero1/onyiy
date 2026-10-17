import type {PublicManifestDto} from './financial-contracts';
/** A slow public cache response must not replace a newer authenticated policy.
 * An explicitly unavailable response still closes visible features. */
export function latestPublicManifest(current:PublicManifestDto|null,next:PublicManifestDto){
 if(current&&current.configuration_available!==false&&next.configuration_available!==false&&Number.isSafeInteger(current.profile_revision)&&Number.isSafeInteger(next.profile_revision)&&next.profile_revision<current.profile_revision)return current;
 return next;
}
