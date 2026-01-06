import express from "express";
import cors from "cors";
import { db } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Database connected successfully" });
  });
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
