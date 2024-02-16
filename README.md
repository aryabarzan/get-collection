## get-collection-ts

```
yarn install
```

```
ts-node index.ts <collection_id> <rpc_node>
```

Example:

```
ts-node index.ts 66gy1CNSpMzTtf6P8CFGY1mo5K3n7wn2bE249p31tehv
```

or with custom rpc node

```
ts-node index.ts 66gy1CNSpMzTtf6P8CFGY1mo5K3n7wn2bE249p31tehv https://api.metaplex.solana.com/
```

Outputs the list of mints to a file named `<collection_id>_mints.json`.
