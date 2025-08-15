import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import Order from "../models/orderSchema.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import Stock from "../models/stockScehma.js";

export const createOrder = async (req, res) => {
  try {
    const { customer, status, orderDate, deliveryDate, orderItems, notes } =
      req.body;

    if (
      !customer ||
      !orderDate ||
      !deliveryDate ||
      !orderItems ||
      orderItems.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Missing Required Fields or No Order Items Provided!",
      });
    }

    // Validate credit limit
    const Customer = (await import("../models/customerSchema.js")).default;
    const customerDoc = await Customer.findOne({ customerName: customer });
    
    if (!customerDoc) {
      return res.status(400).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Calculate order total
    const orderTotal = orderItems.reduce((sum, item) => {
      return sum + (item.quantity * (item.pricePerMeters || 0));
    }, 0);

    // Get existing orders for this customer
    const existingOrders = await Order.find({ customer: customer });
    const existingOrderTotal = existingOrders.reduce((sum, order) => {
      const orderTotal = order.orderItems.reduce((itemSum, item) => {
        return itemSum + (item.quantity * (item.pricePerMeters || 0));
      }, 0);
      return sum + orderTotal;
    }, 0);

    const totalWithNewOrder = existingOrderTotal + orderTotal;
    
    if (totalWithNewOrder > customerDoc.creditLimit) {
      return res.status(400).json({
        success: false,
        message: `Order would exceed credit limit. Available credit: ₹${(customerDoc.creditLimit - existingOrderTotal).toLocaleString()}, Order total: ₹${orderTotal.toLocaleString()}`,
      });
    }

    // Only validate and deduct stock if order status is "confirmed"
    if (status === "confirmed") {
      // Validate stock and prepare deductions
      const stockMap = new Map(); // stockId -> Stock doc

      for (const item of orderItems) {
        const { stockId, color, quantity, product } = item;
        if (!color || typeof quantity !== "number") {
          return res.status(400).json({
            success: false,
            message: "Each order item must include color and numeric quantity",
          });
        }

        let stockDoc = stockMap.get(stockId);
        if (!stockDoc) {
          // Try to find stock by stockId first, then by product name and color
          if (stockId) {
            stockDoc = await Stock.findById(stockId);
          }
          
          // If not found by stockId, try to find by product name and color
          if (!stockDoc && product) {
            stockDoc = await Stock.findOne({
              "stockDetails.product": product,
              "variants.color": color,
              status: { $in: ["available", "low"] }
            });
          }
          
          if (!stockDoc) {
            return res.status(400).json({ 
              success: false, 
              message: `Stock not found for ${product || 'product'} - ${color}. Please ensure the stock exists and is available.` 
            });
          }
          stockMap.set(stockId || stockDoc._id.toString(), stockDoc);
        }

        const variantIndex = stockDoc.variants.findIndex((v) => v.color === color);
        if (variantIndex < 0) {
          return res.status(400).json({ success: false, message: `Color ${color} not found in selected stock` });
        }

        const variant = stockDoc.variants[variantIndex];
        const available = Number(variant.quantity) || 0; // quantity stored in meters
        const needed = Number(quantity) || 0; // quantity is meters in payload
        if (needed > available) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${color}. Available: ${available} m, Requested: ${needed} m`,
          });
        }

        // Deduct in-memory; save later
        stockDoc.variants[variantIndex].quantity = available - needed;
      }

      // Persist deductions and update statuses
      for (const stockDoc of stockMap.values()) {
        const totalQty = stockDoc.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
        if (totalQty === 0) {
          stockDoc.status = "out";
        } else if (totalQty < 100 && stockDoc.status !== "processing") {
          stockDoc.status = "low";
        } else if (stockDoc.status !== "processing") {
          stockDoc.status = "available";
        }
        await stockDoc.save();
      }
    }

    const newOrder = await Order.create({
      customer,
      status: status || "pending",
      orderDate,
      deliveryDate,
      orderItems,
      notes,
    });

    const notificationSettings = await WhatsappNotification.findOne();

    let orderUpdatesEnabled = false;
    if (notificationSettings) {
      orderUpdatesEnabled = notificationSettings.orderUpdates;
    }
    if (orderUpdatesEnabled) {
      /** 📲 WhatsApp Notification **/
      const messageText = `🆕 New Order Created!\n\n🆔 Order ID: *${newOrder._id}*\n👤 Customer: ${customer}\n📅 Order Date: ${orderDate}\n🚚 Delivery Date: ${deliveryDate}\n📦 Items: ${orderItems
        .map((item) => `${item.product} (${item.quantity})`)
        .join(", ")}\n\nView details: ${process.env.CLIENT_URL}/orders/${newOrder._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (createOrder):",
          whatsAppError
        );
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "order_update",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(201).json({
      success: true,
      message: "Order Created Successfully!",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error creating Order", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const customer = req.query.customer;

    // Build query filter
    const queryFilter = {};
    if (customer) {
      queryFilter.customer = customer;
    }

    const [orders, total] = await Promise.all([
      Order.find(queryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(queryFilter)
    ]);

    // Get unique customer names from orders
    const customerNames = [...new Set(orders.map(order => order.customer))];
    
    // Fetch customer data for all unique customers
    const Customer = (await import("../models/customerSchema.js")).default;
    const customers = await Customer.find({ customerName: { $in: customerNames } });
    
    // Create a map for quick lookup
    const customerMap = {};
    customers.forEach(customer => {
      customerMap[customer.customerName] = customer;
    });

    // Add customer information to orders
    const ordersWithCustomerInfo = orders.map(order => {
      const customerInfo = customerMap[order.customer];
      return {
        ...order.toObject(),
        customerInfo: customerInfo ? {
          city: customerInfo.city,
          customerType: customerInfo.customerType,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address
        } : null
      };
    });

    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      success: true,
      orders: ordersWithCustomerInfo,
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
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { status, ...otherUpdates } = req.body;
    
    // Get the current order to check if status is changing
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // If status is changing from "pending" to "confirmed", deduct stock
    if (currentOrder.status === "pending" && status === "confirmed") {
      // Validate stock and prepare deductions
      const stockMap = new Map(); // stockId -> Stock doc

      for (const item of currentOrder.orderItems) {
        const { stockId, color, quantity, product } = item;
        if (!color || typeof quantity !== "number") {
          return res.status(400).json({
            success: false,
            message: "Each order item must include color and numeric quantity",
          });
        }

        let stockDoc = stockMap.get(stockId);
        if (!stockDoc) {
          // Try to find stock by stockId first, then by product name and color
          if (stockId) {
            stockDoc = await Stock.findById(stockId);
          }
          
          // If not found by stockId, try to find by product name and color
          if (!stockDoc && product) {
            stockDoc = await Stock.findOne({
              "stockDetails.product": product,
              "variants.color": color,
              status: { $in: ["available", "low"] }
            });
          }
          
          if (!stockDoc) {
            return res.status(400).json({ 
              success: false, 
              message: `Stock not found for ${product || 'product'} - ${color}. Please ensure the stock exists and is available.` 
            });
          }
          stockMap.set(stockId || stockDoc._id.toString(), stockDoc);
        }

        const variantIndex = stockDoc.variants.findIndex((v) => v.color === color);
        if (variantIndex < 0) {
          return res.status(400).json({ success: false, message: `Color ${color} not found in selected stock` });
        }

        const variant = stockDoc.variants[variantIndex];
        const available = Number(variant.quantity) || 0; // quantity stored in meters
        const needed = Number(quantity) || 0; // quantity is meters in payload
        if (needed > available) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${color}. Available: ${available} m, Requested: ${needed} m`,
          });
        }

        // Deduct in-memory; save later
        stockDoc.variants[variantIndex].quantity = available - needed;
      }

      // Persist deductions and update statuses
      for (const stockDoc of stockMap.values()) {
        const totalQty = stockDoc.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
        if (totalQty === 0) {
          stockDoc.status = "out";
        } else if (totalQty < 100 && stockDoc.status !== "processing") {
          stockDoc.status = "low";
        } else if (stockDoc.status !== "processing") {
          stockDoc.status = "available";
        }
        await stockDoc.save();
      }
    }
    
    // If status is changing from "confirmed" to "pending", restore stock
    if (currentOrder.status === "confirmed" && status === "pending") {
      // Restore stock quantities
      const stockMap = new Map(); // stockId -> Stock doc

      for (const item of currentOrder.orderItems) {
        const { stockId, color, quantity, product } = item;
        if (!color || typeof quantity !== "number") {
          continue; // Skip invalid items
        }

        let stockDoc = stockMap.get(stockId);
        if (!stockDoc) {
          // Try to find stock by stockId first, then by product name and color
          if (stockId) {
            stockDoc = await Stock.findById(stockId);
          }
          
          // If not found by stockId, try to find by product name and color
          if (!stockDoc && product) {
            stockDoc = await Stock.findOne({
              "stockDetails.product": product,
              "variants.color": color
            });
          }
          
          if (!stockDoc) {
            continue; // Skip if stock not found
          }
          stockMap.set(stockId || stockDoc._id.toString(), stockDoc);
        }

        const variantIndex = stockDoc.variants.findIndex((v) => v.color === color);
        if (variantIndex < 0) {
          continue; // Skip if color not found
        }

        const variant = stockDoc.variants[variantIndex];
        const current = Number(variant.quantity) || 0; // current quantity
        const toRestore = Number(quantity) || 0; // quantity to restore

        // Restore quantity
        stockDoc.variants[variantIndex].quantity = current + toRestore;
      }

      // Persist restorations and update statuses
      for (const stockDoc of stockMap.values()) {
        const totalQty = stockDoc.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
        if (totalQty === 0) {
          stockDoc.status = "out";
        } else if (totalQty < 100 && stockDoc.status !== "processing") {
          stockDoc.status = "low";
        } else if (stockDoc.status !== "processing") {
          stockDoc.status = "available";
        }
        await stockDoc.save();
      }
    }

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    const notificationSettings = await WhatsappNotification.findOne();

    let orderUpdatesEnabled = false;
    if (notificationSettings) {
      orderUpdatesEnabled = notificationSettings.orderUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (orderUpdatesEnabled) {
      const messageText = `✏️ Order Updated!\n\n🆔 Order ID: *${updatedOrder._id}*\n👤 Customer: ${updatedOrder.customer}\n📅 Order Date: ${updatedOrder.orderDate}\n🚚 Delivery Date: ${updatedOrder.deliveryDate}\n📦 Items: ${updatedOrder.orderItems
        .map((item) => `${item.product} (${item.quantity})`)
        .join(", ")}\n\nView details: ${process.env.CLIENT_URL}/orders/${updatedOrder._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (updateOrder):",
          whatsAppError
        );
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "order_update",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // If the deleted order was confirmed, restore stock quantities
    if (deletedOrder.status === "confirmed") {
      // Restore stock quantities
      const stockMap = new Map(); // stockId -> Stock doc

      for (const item of deletedOrder.orderItems) {
        const { stockId, color, quantity, product } = item;
        if (!color || typeof quantity !== "number") {
          continue; // Skip invalid items
        }

        let stockDoc = stockMap.get(stockId);
        if (!stockDoc) {
          // Try to find stock by stockId first, then by product name and color
          if (stockId) {
            stockDoc = await Stock.findById(stockId);
          }
          
          // If not found by stockId, try to find by product name and color
          if (!stockDoc && product) {
            stockDoc = await Stock.findOne({
              "stockDetails.product": product,
              "variants.color": color
            });
          }
          
          if (!stockDoc) {
            continue; // Skip if stock not found
          }
          stockMap.set(stockId || stockDoc._id.toString(), stockDoc);
        }

        const variantIndex = stockDoc.variants.findIndex((v) => v.color === color);
        if (variantIndex < 0) {
          continue; // Skip if color not found
        }

        const variant = stockDoc.variants[variantIndex];
        const current = Number(variant.quantity) || 0; // current quantity
        const toRestore = Number(quantity) || 0; // quantity to restore

        // Restore quantity
        stockDoc.variants[variantIndex].quantity = current + toRestore;
      }

      // Persist restorations and update statuses
      for (const stockDoc of stockMap.values()) {
        const totalQty = stockDoc.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
        if (totalQty === 0) {
          stockDoc.status = "out";
        } else if (totalQty < 100 && stockDoc.status !== "processing") {
          stockDoc.status = "low";
        } else if (stockDoc.status !== "processing") {
          stockDoc.status = "available";
        }
        await stockDoc.save();
      }
    }

    const notificationSettings = await WhatsappNotification.findOne();

    let orderUpdatesEnabled = false;
    if (notificationSettings) {
      orderUpdatesEnabled = notificationSettings.orderUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (orderUpdatesEnabled) {
      const messageText = `🗑 Order Deleted!\n\n🆔 Order ID: *${deletedOrder._id}*\n👤 Customer: ${deletedOrder.customer}\n📅 Order Date: ${deletedOrder.orderDate}\n🚚 Delivery Date: ${deletedOrder.deliveryDate}\n📦 Items: ${deletedOrder.orderItems
        .map((item) => `${item.product} (${item.quantity})`)
        .join(", ")}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (deleteOrder):",
          whatsAppError
        );
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "order_update",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

// Get total revenue from all orders
export const getTotalRevenue = async (req, res) => {
  try {
    const orders = await Order.find({ status: "confirmed" });

    // Calculate total revenue
    const totalRevenue = orders.reduce((orderSum, order) => {
      const orderTotal = order.orderItems.reduce((sum, item) => {
        return sum + (item.quantity * item.pricePerMeters);
      }, 0);
      return orderSum + orderTotal;
    }, 0);

    res.json({ totalRevenue });
  } catch (error) {
    console.error("Error calculating total revenue:", error);
    res.status(500).json({ error: "Failed to calculate total revenue" });
  }
};

// Get count of confirmed orders
export const getDeliveredOrdersCount = async (req, res) => {
  try {
    const count = await Order.countDocuments({ status: "confirmed" });
    res.json({ deliveredOrdersCount: count });
  } catch (error) {
    console.error("Error counting confirmed orders:", error);
    res.status(500).json({ error: "Failed to count confirmed orders" });
  }
};

export const getMonthlySales = async (req, res) => {
  try {
    const sales = await Order.aggregate([
      {
        $group: {
          _id: { month: { $month: "$orderDate" } },
          revenue: {
            $sum: {
              $sum: {
                $map: {
                  input: "$orderItems",
                  as: "item",
                  in: { $multiply: ["$$item.quantity", "$$item.pricePerMeters"] }
                }
              }
            }
          },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // Format month numbers to labels
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = sales.map(s => ({
      month: monthLabels[s._id.month - 1],
      revenue: s.revenue,
      orders: s.orders
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Monthly sales aggregation error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
