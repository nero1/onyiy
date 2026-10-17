/** Calendar age is checked against the server's UTC date. Birth date is not
 * returned or retained: this verifies a declaration, not a person's identity. */
export function assertMinimumAge(birthDate:string,minimumAge:number,serverTime:Date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||!Number.isInteger(minimumAge)||minimumAge<1||minimumAge>120||!Number.isFinite(serverTime.getTime()))throw new Error('INVALID_INPUT');
 const birth=new Date(birthDate+'T00:00:00.000Z');
 if(!Number.isFinite(birth.getTime())||birth.getUTCFullYear()<1||birth.toISOString().slice(0,10)!==birthDate||birthDate>serverTime.toISOString().slice(0,10))throw new Error('INVALID_INPUT');
 const anniversaryPassed=serverTime.getUTCMonth()>birth.getUTCMonth()||serverTime.getUTCMonth()===birth.getUTCMonth()&&serverTime.getUTCDate()>=birth.getUTCDate();
 const age=serverTime.getUTCFullYear()-birth.getUTCFullYear()-(anniversaryPassed?0:1);
 if(age<minimumAge)throw new Error('CONSENT_REQUIRED');
}
