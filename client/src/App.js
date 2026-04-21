import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { contractAddress, contractABI } from "./contract";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import {
  FaUserGraduate,
  FaUniversity,
  FaShieldAlt,
  FaCheckCircle,
  FaFilePdf,
  FaUsers
} from "react-icons/fa";
function App() {
  const certRef = useRef();
  const [searchName, setSearchName] = useState("");
  const [readContract, setReadContract] = useState(null);
  const [availableAccounts, setAvailableAccounts] = useState([]);
const [latestCert, setLatestCert] = useState(null);
  const [role, setRole] = useState("viewer");
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [grade, setGrade] = useState("");
const [date, setDate] = useState("");
const [issueMode, setIssueMode] = useState("upload"); 
// "upload" | "form"
  const [fileHash, setFileHash] = useState("");
  const [cid, setCid] = useState("");
  const [certId, setCertId] = useState("");
  const [verifyResult, setVerifyResult] = useState("");
const [showIssuerList, setShowIssuerList] = useState(false);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [studentAddress, setStudentAddress] = useState("");
const [cccd, setCccd] = useState("");
  const [metaDataView, setMetaDataView] = useState(null);
  const [issuerAddress, setIssuerAddress] = useState("");
const [uploading, setUploading] = useState(false);
  const [issuerCerts, setIssuerCerts] = useState([]);
  const [studentCerts, setStudentCerts] = useState([]);
const [note, setNote] = useState("");
const [expiryDate, setExpiryDate] = useState("");
const [studentWallet, setStudentWallet] = useState("");
const [accountsList, setAccountsList] = useState([]);
  const [verifiedHash, setVerifiedHash] = useState("");
const [selectedFile, setSelectedFile] = useState(null);
const [loading, setLoading] = useState(false);
const [verifyMode, setVerifyMode] = useState("id");
const [verifyInputId, setVerifyInputId] = useState("");
  const BASE_URL = "http://localhost:3000";

 // ================= AUTO LOAD QR =================
// ================= AUTO LOAD QR =================
useEffect(() => {
  const autoVerify = async () => {
    if (!readContract) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const auto = params.get("auto");

    if (id && auto === "true") {
      console.log("AUTO VERIFY QR:", id);

      setVerifyMode("qr");
      setCertId(id);

      try {
        const result = await readContract.verifyCert(id);

        const metadataCID = result[1];
        const isValid = result[2];

        await loadMetadata(metadataCID);

        if (!isValid) {
          setVerifyResult("❌ REVOKED");
        } else {
          setVerifyResult("✅ HỢP LỆ (QR)");
        }

      } catch (err) {
        console.error(err);
        setVerifyResult("❌ Không tìm thấy CertID");
      }
    }
  };

  autoVerify();
}, [readContract]);

//  AUTO GENERATE CERT ID KHI LÀ ISSUER
useEffect(() => {
  if (role === "issuer") {
    setCertId("CERT-" + Date.now());
  }
}, [role]);


useEffect(() => {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  const c = new ethers.Contract(
    contractAddress,
    contractABI,
    provider
  );

  setReadContract(c);
}, []);
  // ================= CONNECT =================
async function connectWallet() {
  if (!window.ethereum) return alert("Cài MetaMask");

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  setAccount(accounts[0]);
  console.log("CONNECTED ACCOUNT:", accounts[0]);

  const allAccounts = await window.ethereum.request({
    method: "eth_accounts",
  });

  // 🔥 loại issuer (account hiện tại) + admin (account[0])
  const filtered = allAccounts.filter(
    acc => acc !== accounts[0] && acc !== allAccounts[0]
  );

  setAccountsList(allAccounts);
  setAvailableAccounts(filtered); 

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  setContract(
    new ethers.Contract(contractAddress, contractABI, signer)
  );
}

  // ================= UPLOAD =================
async function uploadToIPFS(file) {
  try {
    setUploading(true); // 🔥 START

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      "http://localhost:5000/upload",
      formData
    );

    return res.data.cid;
  } catch (err) {
    alert("Upload lỗi (chưa chạy server?)");
    return null;
  } finally {
    setUploading(false); // STOP
  }
}

  // ================= HASH =================
function hashCCCD(cccd) {
  const salt = "my-secret-salt";
  return ethers.keccak256(
    ethers.toUtf8Bytes(cccd + salt)
  );
}
function isValidCCCD(cccd) {
  return /^\d{9,12}$/.test(cccd);
}

  async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 🔥 CHECK PDF 
  if (file.type !== "application/pdf") {
      setLoading(false);

    return alert("Chỉ được upload file PDF");
  }

  const buffer = await file.arrayBuffer();
  const hash = CryptoJS.SHA256(
    CryptoJS.lib.WordArray.create(buffer)
  ).toString();

  setFileHash(hash);

  const ipfsCID = await uploadToIPFS(file);
  if (ipfsCID) setCid(ipfsCID);
}
async function handleVerifyFile(e) {
  const file = e.target.files[0];
  if (!file) return;

 

  // 🔥 HASH FILE USER UPLOAD (QUAN TRỌNG NHẤT)
  const buffer = await file.arrayBuffer();

  const hash = CryptoJS.SHA256(
    CryptoJS.lib.WordArray.create(buffer)
  ).toString();

  setFileHash(hash);

  alert("✅ Đã load file user");

  // 🔥 VERIFY với hash này
const c = contract || readContract;

// 🔥 lấy certId từ hash
const foundCertId = await c.hashToCert(hash);

if (!foundCertId || foundCertId === "") {
  return setVerifyResult("❌ Không tìm thấy cert");
}

// 🔥 set lại certId
setCertId(foundCertId);

// 🔥 verify bình thường
await verifyCert(hash);}

  async function uploadMetadata() {
    const metadata = { name, school, major, hash: fileHash, file: cid };

    const blob = new Blob([JSON.stringify(metadata)]);
    const file = new File([blob], "metadata.json");

    return await uploadToIPFS(file);
  }

 async function loadMetadata(metaCID) {
  try {
    if (!metaCID || metaCID === "") {
      console.log("❌ CID rỗng:", metaCID);
      return;
    }

    console.log("✅ Loading CID:", metaCID);

    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${metaCID}`);

    const data = await res.json();
    setMetaDataView(data);
  } catch (err) {
    console.error("❌ Load metadata lỗi:", err);
  }
}

  // ================= VERIFY =================
async function verifyCert(customHash, forcedMode = null) {
  try {
    const c = contract || readContract;

    if (!c) {
      return alert("Contract chưa sẵn sàng");
    }

    // QR mode → không cần CCCD
    const currentMode = forcedMode || verifyMode;
const needIdentityCheck = currentMode !== "qr";

    // chỉ ID + FILE mới bắt nhập CCCD
    if (needIdentityCheck && (!cccd || !cccd.trim())) {
      return alert("Nhập CCCD");
    }
let idToVerify = "";

if (currentMode === "id") {
  idToVerify = verifyInputId?.trim();
}

if (currentMode === "qr") {
  const params = new URLSearchParams(window.location.search);
  idToVerify = params.get("id");
}

if (currentMode === "file") {
  idToVerify = certId;
}

    if (customHash) {
      idToVerify = await c.hashToCert(customHash);

      if (!idToVerify || idToVerify === "") {
        return setVerifyResult("❌ Không tìm thấy cert");
      }

      setCertId(idToVerify);
    }

    if (!idToVerify) {
      return alert("❌ Không tìm thấy CertID");
    }
console.log("VERIFY MODE:", currentMode);
console.log("ID TO VERIFY:", idToVerify);
    const result = await c.verifyCert(idToVerify);

    // chỉ check CCCD nếu cần
    if (needIdentityCheck) {
  const identity = hashCCCD(cccd);

  

  if (result[4].toLowerCase() !== identity.toLowerCase()) {
    return setVerifyResult("❌ CCCD KHÔNG KHỚP");
  }
}

    const hash = result[0];
    const metadataCID = result[1];
    const isValid = result[2];

    setVerifiedHash(hash);
    await loadMetadata(metadataCID);

    const compareHash = customHash || fileHash;

    if (!isValid) {
      return setVerifyResult("❌ REVOKED");
    }

    if (!compareHash) {
      return setVerifyResult("✅ HỢP LỆ (THEO ID)");
    }

    if (hash === compareHash) {
      return setVerifyResult("✅ FILE CHÍNH XÁC");
    } else {
      return setVerifyResult("❌ FILE BỊ SỬA");
    }

  } catch (err) {
    console.error(err);
    alert("❌ Verify lỗi");
  }
}

  // ================= ISSUE =================
  function isValidDateFormat(dateStr) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
}
async function issueCert() {
  try {
    setLoading(true);

    if (!name || !name.trim()) {
      setLoading(false);
      return alert("❌ Vui lòng nhập tên sinh viên");
    }

    if (!account) {
      setLoading(false);
      return alert("Connect ví trước");
    }
   // 🔥 CHECK FORMAT NGÀY
if (issueMode === "form") {
  if (!isValidDateFormat(date)) {
    return alert("❌ Ngày cấp sai format dd/mm/yyyy");
  }

  if (expiryDate && !isValidDateFormat(expiryDate)) {
    return alert("❌ Ngày hết hạn sai format");
  }
}
// AUTO chọn ví khác issuer
// dùng CCCD thay vì ví
if (!cccd) {
  setLoading(false);
  return alert("Nhập CCCD sinh viên");
}

if (!isValidCCCD(cccd)) {
  setLoading(false);
  return alert("❌ CCCD không hợp lệ (9-12 số)");
}

const identity = hashCCCD(cccd);

// CHECK ISSUER CHUẨN HƠN
const signerAddress = await contract.runner.getAddress();

console.log("ACCOUNT STATE:", account);
console.log("SIGNER ADDRESS:", signerAddress);

const isIssuer = await contract.issuers(signerAddress);

console.log("IS ISSUER:", isIssuer);
if (!isIssuer) {
  setLoading(false);
  return alert("❌ Bạn không phải issuer");
}

    let currentHash = "";
    let currentCID = "";
    let file;

    //  MODE FORM → tự tạo PDF + QR
    if (issueMode === "form") {
      file = await generatePDFfromForm();
    }

    //  MODE UPLOAD → thêm QR + ID vào file
   if (issueMode === "upload") {
  if (!selectedFile) return alert("Upload file trước!");

  file = await addQRToUploadedPDF(selectedFile);
}
//  UPLOAD FILE PDF
const uploadedCID = await uploadToIPFS(file);

//  HASH FILE TỪ IPFS (CHUẨN)
const url = `https://gateway.pinata.cloud/ipfs/${uploadedCID}`;
const res = await fetch(url);
const buffer = await res.arrayBuffer();

currentHash = CryptoJS.SHA256(
  CryptoJS.lib.WordArray.create(buffer)
).toString();

    setFileHash(currentHash);
    setCid(uploadedCID);
    currentCID = uploadedCID;
setLatestCert(uploadedCID); // 🔥 thêm dòng này
    // METADATA
    const metadata = {
  certId,          //  thêm
  name,
  cccd, //  thêm dòng này
  school,
  major,
  grade,
  date,
  note,
  expiryDate,
  issuer: account, //  thêm
  hash: currentHash,
  file: currentCID,
};

    const blob = new Blob([JSON.stringify(metadata)]);
    const metaFile = new File([blob], "metadata.json");

    const metadataCID = await uploadToIPFS(metaFile);

    //  GHI LÊN BLOCKCHAIN
    console.log("CERT ID ISSUE:", certId);
   const tx = await contract.issueCert(
  certId,
  name,
  currentHash,
  metadataCID,
  identity // ✅
);

    await tx.wait();

console.log("TX SUCCESS");

const check = await contract.verifyCert(certId);
console.log("CHECK AFTER ISSUE:", check);

    alert("✅ Issued!");
    setShowIssuerList(false);
setLoading(false); //  STOP loading
setCertId("CERT-" + Date.now());

// CLEAR FORM
setSelectedFile(null);
setName("");
setSchool("");
setMajor("");
setGrade("");
setDate("");
setNote("");
setExpiryDate("");
  } catch (err) {
  console.error("❌ ERROR:", err);
  alert("❌ Issue lỗi: " + err.message);
  setLoading(false); //  tránh bị treo loading
}
}
  // ================= PDF =================
 async function generatePDFfromForm() {
  const div = document.createElement("div");

  div.style.width = "1100px";
  div.style.padding = "50px";
  div.style.background = "white";
  div.style.fontFamily = "Arial";
  div.style.position = "fixed";
  div.style.top = "-9999px";
  div.style.left = "-9999px";
  div.style.lineHeight = "1.8";

  div.innerHTML = `
  <div style="text-align: center; margin-bottom: 30px;">

    <h1 style="margin:0;">VĂN BẰNG </h1>
    <h2 style="margin:0;"> CERTIFICATE</h2>
  </div>

  <p><strong>Họ và tên / Full Name:</strong> ${name}</p>

  <p><strong>Cơ sở đào tạo / Institution:</strong> ${school}</p>

  <p><strong>Ngành học / Major:</strong> ${major}</p>

  <p><strong>Xếp loại / Classification:</strong> ${grade}</p>

  <p><strong>Ngày cấp / Issue Date:</strong> ${date}</p>

  <p><strong>Mã văn bằng / Certificate ID:</strong> ${certId}</p>

  ${
    note
      ? `<p><strong>Ghi chú / Note:</strong> ${note}</p>`
      : ""
  }

  ${
    expiryDate
      ? `<p><strong>Ngày hết hạn / Expiry Date:</strong> ${expiryDate}</p>`
      : ""
  }

  <br/><br/>

  <div style="display:flex; justify-content:space-between; margin-top:60px;">
  
  </div>
`;

  document.body.appendChild(div);

  const canvas = await html2canvas(div, {
    scale: 2,
    useCORS: true,
  });

  document.body.removeChild(div);

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("landscape", "mm", "a4");

  pdf.addImage(imgData, "PNG", 10, 10, 270, 150);

  // QR code xác thực
  const qrData = `${BASE_URL}?id=${certId}&auto=true`;
  const qrImg = await QRCode.toDataURL(qrData);

  pdf.addImage(qrImg, "PNG", 230, 105, 40, 40);

  const blob = pdf.output("blob");

  return new File([blob], "certificate.pdf");
}
async function addQRToUploadedPDF(file) {
  // đọc file PDF gốc
  const arrayBuffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  const firstPage = pages[0];

  // tạo QR code
  const qrData = `${BASE_URL}?id=${certId}&auto=true`;
  const qrImage = await QRCode.toDataURL(qrData);

  // convert QR image thành bytes
  const qrBytes = await fetch(qrImage).then((res) =>
    res.arrayBuffer()
  );

  const qrEmbed = await pdfDoc.embedPng(qrBytes);

  const { width } = firstPage.getSize();

  // chèn QR vào góc phải
  firstPage.drawImage(qrEmbed, {
    x: width - 120,
    y: 50,
    width: 80,
    height: 80,
  });

  // chèn CertID
  firstPage.drawText(`ID: ${certId}`, {
    x: 50,
    y: 50,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // xuất PDF mới
  const pdfBytes = await pdfDoc.save();

  return new File(
    [pdfBytes],
    "certificate_with_qr.pdf",
    {
      type: "application/pdf",
    }
  );
}
  // ================= ADMIN =================
  async function addIssuer() {
  if (!ethers.isAddress(issuerAddress)) {
    return alert("❌ Địa chỉ ví không hợp lệ");
  }

  const tx = await contract.addIssuer(issuerAddress);
  await tx.wait();

  alert("✅ Added issuer!");
  setIssuerAddress("");
}
async function revokeCert(id) {
  try {
    const tx = await contract.revokeCert(id);
    await tx.wait();

    alert("❌ Revoked!");
    loadIssuerCerts();
  } catch (err) {
    console.error(err);
    alert("Lỗi revoke");
  }
}
// ================= LIST =================
async function loadIssuerCerts() {
  try {
    const ids = await contract.getCertsByIssuer(account);

    const fullData = await Promise.all(
      ids.map(async (id) => {
        const c = contract || readContract;
const result = await c.verifyCert(id);

        const hash = result[0];
        const cid = result[1];
        const valid = result[2];
        const issuer = result[3];
        const student = result[4];

        let metadata = null;

        if (cid) {
          try {
            const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
            metadata = await res.json();
          } catch {
            console.log("Lỗi load metadata", cid);
          }
        }
return {
  id,
  hash,
  valid,
  issuer,
  identity: student, // 
  metadata
};
      })
    );

    setIssuerCerts(fullData);
  } catch (err) {
    console.error(err);
  }
}
async function loadStudentCerts() {
  try {
if (!cccd) return alert("Nhập CCCD");
if (!isValidCCCD(cccd)) {
    setLoading(false);
  return alert("❌ CCCD không hợp lệ");
}
const identity = hashCCCD(cccd);
const c = contract || readContract;
const ids = await c.getCertsByIdentity(identity);
    const fullData = await Promise.all(
      ids.map(async (id) => {
        const c = contract || readContract;
const result = await c.verifyCert(id);

        const cid = result[1];
        const valid = result[2];

        let metadata = null;

        if (cid) {
          const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
          metadata = await res.json();
        }

        return { id, valid, metadata };
      })
    );

    setStudentCerts(fullData);
  } catch (err) {
    console.error(err);
  }
}

      {/* SIDEBAR */}
      return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex">
      <div className="w-72 bg-white/80 backdrop-blur-lg shadow-2xl border-r border-gray-200 p-6">

  <div className="mb-8">
    <h1 className="text-2xl font-bold text-indigo-700 leading-tight">
      🎓 Academic Credential
    </h1>

    <p className="text-sm text-gray-500 mt-1">
      Verification System
    </p>

    <div className="mt-3 h-1 w-16 bg-indigo-500 rounded-full"></div>
  </div>

        <select
          className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="viewer">🔍 Verifier</option>
          <option value="issuer">🏫 Issuer</option>
          <option value="admin">👑 Admin</option>
          <option value="student">👨‍🎓 Student</option>
        </select>

        <button
  onClick={connectWallet}
  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full p-3 rounded-xl shadow-md transition duration-300 transform hover:scale-105"
>
  Connect Wallet
</button>

        <p className="text-xs mt-2 break-all">{account}</p>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-8">



  <div className="mb-8">
    <h2 className="text-3xl font-bold text-gray-800">
      Dashboard
    </h2>

    <p className="text-gray-500 mt-1">
      Secure academic certificate verification powered by Blockchain
    </p>
  </div>

  {/* VERIFY */}
  {role === "viewer" && (
    
    <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20">
    {verifyMode !== "qr" && (
  <input
    placeholder="Nhập CCCD"
    className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
    onChange={(e) => setCccd(e.target.value)}
  />
)}
      <div className="mb-2">

  <button
    onClick={() => setVerifyMode("id")}
    className="mr-2 bg-gray-200 px-2"
  >
    Theo CertID
  </button>

  <button
    onClick={() => setVerifyMode("file")}
    className="mr-2 bg-gray-200 px-2"
  >
    Theo File
  </button>

 

</div>
    {verifyMode === "id" && (
  <input
  placeholder="Cert ID"
  className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
  value={verifyInputId}
  onChange={(e) => setVerifyInputId(e.target.value)}
/>
)}

{verifyMode === "file" && (
  <input
    type="file"
    className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
    onChange={handleVerifyFile}
  />
)}

      <button
  onClick={() => verifyCert()}
className="bg-emerald-600 hover:bg-emerald-700 text-white w-full p-3 rounded-xl shadow-md transition duration-300 transform hover:scale-105">
  Verify
</button>
<h3 className={`mt-3 font-bold text-lg ${
  verifyResult.includes("✅") ? "text-green-600" : "text-red-600"
}`}>
  {verifyResult}
</h3>

      {metaDataView?.file && (
  <div className="mt-4 bg-white p-4 rounded shadow">

    <h2 className="font-bold text-lg mb-3">
      📄 Văn bằng gốc
    </h2>

    <iframe
      src={`https://gateway.pinata.cloud/ipfs/${metaDataView.file}`}
      width="100%"
      height="700px"
      title="Certificate PDF"
      className="border rounded"
    />

    <a
      href={`https://gateway.pinata.cloud/ipfs/${metaDataView.file}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-blue-500 text-white p-2 mt-4 text-center rounded"
    >
      📥 Tải file PDF gốc
    </a>

  </div>
)}

     
    </div>
  )}

  {/* ISSUER */}
 {/* ISSUER */}
{role === "issuer" && (
  <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20">
<div className="mb-4">
  <button
    onClick={() => setIssueMode("upload")}
    className={`px-3 py-1 mr-2 ${issueMode === "upload" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
  >
    Upload PDF
  </button>

  <button
    onClick={() => setIssueMode("form")}
    className={`px-3 py-1 ${issueMode === "form" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
  >
    Nhập tay
  </button>
</div>
   
{/* 🔹 MODE FORM */}
{issueMode === "form" && (
  <>
  <input
  placeholder="CCCD sinh viên"
  className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
  onChange={(e) => setCccd(e.target.value)}
/>
  <input
  placeholder="Ghi chú (optional)"
  className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
  onChange={(e) => setNote(e.target.value)}
/>
    <input
      placeholder="Tên"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      onChange={(e) => setName(e.target.value)}
    />

    <input
      placeholder="Cơ sở đào tạo"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      onChange={(e) => setSchool(e.target.value)}
    />

    <input
      placeholder="Ngành"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      onChange={(e) => setMajor(e.target.value)}
    />

    <input
      placeholder="Xếp loại"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      onChange={(e) => setGrade(e.target.value)}
    />

    <input
      placeholder="Ngày cấp"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      onChange={(e) => setDate(e.target.value)}
    />
<input
  placeholder="Ngày hết hạn (dd/mm/yyyy)"
  className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
  onChange={(e) => setExpiryDate(e.target.value)}
/>
  </>
)}

{/* 🔹 MODE UPLOAD */}
{/* 🔹 MODE UPLOAD */}
{issueMode === "upload" && (
  <>
    <input
      placeholder="Tên sinh viên"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      value={name}
      onChange={(e) => setName(e.target.value)}
    />

    <input
      placeholder="CCCD sinh viên"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      value={cccd}
      onChange={(e) => setCccd(e.target.value)}
    />

    <input
      type="file"
      className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
      onChange={(e) => {
        setSelectedFile(e.target.files[0]);
        handleFileUpload(e);
      }}
    />

    {/*  PREVIEW FILE */}
    {selectedFile && (
      <p className="text-sm text-green-600">
        ✅ Đã chọn: {selectedFile.name}
      </p>
    )}

    {/*  UPLOADING STATUS */}
    {uploading && (
      <p className="text-blue-500 text-sm">
        📤 Đang upload lên IPFS...
      </p>
    )}
  </>
)}
<button
  onClick={issueCert}
  disabled={
    loading ||
    !cccd ||
    !name ||
    (issueMode === "upload" && !selectedFile)
  }
  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full p-2 mt-2 disabled:bg-gray-400"
>
  {loading ? (
  <div className="flex items-center justify-center gap-2">
    <div className="bg-indigo-600 hover:bg-indigo-700 text-white w-full p-3 rounded-xl shadow-md transition duration-300 transform hover:scale-105"></div>
    Đang xử lý...
  </div>
) : (
  "Cấp văn bằng"
)}
</button>
{latestCert && (
  <div className="mt-4">
    <h3 className="font-bold">📄 Bằng vừa cấp</h3>

    <p className="text-sm text-gray-500">CertID: {certId}</p>

    <a
      href={`https://gateway.pinata.cloud/ipfs/${latestCert}`}
      download="certificate.pdf"
      className="block bg-green-500 text-white p-2 mt-2 text-center"
    >
      ⬇️ Download PDF (Chuẩn)
    </a>
  </div>
)}
   <button
  onClick={() => {
    loadIssuerCerts();
    setShowIssuerList(true); // 🔥 chỉ khi bấm mới hiện
  }}
  className="bg-gray-700 text-white w-full p-2 mt-2"
>
  Xem danh sách học viên
</button>
<input
  placeholder="🔍 Tìm theo tên hoặc CCCD..."
  className="border p-2 w-full mt-3"
  onChange={(e) => setSearchName(e.target.value)}
/>
   {showIssuerList && (
  <>
    {issuerCerts.length === 0 && (
      <p className="mt-2 text-gray-500">Chưa có dữ liệu</p>
    )}

    {/* ✅ LIST CHUẨN */}
    {issuerCerts
  .filter(cert => {
  const keyword = searchName.toLowerCase();

  const nameMatch =
    cert.metadata?.name?.toLowerCase().includes(keyword);

  const cccdMatch =
    cert.metadata?.cccd?.includes(keyword);

  return nameMatch || cccdMatch;
})
  .map((cert, i) => (
      <div
  key={i}
  className="bg-white rounded-2xl shadow-md border p-5 mt-4 hover:shadow-xl transition"
>

        <p><b>ID:</b> {cert.id}</p>
        <p>Trạng thái: {cert.valid ? "✅ Valid" : "❌ Revoked"}</p>

        <p>Identity: {cert.identity}</p>

        {cert.metadata && (
          <>
            <p>Tên: {cert.metadata.name}</p>
            <p>Cơ sở đào tạo: {cert.metadata.school}</p>
            <p>Ngành: {cert.metadata.major}</p>
            <p>Xếp loại: {cert.metadata.grade}</p>
            <p>Ngày cấp: {cert.metadata.date}</p>
          </>
        )}

        <button
          onClick={() => revokeCert(cert.id)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 mt-2"
        >
          Revoke
        </button>

        {cert.metadata?.file && (
          <>
            

            <a
              href={`https://gateway.pinata.cloud/ipfs/${cert.metadata.file}`}
              download
              className="bg-green-500 text-white px-3 py-1 mt-2 inline-block"
            >
              ⬇️ Download PDF
            </a>
          </>
        )}
      </div>
    ))}
  </>
)}

  </div>
)}

  {/* STUDENT */}
  {role === "student" && (
    <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20">
      <input
  placeholder="Nhập CCCD"
  className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
  onChange={(e) => setCccd(e.target.value)}
/>


      <button
        onClick={loadStudentCerts}
        className="bg-blue-500 text-white w-full p-2"
      >
        Xem bằng của tôi
      </button>

      {studentCerts.length === 0 && (
        <p className="mt-2 text-gray-500">Chưa có bằng</p>
      )}

      {studentCerts.map((cert, i) => (
  <div
  key={i}
  className="bg-white rounded-2xl shadow-md border p-5 mt-4 hover:shadow-xl transition"
>

    <p><b>ID:</b> {cert.id}</p>
    <p>Trạng thái: {cert.valid ? "✅ Valid" : "❌ Revoked"}</p>

    {cert.metadata && (
      <>
        <p>Tên: {cert.metadata.name}</p>
        <p>Trường: {cert.metadata.school}</p>
        <p>Ngành: {cert.metadata.major}</p>
      </>
    )}

   {cert.metadata?.file && (
  <>
    <a
      href={`https://gateway.pinata.cloud/ipfs/${cert.metadata.file}`}
      download="certificate.pdf"
      className="bg-green-500 text-white px-3 py-2 mt-2 inline-block"
    >
      ⬇️ Download PDF (Chuẩn)
    </a>
  </>
)}
  </div>
))}
    </div>
  )}

    {/* ADMIN */}
  {role === "admin" && (
    <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20">
      <input
        placeholder="Issuer Address"
        className="w-full border border-gray-300 rounded-xl p-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
        onChange={(e) => setIssuerAddress(e.target.value)}
      />

   <button
  onClick={addIssuer}
  className="bg-yellow-500 text-white w-full p-2"
>
  Cấp quyền Issuer
</button>
    </div>
  )}

     </div>

{/* FOOTER */}
<div className="bg-white/70 backdrop-blur-lg border-t mt-10 py-6 text-center text-gray-600 text-sm">

  <p className="font-semibold">
    © 2026 Academic Credential Verification System
  </p>

  <p className="mt-1 text-gray-500">
    Secured by Blockchain • IPFS • Smart Contract Technology
  </p>

</div>

</div>

);  
  
}

export default App;