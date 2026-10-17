import {selectedPaymentEnvironment} from '@gifters/config';
import NativePortal from '@/components/native-portal';
export const dynamic='force-dynamic';
export default function Page(){return <NativePortal environment={selectedPaymentEnvironment()==="mainnet"?"mainnet":"testnet"}/>}
