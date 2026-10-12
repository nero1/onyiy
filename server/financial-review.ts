import {and,eq,isNull,sql} from 'drizzle-orm';
import {simulationReorgReviews,simulationReorgResolutions,type DbExecutor} from '@gifters/db';
export async function assertUnfrozen(tx:DbExecutor,userId:string,assetId:string){
 const [review]=await tx.select({id:simulationReorgReviews.id}).from(simulationReorgReviews).leftJoin(simulationReorgResolutions,eq(simulationReorgResolutions.reviewId,simulationReorgReviews.id)).where(and(eq(simulationReorgReviews.assetId,assetId),sql`${simulationReorgReviews.affectedUserIds} @> array[${userId}::uuid]`,isNull(simulationReorgResolutions.id))).limit(1);
 if(review)throw new Error('FINANCIAL_SAFETY_PAUSE');
}
export async function assertPartitionReady(tx:DbExecutor,partitionId:string){
 const [review]=await tx.select({id:simulationReorgReviews.id}).from(simulationReorgReviews).leftJoin(simulationReorgResolutions,eq(simulationReorgResolutions.reviewId,simulationReorgReviews.id)).where(and(eq(simulationReorgReviews.partitionId,partitionId),isNull(simulationReorgResolutions.id))).limit(1);
 if(review)throw new Error('FINANCIAL_SAFETY_PAUSE');
}
