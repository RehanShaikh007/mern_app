import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import Return from "../models/returnSchema.js";
import Order from "../models/orderSchema.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";


export const createReturn = async (req, res) => {
  try {
    const { order, product, color, quantityInMeters, returnReason } = req.body;

    if (!order || !product || !color || !quantityInMeters || !returnReason) {
      return res.status(401).json({
        success: false,
        message: "Missing Required Field!",
      });
    }

    // Get order details to extract customer name
    const orderDetails = await Order.findById(order);
    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Generate Return ID
    const returnsCount = await Return.countDocuments();
    const returnId = `RET-${String(returnsCount + 1).padStart(3, "0")}`;

    const newReturn = await Return.create({
      id: returnId,
      order,
      orderId: order,
      customer: orderDetails.customer,
      product,
      color,
      quantityInMeters,
      returnReason,
    });

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
      const messageText = `📦 New Return Request!\n\n🆔 Return ID: *${returnId}*\n👤 Customer: ${orderDetails.customer}\n🛍 Product: ${product}\n🎨 Color: ${color}\n📏 Qty (m): ${quantityInMeters}\n💬 Reason: ${returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (createReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Return request created successfully!",
      return: newReturn,
    });
  } catch (error) {
    console.error("Error while creating return request", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getAllReturns = async (req, res) => {
  try {
    const returns = await Return.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      returns,
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getReturnById = async (req, res) => {
  try {
    const ret = await Return.findById(req.params.id);
    if (!ret) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }
    res.status(200).json({
      success: true,
      return: ret,
    });
  } catch (error) {
    console.error("Error fetching return by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const updateReturn = async (req, res) => {
  try {
    const { isApprove, isRejected, ...otherUpdates } = req.body;
    
    // Get the current return to check if status is changing
    const currentReturn = await Return.findById(req.params.id);
    if (!currentReturn) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

        // If return is being approved, just update the status (no stock or credit changes)
    if (isApprove && !currentReturn.isApprove) {
      console.log(`Return ${currentReturn.id} approved - status updated only`);
    }

    // Update the return
    const updatedReturn = await Return.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
             let messageText = "";
       if (isApprove && !currentReturn.isApprove) {
         messageText = `✅ Return Approved!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
       } else if (isRejected && !currentReturn.isRejected) {
        messageText = `❌ Return Rejected!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      } else {
        messageText = `✏️ Return Updated!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      }
      
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (updateReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: isApprove ? "Return approved successfully" : "Return updated successfully",
      return: updatedReturn,
    });
  } catch (error) {
    console.error("Error updating return:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const deleteReturn = async (req, res) => {
  try {
    const deletedReturn = await Return.findByIdAndDelete(req.params.id);
    if (!deletedReturn) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
      const messageText = `🗑 Return Deleted!\n\n🆔 Return ID: *${deletedReturn.id}*\n👤 Customer: ${deletedReturn.customer}\n🛍 Product: ${deletedReturn.product}\n🎨 Color: ${deletedReturn.color}\n📏 Qty (m): ${deletedReturn.quantityInMeters}\n💬 Reason: ${deletedReturn.returnReason}`;
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (deleteReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: "Return deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting return:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};
