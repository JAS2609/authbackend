import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
const app=express();
app.set("trust proxy", 1);
app.use(
    cors({
        origin: [
      "http://localhost:3000",
    ],
        credentials:true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))
app.use(cookieParser())
import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users",userRouter)


export {app}