"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle, // ✅ added missing import
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";

interface SalesData {
  totalRevenue: number;
  ordersCompleted: number;
  averageOrderValue: number;
}

interface StockData {
  totalStockValue: number;
  stockTurnover: number;
  lowStockItems: number;
  outOfStockItems: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

interface TopCustomer {
  name: string;
  orders: number;
  revenue: number;
  city: string;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Initialize with safe default values to prevent undefined errors
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    ordersCompleted: 0,
    averageOrderValue: 0
  });

  const [stockData, setStockData] = useState<StockData>({
    totalStockValue: 0,
    stockTurnover: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);

  const [monthlyData, setMonthlyData] = useState([
    { month: "Jan", revenue: 0, orders: 0 },
    { month: "Feb", revenue: 0, orders: 0 },
    { month: "Mar", revenue: 0, orders: 0 },
    { month: "Apr", revenue: 0, orders: 0 },
    { month: "May", revenue: 0, orders: 0 },
    { month: "Jun", revenue: 0, orders: 0 },
    { month: "Jul", revenue: 0, orders: 0 },
    { month: "Aug", revenue: 0, orders: 0 },
    { month: "Sep", revenue: 0, orders: 0 },
    { month: "Oct", revenue: 0, orders: 0 },
    { month: "Nov", revenue: 0, orders: 0 },
    { month: "Dec", revenue: 0, orders: 0 },
  ]);

  const productPerformanceData = topProducts.map((product) => ({
    name: product.name.split(" ")[0],
    revenue: product.revenue / 1000,
    quantity: product.quantity
  }));

  const [stockCategoryData, setStockCategoryData] = useState([
    { name: "Gray Stock", value: 0, fill: "#ffffff" },
    { name: "Factory Stock", value: 0, fill: "#ffffff" },
    { name: "Design Stock", value: 0, fill: "#ffffff" },
  ]);

  const [stockMovementData, setStockMovementData] = useState([
    { month: "Jan", inbound: 0, outbound: 0, net: 0 },
    { month: "Feb", inbound: 0, outbound: 0, net: 0 },
    { month: "Mar", inbound: 0, outbound: 0, net: 0 },
    { month: "Apr", inbound: 0, outbound: 0, net: 0 },
    { month: "May", inbound: 0, outbound: 0, net: 0 },
    { month: "Jun", inbound: 0, outbound: 0, net: 0 },
    { month: "Jul", inbound: 0, outbound: 0, net: 0 },
    { month: "Aug", inbound: 0, outbound: 0, net: 0 },
    { month: "Sep", inbound: 0, outbound: 0, net: 0 },
    { month: "Oct", inbound: 0, outbound: 0, net: 0 },
    { month: "Nov", inbound: 0, outbound: 0, net: 0 },
    { month: "Dec", inbound: 0, outbound: 0, net: 0 },
  ]);

  // Filter data based on selected period
  const getFilteredMonthlyData = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    const currentDate = new Date();
    
    switch (selectedPeriod) {
      case "week":
      case "month":
        // Show only current month
        return monthlyData.filter((_, index) => index === currentMonth);
      case "quarter":
        // Show last 3 months including current
        const quarterStart = Math.max(0, currentMonth - 2);
        return monthlyData.filter((_, index) => index >= quarterStart && index <= currentMonth);
      case "year":
      default:
        // Show all months
        return monthlyData;
    }
  };

  const getFilteredStockMovementData = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    
    switch (selectedPeriod) {
      case "week":
      case "month":
        return stockMovementData.filter((_, index) => index === currentMonth);
      case "quarter":
        const quarterStart = Math.max(0, currentMonth - 2);
        return stockMovementData.filter((_, index) => index >= quarterStart && index <= currentMonth);
      case "year":
      default:
        return stockMovementData;
    }
  };

  const filteredMonthlyData = getFilteredMonthlyData();
  const filteredStockMovementData = getFilteredStockMovementData();

  const customerRevenueData = topCustomers.map((customer) => ({
    name: customer.name.split(" ")[0],
    revenue: customer.revenue / 1000,
    orders: customer.orders,
  }));

  // Excel Export Function
  const handleExportExcel = () => {
    try {
      // Create CSV content
      let csvContent = "\uFEFF"+"Reports Data Export\n\n";
      
      // Sales Data
      csvContent += "Sales Summary\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Revenue,₹${salesData.totalRevenue}\n`;
      csvContent += `Orders Completed,${salesData.ordersCompleted}\n`;
      csvContent += `Average Order Value,₹${salesData.averageOrderValue}\n\n`;

      // Monthly Data
      csvContent += "Monthly Performance\n";
      csvContent += "Month,Revenue,Orders\n";
      monthlyData.forEach(item => {
        csvContent += `${item.month},₹${item.revenue},${item.orders}\n`;
      });
      csvContent += "\n";

      // Top Products
      csvContent += "Top Products\n";
      csvContent += "Product Name,Revenue,Quantity\n";
      topProducts.forEach(product => {
        csvContent += `${product.name},₹${product.revenue},${product.quantity}\n`;
      });
      csvContent += "\n";

      // Top Customers
      csvContent += "Top Customers\n";
      csvContent += "Customer Name,City,Orders,Revenue\n";
      topCustomers.forEach(customer => {
        csvContent += `${customer.name},${customer.city},${customer.orders},₹${customer.revenue}\n`;
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `reports_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Excel report has been downloaded successfully",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: err instanceof Error ? err.message : 'Failed to export Excel file',
        variant: "destructive",
      });
    }
  };

  // PDF Export Function
  const handleExportPDF = () => {
    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Bills Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section h3 { border-bottom: 2px solid #333; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .metric-value { font-weight: bold; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Business Reports & Order Bills</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Period: ${selectedPeriod}</p>
          </div>
          
          <div class="section">
            <h3>Sales Summary</h3>
            <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Total Revenue</td><td class="metric-value">₹${salesData.totalRevenue.toLocaleString()}</td></tr>
              <tr><td>Orders Completed</td><td class="metric-value">${salesData.ordersCompleted}</td></tr>
              <tr><td>Average Order Value</td><td class="metric-value">₹${salesData.averageOrderValue.toLocaleString()}</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>Monthly Performance</h3>
            <table>
              <tr><th>Month</th><th>Revenue</th><th>Orders</th></tr>
              ${monthlyData.map(item => 
                `<tr><td>${item.month}</td><td>₹${item.revenue.toLocaleString()}</td><td>${item.orders}</td></tr>`
              ).join('')}
            </table>
          </div>

          <div class="section">
            <h3>Top Performing Products</h3>
            <table>
              <tr><th>Product Name</th><th>Revenue</th><th>Quantity</th></tr>
              ${topProducts.map(product => 
                `<tr><td>${product.name}</td><td>₹${product.revenue.toLocaleString()}</td><td>${product.quantity}</td><td></tr>`
              ).join('')}
            </table>
          </div>

          <div class="section">
            <h3>Top Customers</h3>
            <table>
              <tr><th>Customer Name</th><th>City</th><th>Orders</th><th>Revenue</th></tr>
              ${topCustomers.map(customer => 
                `<tr><td>${customer.name}</td><td>${customer.city}</td><td>${customer.orders}</td><td>₹${customer.revenue.toLocaleString()}</td></tr>`
              ).join('')}
            </table>
          </div>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `order_bills_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "PDF Export Successful",
        description: "Order bills report has been downloaded successfully",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "PDF Export Failed",
        description: err instanceof Error ? err.message : 'Failed to export PDF file',
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError(null);

        const countRes = await fetch(
          `${API_BASE_URL}/order/count/delivered`
        );
        const countData = await countRes.json();

        const revenueRes = await fetch(
          `${API_BASE_URL}/order/total/revenue`
        );
        const revenueData = await revenueRes.json();

        const stockRes = await fetch(
          `${API_BASE_URL}/stock/get/summary`
        );
        const stockDataJson = await stockRes.json();
        console.log("Stock Summary Response:", stockDataJson);

        setStockData({
          totalStockValue: stockDataJson.totalStockValue ?? 0,
          stockTurnover: stockDataJson.stockTurnover ?? 0,
          lowStockItems: stockDataJson.lowStockItems ?? 0,
          outOfStockItems: stockDataJson.outOfStockItems ?? 0,
        });

        const customerRes = await fetch(
          `${API_BASE_URL}/customer/top/Customers`
        );
        const customerData = await customerRes.json();
        setTopCustomers(
          customerData.map((customer: any) => ({
            name: customer.name,
            orders: customer.orders,
            revenue: customer.revenue,
            city: customer.city,
          }))
        );

        const productRes = await fetch(
          `${API_BASE_URL}/products/top/Products`
        );
        const productData = await productRes.json();
        setTopProducts(
          productData.map((product: any) => ({
            name: product.name,
            quantity: product.quantity,
            revenue: product.revenue
          }))
        );

        const ordersCompleted = countData?.deliveredOrdersCount ?? 0;
        const totalRevenue = revenueData?.totalRevenue ?? 0;
        const averageOrderValue =
          ordersCompleted > 0 ? totalRevenue / ordersCompleted : 0;

        setSalesData({
          totalRevenue,
          ordersCompleted,
          averageOrderValue
        });
      } catch (err) {
        console.error("Error fetching sales data:", err);
        setError("Failed to fetch sales data");
      } finally {
        setLoading(false);
      }
    };

    const fetchMonthlyData = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/order/monthly/sales`
        );
        if (!res.ok) throw new Error("Failed to fetch monthly sales");

        const data = await res.json();

        // Merge API data into default monthlyData
        setMonthlyData((prev) =>
          prev.map((monthObj) => {
            const match = data.find(
              (apiMonth: any) => apiMonth.month === monthObj.month
            );
            return match ? match : monthObj;
          })
        );
      } catch (err) {
        console.error("Error fetching monthly data:", err);
      }
    };

    const fetchStockCategoryData = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/stock/get/category-breakdown`
        );
        if (!res.ok) throw new Error("Failed to fetch stock category data");

        const data = await res.json();
        // console.log("Stock Category Data Response:", data);
        // return
        setStockCategoryData([
          { name: "Gray Stock", value: data[0].value, fill: data[0].fill },
          { name: "Factory Stock", value: data[1].value, fill: data[1].fill },
          { name: "Design Stock", value: data[2].value, fill: data[2].fill },
        ]);
      } catch (err) {
        console.error("Error fetching stock category data:", err);
        toast({
          title: "Error",
          description: "Failed to load stock category data",
          variant: "destructive",
        });
      }
    };

    const fetchStockMovement = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/stock/get/movement-report`
        );
        if (!res.ok) throw new Error("Failed to fetch stock movement report");

        const data = await res.json();

        // Merge API data into default monthly list
        setStockMovementData((prev) =>
          prev.map((monthObj) => {
            const match = data.find(
              (apiMonth) => apiMonth.month === monthObj.month
            );
            return match ? match : monthObj;
          })
        );
      } catch (err) {
        console.error("Error fetching stock movement data:", err);
      }
    };

    fetchStockMovement();
    fetchStockCategoryData();
    fetchMonthlyData();
    fetchSalesData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span className="ml-3 text-muted-foreground">Loading reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Customers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load customers
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            <p className="text-muted-foreground">
              Business insights and data export
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
            >
              Export Order Bills (PDF)
            </Button>
          </div>
        </div>

        {/* Main Reports Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{salesData?.totalRevenue?.toLocaleString() ?? "0"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Orders Completed
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {salesData.ordersCompleted}
                  </div>
                  <p className="text-xs text-muted-foreground">This period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Order Value
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{salesData?.averageOrderValue?.toLocaleString() ?? "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Per order</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Stock Turnover
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stockData.stockTurnover}x
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inventory turns for start of the month till today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly revenue performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={filteredMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={(value) =>
                          `₹${(value / 1000).toFixed(0)}K`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [
                          `₹${Number(value).toLocaleString()}`,
                          "Revenue",
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Volume</CardTitle>
                  <CardDescription>Monthly order count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [value, "Orders"]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar dataKey="orders" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance</CardTitle>
                  <CardDescription>Key sales metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Revenue</span>
                      <span className="font-bold">
                        ₹{salesData.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Orders Completed</span>
                      <span className="font-bold">
                        {salesData.ordersCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Order Value</span>
                      <span className="font-bold">
                        ₹{salesData.averageOrderValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Products by Revenue</CardTitle>
                  <CardDescription>Best performing products</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productPerformanceData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `₹${value}K`}
                      />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip
                        formatter={(value) => [
                          `₹${Number(value).toLocaleString()}K`,
                          "Revenue",
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* <Card>
              <CardHeader>
                <CardTitle>Product Growth Analysis</CardTitle>
                <CardDescription>
                  Growth rate comparison across products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Growth Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="growth"
                      stroke="#82ca9d"
                      strokeWidth={3}
                      dot={{ fill: "#82ca9d", strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card> */}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Distribution</CardTitle>
                  <CardDescription>Stock value by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stockCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent = 0 }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stockCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `₹${Number(value).toLocaleString()}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stock Analysis</CardTitle>
                  <CardDescription>
                    Inventory performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Stock Value</span>
                      <span className="font-bold">
                        ₹{stockData.totalStockValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stock Turnover</span>
                      <span className="font-bold">
                        {stockData.stockTurnover}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Low Stock Items</span>
                      <span className="font-bold text-orange-600">
                        {stockData.lowStockItems}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Out of Stock</span>
                      <span className="font-bold text-red-600">
                        {stockData.outOfStockItems}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Stock Movement</CardTitle>
                <CardDescription>
                  Monthly inbound vs outbound stock flow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredStockMovementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} units`,
                        "",
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Bar dataKey="inbound" fill="#82ca9d" name="Inbound" />
                    <Bar dataKey="outbound" fill="#8884d8" name="Outbound" />
                    <Bar dataKey="net" fill="#ffc658" name="Net Change" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Revenue Distribution</CardTitle>
                  <CardDescription>Revenue by top customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={customerRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `₹${value}K`} />
                      <Tooltip
                        formatter={(value) => [
                          `₹${Number(value).toLocaleString()}K`,
                          "Revenue",
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Order Frequency</CardTitle>
                  <CardDescription>
                    Orders placed by top customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={customerRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [value, "Orders"]} />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#82ca9d"
                        strokeWidth={3}
                        dot={{ fill: "#82ca9d", strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>
                  Best performing customers by revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.city}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₹{customer.revenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.orders} orders
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}