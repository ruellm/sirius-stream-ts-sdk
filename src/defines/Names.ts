export const PSPSystemNamespace           = "psp";
export const PSPOnionNodeSubnamespace     = "onion";
export const PSPAuthNodeSubnamespace      = "auth";
export const PSPDiscoveryNodeSubnamespace = "discovery";
export const PSPOracleNodeSubnamespace    = "oracle";

export const TypeClient        = 1;
export const TypeOnionNode     = 2;
export const TypeDiscoveryNode = 4;
export const TypeAuthorityNode = 8;
export const TypeOracleNode    = 16;

export function convertMode(key) {
    let table = new Map([
        [PSPOnionNodeSubnamespace,    TypeOnionNode],
        [PSPDiscoveryNodeSubnamespace, TypeDiscoveryNode],
        [PSPAuthNodeSubnamespace,      TypeAuthorityNode],
        [PSPOracleNodeSubnamespace,    TypeOracleNode],
    ]);

    return table.get(key);
}
