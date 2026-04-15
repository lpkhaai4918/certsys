import axios from "axios";
import { useState } from "react";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { contractAddress, contractABI } from "./contract";
import { QRCodeCanvas } from "qrcode.react";

// 🔥 API KEY (ĐÃ SỬA)
const PINATA_API_KEY = "1de4fd13252942b4cadc";
const PINATA_SECRET_KEY =
  "0ab2f90205f2c951eedbc44b23d28ba78623ffbe9b2e916cfd1eceeffd8e7674";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [verifyResult, setVerifyResult] = useState("");
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [metaDataView, setMetaDataView] = useState(null);

  const [certId, setCertId] = useState("");

  // CONNECT WALLET
  async function connectWallet() {
    if (!window.ethereum) return alert("Cài MetaMask");

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setAccount(accounts[0]);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contractInstance = new ethers.Contract(
      contractAddress,
      contractABI,
      signer
    );

    setContract(contractInstance);
  }

  // UPLOAD IPFS
  async function uploadToIPFS(file) {
    try {
      const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

      let formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(url, formData, {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      });

      return res.data.IpfsHash;
    } catch (err) {
      console.error(err);
      alert("❌ Upload IPFS lỗi (check API key)");
      return null;
    }
  }

  // UPLOAD METADATA
  async function uploadMetadata() {
    const metadata = { name, school, major, hash: fileHash, file: cid };

    const blob = new Blob([JSON.stringify(metadata)]);
    const file = new File([blob], "metadata.json");

    return await uploadToIPFS(file);
  }

  // HANDLE FILE
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const hash = CryptoJS.SHA256(
        CryptoJS.lib.WordArray.create(buffer)
      ).toString();

      setFileHash(hash);

      const ipfsCID = await uploadToIPFS(file);

      if (ipfsCID) {
        setCid(ipfsCID);
        alert("✅ Upload thành công");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi file");
    }

    setLoading(false);
  }

  // LOAD METADATA
  async function loadMetadata(metaCID) {
    try {
      if (!metaCID) return;

      const res = await fetch(
        `https://gateway.pinata.cloud/ipfs/${metaCID}`
      );
      const data = await res.json();

      setMetaDataView(data);
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi load metadata");
    }
  }

  // VERIFY
  async function verifyCert() {
    if (!contract) return alert("Chưa connect ví");

    try {
      const result = await contract.verifyCert(certId);

      console.log("DEBUG:", result);

      const hash = result[0];
      const metadataCID = result[1];
      const isValid = result[2];

      await loadMetadata(metadataCID);

      if (!isValid) {
        setVerifyResult("❌ ĐÃ BỊ THU HỒI");
      } else if (fileHash && hash === fileHash) {
        setVerifyResult("✅ HỢP LỆ (ĐÚNG FILE)");
      } else {
        setVerifyResult("⚠️ HỢP LỆ");
      }
    } catch (err) {
      console.error(err);
      setVerifyResult("❌ Lỗi verify");
    }
  }

  // ISSUE
  async function issueCert() {
    if (!contract) return alert("Chưa connect ví");
    if (!name || !school || !major)
      return alert("Nhập đầy đủ thông tin");
    if (!fileHash || !cid)
      return alert("Upload file trước");

    try {
      const metadataCID = await uploadMetadata();

      if (!metadataCID) return alert("Upload metadata lỗi");

      const tx = await contract.issueCert(
        certId,
        fileHash,
        metadataCID
      );
      await tx.wait();

      alert("✅ Issued!");
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi issue");
    }
  }

  // REVOKE
  async function revokeCert() {
    if (!contract) return alert("Chưa connect ví");

    try {
      const tx = await contract.revokeCert(certId);
      await tx.wait();

      alert("🚫 Đã thu hồi");
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi revoke");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-[500px]">
        <h1 className="text-2xl font-bold text-center mb-4">
          🎓 Cert Blockchain
        </h1>

        <button
          onClick={connectWallet}
          className="bg-blue-500 text-white w-full p-2 rounded-lg mb-3"
        >
          Connect Wallet
        </button>

        <p className="text-sm mb-4 break-all">{account}</p>

        {/* SEARCH */}
        <h3 className="font-semibold mb-2">🔍 Search Certificate</h3>

        <input
          placeholder="Nhập Cert ID"
          className="border p-2 w-full mb-2 rounded"
          onChange={(e) => setCertId(e.target.value)}
        />

        <button
          onClick={verifyCert}
          className="bg-green-500 text-white w-full p-2 rounded"
        >
          Verify
        </button>

        <h2 className="text-center mt-3">{verifyResult}</h2>

        {/* METADATA */}
        {metaDataView && (
          <div className="mt-4 text-sm">
            <p><b>Tên:</b> {metaDataView.name}</p>
            <p><b>Trường:</b> {metaDataView.school}</p>
            <p><b>Ngành:</b> {metaDataView.major}</p>
          </div>
        )}

        {/* PDF */}
        {metaDataView?.file && (
          <iframe
            className="mt-4 w-full h-[300px]"
            src={`https://gateway.pinata.cloud/ipfs/${metaDataView.file}`}
            title="Certificate"
          />
        )}

        <hr className="my-4" />

        {/* ISSUE */}
        <h3 className="font-semibold mb-2">📤 Issue Certificate</h3>

        <input
          placeholder="Tên"
          className="border p-2 w-full mb-2"
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Trường"
          className="border p-2 w-full mb-2"
          onChange={(e) => setSchool(e.target.value)}
        />

        <input
          placeholder="Ngành"
          className="border p-2 w-full mb-2"
          onChange={(e) => setMajor(e.target.value)}
        />

        <input type="file" onChange={handleFileUpload} />

        {loading && <p>⏳ Đang upload...</p>}

        <button
          onClick={issueCert}
          className="bg-purple-500 text-white w-full p-2 rounded mt-3"
        >
          Issue
        </button>

        <button
          onClick={revokeCert}
          className="bg-red-500 text-white w-full p-2 rounded mt-2"
        >
          Revoke
        </button>

        {/* QR */}
        <div className="flex justify-center mt-4">
          <QRCodeCanvas value={`http://localhost:3000?id=${certId}`} />
        </div>
      </div>
    </div>
  );
}

export default App;