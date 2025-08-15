"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  Factory,
  Palette,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowUpDown,
  Eye,
  Edit,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { API_BASE_URL } from "@/lib/api"

// Stock interfaces based on backend schema
interface StockVariant {
  color: string;
  quantity: number;
  unit: string;
}

interface AdditionalInfo {
  batchNumber: string;
  qualityGrade: string;
  notes?: string;
}

interface GrayStockDetails {
  product: string;
  factory: string;
  agent: string;
  orderNumber: string;
}

interface FactoryStockDetails {
  product: string;
  processingFactory: string;
  processingStage: string;
  expectedCompletion: string;
}

interface DesignStockDetails {
  product: string;
  design: string;
  warehouse: string;
}

interface Stock {
  _id: string;
  stockType: "Gray Stock" | "Factory Stock" | "Design Stock";
  status: string;
  variants: StockVariant[];
  stockDetails: GrayStockDetails | FactoryStockDetails | DesignStockDetails;
  addtionalInfo: AdditionalInfo;
  createdAt: string;
  updatedAt: string;
}

// Frontend display interfaces (keeping existing structure)
interface DisplayStock {
  id: string;
  product: string;
  quantity: number;
  factory?: string;
  agent?: string;
  orderNumber?: string;
  stage?: string;
  expectedCompletion?: string;
  design?: string;
  colors?: string[];
  warehouse?: string;
  status: string;
  createdAt: string; // Add creation date for sorting and display
}

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("gray")
  const { toast } = useToast()

  // Backend data states
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<{[key: string]: boolean}>({});

  // Pagination states for each stock type
  const [grayStockPage, setGrayStockPage] = useState(1);
  const [factoryStockPage, setFactoryStockPage] = useState(1);
  const [designStockPage, setDesignStockPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page

  // Pagination state for all stocks
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20, // Increased from 10 to show more items per page
    hasNextPage: false,
    hasPrevPage: false
  });

  // Fetch stocks from backend with pagination
  const fetchStocks = async (page: number = 1, limit: number = pagination.itemsPerPage) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/stock?page=${page}&limit=${limit}&sort=-createdAt`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stocks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStocks(data.stocks || []);
        // Update pagination info if available from API
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          // Calculate pagination manually if not provided by API
          const totalItems = data.stocks?.length || 0;
          const totalPages = Math.ceil(totalItems / limit);
          setPagination({
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          });
        }
      } else {
        throw new Error(data.message || "Failed to fetch stocks");
      }
    } catch (err) {
      console.error("Error fetching stocks:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchStocks();
  }, []);

  // State for products data
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch products for product name lookup
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        
        // Try the main products endpoint
        let response = await fetch(`${API_BASE_URL}/products`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        let data;
        if (response.ok) {
          data = await response.json();
          if (data.success) {
            setProducts(data.products || []);
            return;
          }
        }
        
        // Try fallback endpoint if first one fails
        response = await fetch(`${API_BASE_URL}/products/products`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error("Failed to fetch products from both endpoints");
          return;
        }
        
        data = await response.json();
        if (data.success) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Helper function to get product name from product ID
  const getProductName = (productId: string) => {
    const product = products.find(p => p._id === productId);
    return product ? product.productName : productId;
  };

  // Handle status change
  const handleStatusChange = async (stockId: string, newStatus: string) => {
    try {
      // Mark this stock as updating
      setUpdatingStatus(prev => ({ ...prev, [stockId]: true }));
      
      const response = await fetch(`${API_BASE_URL}/stock/${stockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update the stock in our local state
        setStocks(prevStocks => 
          prevStocks.map(stock => 
            stock._id === stockId ? { ...stock, status: newStatus } : stock
          )
        );
        
        toast({
          title: "Status Updated",
          description: `Stock status has been updated to ${newStatus}`,
          variant: "default",
        });
      } else {
        throw new Error(data.message || "Failed to update stock status");
      }
    } catch (err) {
      console.error("Error updating stock status:", err);
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update stock status",
        variant: "destructive",
      });
    } finally {
      // Mark this stock as no longer updating
      setUpdatingStatus(prev => ({ ...prev, [stockId]: false }));
    }
  };

  // Transform backend data to frontend display format
  const transformStocks = (stocks: Stock[]): {
    grayStock: DisplayStock[];
    factoryStock: DisplayStock[];
    designStock: DisplayStock[];
  } => {
    const grayStock: DisplayStock[] = [];
    const factoryStock: DisplayStock[] = [];
    const designStock: DisplayStock[] = [];

    stocks.forEach((stock) => {
      const totalQuantity = stock.variants.reduce((sum, variant) => sum + variant.quantity, 0);
      const colors = stock.variants.map(v => v.color);

      // Use dynamic status from backend
      const status = stock.status || "available";
      
      // Get product ID from stock details
      const productId = (stock.stockDetails as any).product || "";
      // Get product name using the helper function
      const productName = getProductName(productId);

      const baseStock: DisplayStock = {
        id: stock._id,
        product: productName,
        quantity: totalQuantity,
        status,
        createdAt: stock.createdAt, // Add creation date
      };

      if (stock.stockType === "Gray Stock") {
        const details = stock.stockDetails as GrayStockDetails;
        grayStock.push({
          ...baseStock,
          factory: details.factory,
          agent: details.agent,
          orderNumber: details.orderNumber,
        });
      } else if (stock.stockType === "Factory Stock") {
        const details = stock.stockDetails as FactoryStockDetails;
        factoryStock.push({
          ...baseStock,
          factory: details.processingFactory,
          stage: details.processingStage,
          expectedCompletion: new Date(details.expectedCompletion).toLocaleDateString(),
          status: status, // Use dynamic status from backend
        });
      } else if (stock.stockType === "Design Stock") {
        const details = stock.stockDetails as DesignStockDetails;
        designStock.push({
          ...baseStock,
          design: details.design,
          colors,
          warehouse: details.warehouse,
        });
      }
    });

    // Sort all stock types by creation date (latest first)
    const sortByDate = (a: DisplayStock, b: DisplayStock) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    return {
      grayStock: grayStock.sort(sortByDate),
      factoryStock: factoryStock.sort(sortByDate),
      designStock: designStock.sort(sortByDate),
    };
  };

  const { grayStock, factoryStock, designStock } = transformStocks(stocks);

  // Filter function for all stock types
  const filterStocks = (items: DisplayStock[]) => {
    return items.filter((item) => {
      const matchesSearch = searchTerm === "" || 
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.factory && item.factory.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.agent && item.agent.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.stage && item.stage.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.design && item.design.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.warehouse && item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = selectedFilter === "all" || item.status === selectedFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Filtered data for each tab
  const filteredGrayStock = filterStocks(grayStock);
  const filteredFactoryStock = filterStocks(factoryStock);
  const filteredDesignStock = filterStocks(designStock);

  // Pagination functions
  const getPaginatedData = (data: DisplayStock[], currentPage: number) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: DisplayStock[]) => {
    return Math.ceil(data.length / itemsPerPage);
  };
  
  // Handle page change for pagination
  const handlePageChange = (newPage: number) => {
    fetchStocks(newPage, pagination.itemsPerPage);
  };
  
  // Handle page change for specific stock type tabs
  const handleTabPageChange = (page: number, setPage: React.Dispatch<React.SetStateAction<number>>) => {
    setPage(page);
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (newLimit: number) => {
    fetchStocks(1, newLimit);
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setGrayStockPage(1);
    setFactoryStockPage(1);
    setDesignStockPage(1);
    // Also reset the main pagination and refetch data
    fetchStocks(1, pagination.itemsPerPage);
  }, [searchTerm, selectedFilter, activeTab]);

  // Reset pagination when tab changes
  useEffect(() => {
    setGrayStockPage(1);
    setFactoryStockPage(1);
    setDesignStockPage(1);
  }, [activeTab]);

  // Pagination component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    dataLength 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
    dataLength: number;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, dataLength)} of {dataLength} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "low":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "out":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default">Available</Badge>
      case "low":
        return <Badge variant="secondary">Low Stock</Badge>
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>
      case "processing":
        return <Badge variant="outline">Processing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const totalFilteredItems = filteredGrayStock.length + filteredFactoryStock.length + filteredDesignStock.length;

  const stockStats = {
    grayTotal: grayStock.reduce((sum, item) => sum + item.quantity, 0),
    factoryTotal: factoryStock.reduce((sum, item) => sum + item.quantity, 0),
    designTotal: designStock.reduce((sum, item) => sum + item.quantity, 0),
    lowStockItems: stocks.filter((stock) => stock.status === "low").length,
    outOfStockItems: stocks.filter((stock) => stock.status === "out").length,
    processingItems: stocks.filter((stock) => stock.status === "processing").length,
    totalStocks: totalFilteredItems,
  }

  // Loading state
  if (loading) {
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
                <BreadcrumbPage>Stock Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading stock data...</span>
          </div>
        </div>
      </SidebarInset>
    );
  }

  // Error state
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
                <BreadcrumbPage>Stock Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load stock data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
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
              <BreadcrumbPage>Stock Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Stock Management</h2>
            <p className="text-muted-foreground">Track gray, factory, and design stock</p>
          </div>
          <div className="flex gap-2">
            <Link href="/stock/adjustments">
              <Button variant="outline">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Adjustments
              </Button>
            </Link>
            <Link href="/stock/add">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </Link>
          </div>
        </div>
      

        {/* Stock Overview Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockStats.totalStocks}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                All stock items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gray Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockStats.grayTotal.toLocaleString()}m</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Unfinished fabric
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factory Stock</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockStats.factoryTotal.toLocaleString()}m</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-500" />
                In processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Design Stock</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockStats.designTotal.toLocaleString()}m</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Ready for sale
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => {
              setSelectedFilter("low");
              toast({
                title: "Filter Applied",
                description: "Showing only low stock items",
              });
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stockStats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Items need attention</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => {
              setSelectedFilter("out");
              toast({
                title: "Filter Applied",
                description: "Showing only out of stock items",
              });
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stockStats.outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">Urgent restocking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Factory className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stockStats.processingItems}</div>
              <p className="text-xs text-muted-foreground">In production</p>
            </CardContent>
          </Card>
        </div>

        {/* Global Filter Bar - Moved outside tabs */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stock..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="quality_check">Quality Check</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stock Details Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gray">Gray Stock</TabsTrigger>
            <TabsTrigger value="factory">Factory Stock</TabsTrigger>
            <TabsTrigger value="design">Design Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="gray" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gray Stock Inventory</CardTitle>
                <CardDescription>Unfinished fabric from factories</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Product</th>
                        <th className="text-left p-4 font-medium">Quantity</th>
                        <th className="text-left p-4 font-medium">Factory</th>
                        <th className="text-left p-4 font-medium">Agent</th>
                        <th className="text-left p-4 font-medium">Order No.</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrayStock.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            No gray stock found
                          </td>
                        </tr>
                      ) : (
                        getPaginatedData(filteredGrayStock, grayStockPage).map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{item.product}</td>
                          <td className="p-4">{item.quantity}m</td>
                          <td className="p-4">{item.factory}</td>
                          <td className="p-4">{item.agent}</td>
                          <td className="p-4">{item.orderNumber}</td>
                            <td className="p-4">{new Date(item.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              <Select
                                value={item.status}
                                onValueChange={(value) => handleStatusChange(item.id, value)}
                                disabled={updatingStatus[item.id]}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="available">Available</SelectItem>
                                  <SelectItem value="low">Low Stock</SelectItem>
                                  <SelectItem value="out">Out of Stock</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="quality_check">Quality Check</SelectItem>
                                </SelectContent>
                              </Select>
                              {updatingStatus[item.id] && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Link href={`/stock/${item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/stock/${item.id}/edit`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={grayStockPage}
                  totalPages={getTotalPages(filteredGrayStock)}
                  onPageChange={(page) => handleTabPageChange(page, setGrayStockPage)}
                  dataLength={filteredGrayStock.length}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="factory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Factory Processing Stock</CardTitle>
                <CardDescription>Stock currently being processed at factories</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Product</th>
                        <th className="text-left p-4 font-medium">Quantity</th>
                        <th className="text-left p-4 font-medium">Factory</th>
                        <th className="text-left p-4 font-medium">Stage</th>
                        <th className="text-left p-4 font-medium">Expected</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFactoryStock.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No factory stock found
                          </td>
                        </tr>
                      ) : (
                        getPaginatedData(filteredFactoryStock, factoryStockPage).map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{item.product}</td>
                          <td className="p-4">{item.quantity}m</td>
                          <td className="p-4">{item.factory}</td>
                          <td className="p-4">{item.stage}</td>
                          <td className="p-4">{item.expectedCompletion}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              <Select
                                value={item.status}
                                onValueChange={(value) => handleStatusChange(item.id, value)}
                                disabled={updatingStatus[item.id]}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="available">Available</SelectItem>
                                  <SelectItem value="low">Low Stock</SelectItem>
                                  <SelectItem value="out">Out of Stock</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="quality_check">Quality Check</SelectItem>
                                </SelectContent>
                              </Select>
                              {updatingStatus[item.id] && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Link href={`/stock/${item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/stock/${item.id}/edit`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={factoryStockPage}
                  totalPages={getTotalPages(filteredFactoryStock)}
                  onPageChange={(page) => handleTabPageChange(page, setFactoryStockPage)}
                  dataLength={filteredFactoryStock.length}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Design Stock Inventory</CardTitle>
                <CardDescription>Finished products ready for sale</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Product</th>
                        <th className="text-left p-4 font-medium">Design</th>
                        <th className="text-left p-4 font-medium">Quantity</th>
                        <th className="text-left p-4 font-medium">Colors</th>
                        <th className="text-left p-4 font-medium">Warehouse</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesignStock.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No design stock found
                          </td>
                        </tr>
                      ) : (
                        getPaginatedData(filteredDesignStock, designStockPage).map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{item.product}</td>
                          <td className="p-4">{item.design}</td>
                          <td className="p-4">{item.quantity}m</td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                                {item.colors?.map((color, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {color}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">{item.warehouse}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              <Select
                                value={item.status}
                                onValueChange={(value) => handleStatusChange(item.id, value)}
                                disabled={updatingStatus[item.id]}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="available">Available</SelectItem>
                                  <SelectItem value="low">Low Stock</SelectItem>
                                  <SelectItem value="out">Out of Stock</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="quality_check">Quality Check</SelectItem>
                                </SelectContent>
                              </Select>
                              {updatingStatus[item.id] && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Link href={`/stock/${item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/stock/${item.id}/edit`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={designStockPage}
                  totalPages={getTotalPages(filteredDesignStock)}
                  onPageChange={(page) => handleTabPageChange(page, setDesignStockPage)}
                  dataLength={filteredDesignStock.length}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  )
}
