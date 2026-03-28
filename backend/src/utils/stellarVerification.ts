import { Server } from "stellar-sdk";

const server = new Server("https://horizon-testnet.stellar.org");

export async function verifyBalance(accountId: string, asset: string, expected: number): Promise<boolean> {
  const account = await server.loadAccount(accountId);
  const balance = account.balances.find(b => b.asset_code === asset);
  return balance ? Number(balance.balance) >= expected : false;
}
