// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Cert {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    struct Certificate {
        string hash;
        string cid;
        address issuer;
        bool valid;
    }

    mapping(string => Certificate) public certs;
    mapping(address => bool) public whitelist;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyIssuer() {
        require(whitelist[msg.sender], "Not issuer");
        _;
    }

    function addIssuer(address _issuer) public onlyAdmin {
        whitelist[_issuer] = true;
    }

    function issueCert(string memory _id, string memory _hash, string memory _cid) public onlyIssuer {
        certs[_id] = Certificate(_hash, _cid, msg.sender, true);
    }

    function revokeCert(string memory _id) public onlyIssuer {
        certs[_id].valid = false;
    }

   function verifyCert(string memory _id) public view returns (string memory, string memory, bool) {
    Certificate memory cert = certs[_id];
    return (cert.hash, cert.cid, cert.valid);
}
}