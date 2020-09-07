"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OnionClientConnection_1 = require("../src/client/OnionClientConnection");
describe('connection test', () => {
    it('should conect to TLS server', () => {
        var con = new OnionClientConnection_1.OnionClientConnection();
        con.connect("discovery5", 6003, () => {
            // reserve
        });
    });
});
