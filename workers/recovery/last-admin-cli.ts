import { recoverLastAdministrator } from "./last-admin";
try {
  await recoverLastAdministrator({
    userId: process.env.RECOVERY_USER_ID ?? "",
    requestKey: process.env.RECOVERY_REQUEST_KEY ?? "",
    proofReference: process.env.RECOVERY_PROOF_REFERENCE ?? "",
    reason: process.env.RECOVERY_REASON ?? "",
    confirmation: process.env.RECOVERY_STAFF_CONFIRM ?? "",
  });
  console.log(
    "Last administrator factor reset recorded; sign in with the original identity and enroll MFA again. No financial records changed.",
  );
} catch {
  console.error(
    "Staff recovery refused; verify owner binding, sole active administrator, reviewed identity evidence, typed confirmation and disabled workers.",
  );
  process.exitCode = 1;
}
