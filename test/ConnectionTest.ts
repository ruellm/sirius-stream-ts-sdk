
import {OnionClientConnection} from "../src/client/OnionClientConnection";

describe('connection test', () => {
    it('should conect to TLS server', () => {
        var fingerprint = "BCB322D1626F75C06AA1BD31536EEA84CDAC7232F1CC7851A31AED57713BDF6B";
        var con = new OnionClientConnection();
        con.connect("discovery5", 6005, fingerprint,()=>{
            // reserve
        });
    })
});