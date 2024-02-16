import {
  Metadata,
  PROGRAM_ADDRESS as metaplexProgramId,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  ConfirmedSignatureInfo,
  Connection,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import { delay, executePromisesWithDelay, getRandomNumber } from "./utils";
import { delayRange } from "./constants";

async function getAllSignatures(
  connection: Connection,
  collectionId: PublicKey
): Promise<ConfirmedSignatureInfo[]> {
  let allSignatures: ConfirmedSignatureInfo[] = [];

  // This returns the first 1000, so we need to loop through until we run out of signatures to get.
  let signatures = await connection.getSignaturesForAddress(collectionId);

  do {
    await delay(500);

    let options = {
      before: signatures[signatures.length - 1].signature,
    };
    signatures = await connection.getSignaturesForAddress(
      collectionId,
      options
    );
    allSignatures.push(...signatures);
  } while (signatures.length > 0);

  return allSignatures;
}

async function getAllTransactionsOfSignatureList(
  connection: Connection,
  allSignatures: ConfirmedSignatureInfo[]
): Promise<(ParsedTransactionWithMeta | null)[]> {
  const promises = allSignatures.map((s) =>
    connection.getParsedTransaction(s.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    })
  );

  // const transactions = await Promise.all(promises);
  const transactions = await executePromisesWithDelay(
    promises,
    100,
    delayRange
  );

  return transactions;
}

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2, 4);

  let connection = new Connection(args[1] || "https://api.metaplex.com", {
    commitment: "confirmed",
  });
  let collectionId = new PublicKey(args[0]);

  console.log("Getting signatures...");
  let allSignatures: ConfirmedSignatureInfo[] = await getAllSignatures(
    connection,
    collectionId
  );
  console.log(`Found ${allSignatures.length} signatures`);

  let randomDelay = getRandomNumber(delayRange.from, delayRange.to);
  await delay(randomDelay);

  console.log("Getting transaction data...");
  const transactions = await getAllTransactionsOfSignatureList(
    connection,
    allSignatures
  );

  let metadataAddresses: PublicKey[] = [];
  let mintAddresses = new Set<string>();

  console.log("Parsing transaction data...");
  for (const tx of transactions) {
    if (!tx) {
      continue;
    }

    let programIds: string[] = [];
    for (const ix of tx!.transaction.message.instructions) {
      programIds.push(ix.programId.toString());
    }

    // Go through all instructions in a given transaction
    for (const ix of tx!.transaction.message.instructions) {
      const partiallyDecodedInstruction = ix as PartiallyDecodedInstruction;
      const { data, accounts, programId } = partiallyDecodedInstruction;
      // Filter for setAndVerify or verify instructions in the Metaplex token metadata program
      if (
        (data == "K" || // VerifyCollection instruction
          data == "S" || // SetAndVerifyCollection instruction
          data == "X" || // VerifySizedCollectionItem instruction
          data == "Z") && // SetAndVerifySizedCollectionItem instruction
        programId.toString() == metaplexProgramId
      ) {
        metadataAddresses.push(accounts[0]);
      }
    }
  }

  const promises2 = metadataAddresses.map((a) => connection.getAccountInfo(a));
  const metadataAccounts = await executePromisesWithDelay(
    promises2,
    10,
    delayRange
  );

  for (const account of metadataAccounts) {
    if (account) {
      let metadata = await Metadata.deserialize(account!.data);
      mintAddresses.add(metadata[0].mint.toBase58());
    }
  }
  let mints: string[] = Array.from(mintAddresses);
  fs.writeFileSync(`${collectionId}_mints.json`, JSON.stringify(mints));
}

main().then(() => console.log("Success"));
