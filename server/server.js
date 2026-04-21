const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors");

const app = express();
const upload = multer();

app.use(cors());

// 🔐 API KEY để ở server (AN TOÀN)
const PINATA_API_KEY = "1de4fd13252942b4cadc";
const PINATA_SECRET_KEY =
  "0ab2f90205f2c951eedbc44b23d28ba78623ffbe9b2e916cfd1eceeffd8e7674";

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const data = new FormData();
    data.append("file", req.file.buffer, req.file.originalname);

    const result = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      data,
      {
        headers: {
          ...data.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    res.json({ cid: result.data.IpfsHash });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

app.listen(5000, () => {
  console.log("🚀 Server chạy tại http://localhost:5000");
});