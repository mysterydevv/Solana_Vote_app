import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import type { VotingDapp } from "../target/types/voting_dapp";

describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.VotingDapp as anchor.Program<VotingDapp>;
  
  it("initialize", async () => {
    // Generate keypair for the new account
    const postAccount = new web3.Keypair();

    // Send transaction
    const name = "Example Post Name";
    const txHash = await program.methods
      .initPost(name)
      .accounts({
        postAccount: postAccount.publicKey,
        authority: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .signers([postAccount])
      .rpc();
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);


    await program.provider.connection.confirmTransaction(txHash);

    const account = await program.account.postAccount.fetch(postAccount.publicKey);

    console.log("On-chain data is:", account);

    assert.strictEqual(account.name, name);
  });
});
