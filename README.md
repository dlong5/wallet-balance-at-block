# wallet-balance-at-block

Get the wallet balances for a given address at a specific block number

Works only for the Avalanche C-Chain

## Usage
```text
node index.js <wallet address> <?blockNumber>
```
blockNumber is optional

## Output
```text
┌──────────┬────────────────────────────────────────────┬──────────────────────┐
│ Symbol   │ Address                                    │ Balance              │
├──────────┼────────────────────────────────────────────┼──────────────────────┤
│ AVAX     │ <gas token>                                │ 0.269798544124904098 │
│ Lydia-LP │ 0xb74791cc65479132b52043b764bbb540439fdf02 │ 0                    │
│ WETH.e   │ 0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab │ 0                    │
└──────────┴────────────────────────────────────────────┴──────────────────────┘
```

## Prerequisite
Environment variable SNOWTRACE_API_KEY  
Retrieve from https://snowtrace.io/myapikey
