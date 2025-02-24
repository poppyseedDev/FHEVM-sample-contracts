import { FhevmInstance } from "fhevmjs/node";

import { ACCOUNT_NAMES } from "./constants";
import { Signers } from "./signers";

const EBOOL_T = 0;
const EUINT4_T = 1;
const EUINT8_T = 2;
const EUINT16_T = 3;
const EUINT32_T = 4;
const EUINT64_T = 5;
const EUINT128_T = 6;
const EUINT160_T = 7; // @dev It is the one for eaddresses.
const EUINT256_T = 8;
const EBYTES64_T = 9;
const EBYTES128_T = 10;
const EBYTES256_T = 11;

type AccountName = (typeof ACCOUNT_NAMES)[number];

export function verifyType(handle: bigint, expectedType: number) {
  if (handle === 0n) {
    throw "Handle is not initialized";
  }

  if (handle.toString(2).length > 256) {
    throw "Handle is not a bytes32";
  }

  const typeCt = handle >> 8n;

  if (Number(typeCt % 256n) !== expectedType) {
    throw "Wrong encrypted type for the handle";
  }
}

export async function reencryptEbool(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<boolean> {
  verifyType(handle, EBOOL_T);
  return (await reencryptHandle(signers, instances, user, handle, contractAddress)) === 1n;
}

export async function reencryptEuint4(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT4_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint8(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT8_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint16(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT16_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint32(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT32_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint64(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT64_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint128(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT128_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEaddress(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<string> {
  verifyType(handle, EUINT160_T);
  const addressAsUint160: bigint = await reencryptHandle(signers, instances, user, handle, contractAddress);
  const handleStr = "0x" + addressAsUint160.toString(16).padStart(40, "0");
  return handleStr;
}

export async function reencryptEuint256(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT256_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEbytes64(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EBYTES64_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEbytes128(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EBYTES128_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEbytes256(
  signers: Signers,
  instances: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EBYTES256_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

/**
 * @dev This function is to reencrypt handles.
 *      It does not verify types.
 */
async function reencryptHandle(
  signers: Signers,
  instance: FhevmInstance,
  user: AccountName,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  const { publicKey: publicKey, privateKey: privateKey } = instance.generateKeypair();
  const eip712 = instance.createEIP712(publicKey, contractAddress);
  const signature = await signers[user as keyof Signers].signTypedData(
    eip712.domain,
    { Reencrypt: eip712.types.Reencrypt },
    eip712.message,
  );

  const reencryptedHandle = await instance.reencrypt(
    handle,
    privateKey,
    publicKey,
    signature.replace("0x", ""),
    contractAddress,
    signers[user as keyof Signers].address,
  );

  return reencryptedHandle;
}
