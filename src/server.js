import "./config/env.js" 
import connectDB from './config/db.js';
import app from './app.js';
import { initMailer } from "./utils/email.js";



const PORT = process.env.PORT || 5000;

connectDB();
initMailer(); 

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});