// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Cert {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    struct Certificate {
        string id;          //Certificate ID
        string name;        //  tên người học
        string hash;        // giá trị băm SHA-256 của file PDF văn bằng
        string cid;         //mã CID của file metadata được lưu trên IPFS
        address issuer;     //địa chỉ ví Ethereum của Cơ sở đào tạo đã cấp văn bằng.
        bytes32 identity;    //  người sở hữu
        bool valid;            //Trạng thái hiệu lực của văn bằng
    }
mapping(bytes32 => address) public identityToWallet;
mapping(address => bytes32) public walletToIdentity;
mapping(bytes32 => string[]) public certsByIdentity;
    mapping(string => Certificate) public certs;
    mapping(string => string) public hashToCert;
mapping(address => bool) public issuers;
    //  LIST
    string[] public certIds;
    mapping(address => string[]) public certsByIssuer;
    mapping(address => string[]) public certsByStudent;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender], "Not issuer");
        _;
    }

    function addIssuer(address _issuer) public onlyAdmin {
        issuers[_issuer] = true;
    }

  function issueCert(
    string memory _id,
    string memory _name,
    string memory _hash,
    string memory _cid,
    bytes32 _identity
) public onlyIssuer {
require(bytes(certs[_id].id).length == 0, "ID exists");

require(bytes(_hash).length > 0, "Hash empty");

require(
    bytes(hashToCert[_hash]).length == 0,
    "Certificate already exists"
);

require(bytes(_cid).length > 0, "CID empty");
    certs[_id] = Certificate(
        _id,
        _name,
        _hash,
        _cid,
        msg.sender,
        _identity,
        true
    );
hashToCert[_hash] = _id; //  THÊM DÒNG NÀY
    certIds.push(_id);
    certsByIssuer[msg.sender].push(_id);
    certsByIdentity[_identity].push(_id);
}

    function revokeCert(string memory _id) public onlyIssuer {
    require(certs[_id].issuer == msg.sender, "Not owner");
    certs[_id].valid = false;
}
   function verifyCert(string memory _id)
    public view
    returns (
        string memory,
        string memory,
        bool,
        address,
        bytes32
    )
{
    Certificate memory cert = certs[_id];
require(bytes(cert.id).length > 0, "Cert not found");
    return (
        cert.hash,
        cert.cid,
        cert.valid,
        cert.issuer,
        cert.identity
    );
}

    function getAllCertIds() public view returns (string[] memory) {
        return certIds;
    }

    function getCertsByIssuer(address _issuer)
        public view
        returns (string[] memory)
    {
        return certsByIssuer[_issuer];
    }

    function getCertsByStudent(address _student)
        public view
        returns (string[] memory)
    {
        return certsByStudent[_student];
    }
function registerIdentity(bytes32 _identity, address _wallet) public {
    require(identityToWallet[_identity] == address(0), "Identity exists");

    identityToWallet[_identity] = _wallet;
    walletToIdentity[_wallet] = _identity;
}
function getCertsByIdentity(bytes32 _identity)
    public view
    returns (string[] memory)
{
    return certsByIdentity[_identity];
}

}