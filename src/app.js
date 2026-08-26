import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import indexRoutes from "./routes/index.js";
import MobileRoutes from "./routes/mobile/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = ["http://localhost:5173", "http://103.164.67.226:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", indexRoutes);
app.use("/api/mobile", MobileRoutes);

app.use(errorHandler);

export default app;
