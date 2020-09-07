
// Convert a hex string to a byte array
export function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// Convert a byte array to a hex string
export function bytesToHex(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("").toUpperCase();
}

export function stringToAsciiByteArray(str)
{
    var bytes = [];
    for (var i = 0; i < str.length; ++i)
    {
        var charCode = str.charCodeAt(i);
        if (charCode > 0xFF)  // char > 1 byte since charCodeAt returns the UTF-16 value
        {
            throw new Error('Character ' + String.fromCharCode(charCode) + ' can\'t be represented by a US-ASCII byte.');
        }
        bytes.push(charCode);
    }
    return bytes;
}