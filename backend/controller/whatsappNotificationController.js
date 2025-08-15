import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";

/**
 * Get notification settings
 */
export const getNotificationSettings = async (req, res) => {
  try {
    let settings = await WhatsappNotification.findOne();

    // If no document exists, create one with default values
    if (!settings) {
      settings = await WhatsappNotification.create({});
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (req, res) => {
  try {
    const { 
      orderUpdates, 
      stockAlerts, 
      lowStockWarnings, 
      newCustomers, 
      dailyReports, 
      returnRequests,
      productUpdates
    } = req.body;

    let settings = await WhatsappNotification.findOne();

    if (!settings) {
      settings = await WhatsappNotification.create({});
    }

    settings.orderUpdates = orderUpdates ?? settings.orderUpdates;
    settings.stockAlerts = stockAlerts ?? settings.stockAlerts;
    settings.lowStockWarnings = lowStockWarnings ?? settings.lowStockWarnings;
    settings.newCustomers = newCustomers ?? settings.newCustomers;
    settings.dailyReports = dailyReports ?? settings.dailyReports;
    settings.returnRequests = returnRequests ?? settings.returnRequests;
    settings.productUpdates = productUpdates ?? settings.productUpdates;

    await settings.save();

    res.json({ message: "Notification settings updated", settings });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Server error" });
  }
};
