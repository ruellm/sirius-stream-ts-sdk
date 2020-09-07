
export function  extractHostAndIP(address : string) {
    var r = address.split(':');
    return {
        host: r[0],
        port: parseInt(r[1])
    };
}