import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import Stock from "../models/stockScehma.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import Order from "../models/orderSchema.js";

export const createStock = async (req, res) => {
  try {
    const { stockType, status, variants, stockDetails, addtionalInfo } = req.body;

    if (!stockType || !variants || variants.length === 0 || !stockDetails || stockDetails.length === 0 || !addtionalInfo || addtionalInfo.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required stock fields.",
      });
    }

    const newStock = await Stock.create({
      stockType,
      status: status || "available",
      variants,
      stockDetails,
      addtionalInfo,
    });

    const notificationSettings = await WhatsappNotification.findOne();

    let stockUpdatesEnabled = false;
    if (notificationSettings) {
      stockUpdatesEnabled = notificationSettings.stockAlerts;
    }
    /** 📲 WhatsApp Notification **/
    if (stockUpdatesEnabled) {
      const messageText = `📦 New Stock Added!\n\n🏷 Stock Type: ${newStock.stockType}\n📋 Status: ${newStock.status}\n🎨 Variants: ${newStock.variants
        .map(v => `${v.color} (${v.quantity} ${v.unit})`)
        .join(", ")}\n\nView details: ${process.env.CLIENT_URL}/stock/${newStock._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (createStock):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock added successfully!",
      stock: newStock,
    });
  } catch (error) {
    console.error("Stock Creation Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getAllStocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const stockType = req.query.stockType; // Optional filter by stock type
    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {};
    if (stockType && stockType !== 'all') {
      filter.stockType = stockType;
    }

    const [stocks, total] = await Promise.all([
      Stock.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Stock.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      success: true,
      stocks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }
    res.status(200).json({
      success: true,
      stock,
    });
  } catch (error) {
    console.error("Error fetching stock by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const updateStock = async (req, res) => {
  try {
    const updatedStock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const notificationSettings = await WhatsappNotification.findOne();

    let stockUpdatesEnabled = false;
    if (notificationSettings) {
      stockUpdatesEnabled = notificationSettings.stockAlerts;
    }
    /** 📲 WhatsApp Notification **/
    if (stockUpdatesEnabled) {
      const messageText = `✏️ Stock Updated!\n\n🏷 Stock Type: ${updatedStock.stockType}\n📋 Status: ${updatedStock.status}\n🎨 Variants: ${updatedStock.variants
        .map(v => `${v.color} (${v.quantity} ${v.unit})`)
        .join(", ")}\n\nView details: ${process.env.CLIENT_URL}/stock/${updatedStock._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (updateStock):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      stock: updatedStock,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const deleteStock = async (req, res) => {
  try {
    const deletedStock = await Stock.findByIdAndDelete(req.params.id);
    if (!deletedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const notificationSettings = await WhatsappNotification.findOne();

    let stockUpdatesEnabled = false;
    if (notificationSettings) {
      stockUpdatesEnabled = notificationSettings.stockAlerts;
    }
    /** 📲 WhatsApp Notification **/
    if (stockUpdatesEnabled) {
      const messageText = `🗑 Stock Deleted!\n\n🏷 Stock Type: ${deletedStock.stockType}\n📋 Status: ${deletedStock.status}\n🎨 Variants: ${deletedStock.variants
        .map(v => `${v.color} (${v.quantity} ${v.unit})`)
        .join(", ")}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (deleteStock):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting stock:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

// Utility: Calculate total stock value (dummy formula)
const calculateStockValue = (stocks) => {
  // Assuming each variant quantity represents "value" in Rs 100 per unit
  return stocks.reduce((total, stock) => {
    const variantsValue = stock.variants.reduce((sum, v) => {
      return sum + (v.quantity * 100); // You can replace 100 with actual price per unit
    }, 0);
    return total + variantsValue;
  }, 0);
};

// Calculate stock turnover

const calculateStockTurnover = async (startDate, endDate) => {
  // 1. Fetch orders in the given period
  const orders = await Order.find({
    orderDate: { $gte: startDate, $lte: endDate }
  });

  // 2. Calculate total sales value (COGS approximation)
  const totalSalesValue = orders.reduce((sum, order) => {
    const orderValue = order.orderItems.reduce((itemSum, item) => {
      return itemSum + (item.quantity * item.pricePerMeters);
    }, 0);
    return sum + orderValue;
  }, 0);

  // 3. Calculate current stock value
  const allStocks = await Stock.find();
  const totalStockValue = calculateStockValue(allStocks); // your existing function

  // 4. Approximate average stock value (current only for now)
  const averageStockValue = totalStockValue || 1; // avoid division by zero

  // 5. Turnover formula
  return (totalSalesValue / averageStockValue).toFixed(2);
};


export const getStockSummary = async (req, res) => {
  try {
    const allStocks = await Stock.find();
    const totalStockValue = calculateStockValue(allStocks);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const today = new Date();

    const stockTurnover = await calculateStockTurnover(startOfMonth, today);

    const lowStockItems = allStocks.filter((stock) =>
      stock.variants.some((v) => v.quantity < 10 && v.quantity > 0)
    ).length;

    const outOfStockItems = allStocks.filter((stock) =>
      stock.variants.every((v) => v.quantity === 0)
    ).length;

    res.json({
      totalStockValue,
      stockTurnover,
      lowStockItems,
      outOfStockItems,
    });
  } catch (error) {
    console.error("Error fetching stock summary:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getStockCategoryBreakdown = async (req, res) => {
  try {
    const breakdown = await Stock.aggregate([
      { $unwind: "$variants" },
      {
        $group: {
          _id: "$stockType",
          totalQuantity: { $sum: "$variants.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    const colors = {
      "Gray Stock": "#8884d8",
      "Factory Stock": "#82ca9d",
      "Design Stock": "#ffc658"
    };

    const formatted = breakdown.map(item => ({
      name: item._id,
      value: item.totalQuantity,
      fill: colors[item._id] || "#8884d8"
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Stock category breakdown error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getStockMovement = async (req, res) => {
  try {
    // Inbound: from stock creation
    const inboundAgg = await Stock.aggregate([
      { $unwind: "$variants" },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          inbound: { $sum: "$variants.quantity" }
        }
      }
    ]);

    // Outbound: from orders
    const outboundAgg = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: { month: { $month: "$orderDate" } },
          outbound: { $sum: "$orderItems.quantity" }
        }
      }
    ]);

    // Merge results into all months
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const result = months.map((name, idx) => {
      const inbound = inboundAgg.find(m => m._id.month === idx + 1)?.inbound || 0;
      const outbound = outboundAgg.find(m => m._id.month === idx + 1)?.outbound || 0;
      return {
        month: name,
        inbound,
        outbound,
        net: inbound - outbound
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Stock movement error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
