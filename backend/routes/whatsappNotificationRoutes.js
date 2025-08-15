import express from "express";
import { 
  getNotificationSettings, 
  updateNotificationSettings 
} from "../controller/whatsappNotificationController.js";

const router = express.Router();

// Get settings
router.get("/", getNotificationSettings);

// Update settings
router.put("/", updateNotificationSettings);

export default router;
