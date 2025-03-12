### Deploy guide
Network setup options
```
export interface NetworkSetup {
    name?: string;
    chainId?: number;
    seed?: string;
    userKeys?: Wallet[];
    ownerKey?: Wallet;
    operatorKey?: Wallet;
    relayerKey?: Wallet;
    adminKeys?: Wallet[];
    threshold?: number;
    lastRelayedBlock?: number;
    lastExpressedBlock?: number;
}
```