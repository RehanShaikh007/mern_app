"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { RotateCcw, Search, Plus, Package, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

interface Return {
  _id: string
  id: string
  orderId: string
  order: string
  customer: string
  product: string
  color: string
  quantityInMeters: number
  returnReason: string
  isApprove: boolean
  isRejected?: boolean
  date: string
  formattedOrderId?: string
  refundAmount?: number
}



interface Order {
  _id: string
  customer: string
  orderItems: OrderItem[]
}

interface OrderItem {
  product: string
  color: string
  quantity: number
  pricePerMeters: number
}

interface Product {
  _id: string
  productName: string
  variants: ProductVariant[]
}

interface ProductVariant {
  color: string
}

export default function ReturnsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [returns, setReturns] = useState<Return[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


   // Form state for new return
   const [newReturn, setNewReturn] = useState({
    order: "",
    product: "",
    color: "",
    quantityInMeters: 0,
    returnReason: ""
  })

  // const returns = [
  //   {
  //     id: "RET-001",
  //     orderId: "ORD-001",
  //     customer: "Rajesh Textiles",
  //     product: "Cotton Blend Fabric",
  //     color: "Blue",
  //     quantity: 45,
  //     reason: "Quality issue",
  //     status: "pending",
  //     date: "2024-01-15",
  //     value: 20250,
  //   },
  //   {
  //     id: "RET-002",
  //     orderId: "ORD-003",
  //     customer: "Fashion Hub",
  //     product: "Silk Designer Print",
  //     color: "Red",
  //     quantity: 30,
  //     reason: "Wrong color",
  //     status: "approved",
  //     date: "2024-01-14",
  //     value: 24000,
  //   },
  //   {
  //     id: "RET-003",
  //     orderId: "ORD-005",
  //     customer: "Style Point",
  //     product: "Polyester Mix",
  //     color: "Green",
  //     quantity: 60,
  //     reason: "Damaged in transit",
  //     status: "processed",
  //     date: "2024-01-12",
  //     value: 18000,
  //   },
  //   {
  //     id: "RET-004",
  //     orderId: "ORD-002",
  //     customer: "Modern Fabrics",
  //     product: "Premium Cotton",
  //     color: "White",
  //     quantity: 25,
  //     reason: "Size mismatch",
  //     status: "pending",
  //     date: "2024-01-11",
  //     value: 11250,
  //   },
  // ]

  // Fetch returns (sorted by latest to oldest)
  const fetchReturns = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching returns...')
      const returnsRes = await fetch(`${API_BASE_URL}/returns`)
      if (!returnsRes.ok) {
        throw new Error(`Returns API error: ${returnsRes.status}`)
      }
      const returnsData = await returnsRes.json()
      console.log('Returns data:', returnsData)
      
      if (returnsData.success && returnsData.returns) {
        // Format order IDs as ORD-XXX
        const formattedReturns = returnsData.returns.map((returnItem: any) => {
          // Format order ID
          const orderId = returnItem.order || returnItem.orderId;
          // Extract only numeric digits from the ID
          const numericChars = orderId.replace(/[^0-9]/g, '');
          // Use the last 3 digits, or pad with zeros if less than 3 digits
          const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
          const formattedOrderId = `ORD-${lastThreeDigits}`;
          
          // Format date if it exists, otherwise use createdAt
          const formattedDate = returnItem.date || 
            (returnItem.createdAt ? new Date(returnItem.createdAt).toISOString().split('T')[0] : 'N/A');
          
          return {
            ...returnItem,
            formattedOrderId,
            date: formattedDate
          };
        });
        
        setReturns(formattedReturns)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setReturns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch returns
        await fetchReturns()

        // Fetch orders
        console.log('Fetching orders...')
        const ordersRes = await fetch(`${API_BASE_URL}/order`)
        if (!ordersRes.ok) {
          throw new Error(`Orders API error: ${ordersRes.status}`)
        }
        const ordersData = await ordersRes.json()
        if (!ordersData.success) {
          throw new Error(ordersData.message || "Failed to fetch orders")
        }
        console.log('Orders data:', ordersData)
        setOrders(ordersData.orders || [])

        // Fetch products (support both /api/v1/products and /api/v1/products/products)
        console.log('Fetching products...')
        let productsData: any = null
        let productsRes = await fetch(`${API_BASE_URL}/products`)
        if (productsRes.ok) {
          const data = await productsRes.json()
          if (data?.success && Array.isArray(data.products)) {
            productsData = data.products
          }
        }
        if (!productsData) {
          // Try fallback route if backend is mounted at /api/v1/products
          productsRes = await fetch(`${API_BASE_URL}/products/products`)
          if (!productsRes.ok) {
            throw new Error(`Products API error: ${productsRes.status}`)
          }
          const data = await productsRes.json()
          if (!data.success) {
            throw new Error(data.message || "Failed to fetch products")
          }
          productsData = data.products || []
        }
        console.log('Products data:', productsData)
        setProducts(productsData)
        
        // Extract colors from products
        const colorsFromProducts = Array.from(new Set(
          productsData.products?.flatMap((p: Product) => 
            p.variants?.map((v: ProductVariant) => v.color) || []
          ) || []
        )) as string[]
        setColors(colorsFromProducts)

      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle status filter change
  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
  }

  // Filter returns based on search term and status
  const filteredReturns = returns.filter((returnItem: Return) => {
    const matchesSearch =
      returnItem.order.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.product.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = 
      selectedStatus === "all" || 
      (selectedStatus === "approved" && returnItem.isApprove) ||
      (selectedStatus === "pending" && !returnItem.isApprove && !returnItem.isRejected) ||
      (selectedStatus === "rejected" && returnItem.isRejected)
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return "destructive"
    return isApprove ? "default" : "secondary"
  }

  const getStatusIcon = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return <AlertCircle className="h-4 w-4 text-red-500" />
    return isApprove ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <Clock className="h-4 w-4 text-orange-500" />
  }

  const getStatusText = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return "Rejected"
    return isApprove ? "Approved" : "Pending"
  }

  // Get products for the selected order
  const getOrderProducts = (orderId: string) => {
    if (!orderId) return []
    const selectedOrder = orders.find(order => order._id === orderId)
    if (!selectedOrder) return []
    
    // Extract unique products from order items
    const orderProducts = selectedOrder.orderItems.map((item: OrderItem) => item.product)
    return products.filter(product => orderProducts.includes(product.productName))
  }

  // Get colors for the selected product
  const getProductColors = (productName: string) => {
    if (!productName) return []
    const selectedProduct = products.find(product => product.productName === productName)
    if (!selectedProduct) return []
    
    return selectedProduct.variants.map((variant: ProductVariant) => variant.color)
  }

  // Get available quantity for the selected order, product, and color
  const getAvailableQuantity = (orderId: string, productName: string, color: string) => {
    if (!orderId || !productName || !color) return 0
    
    const selectedOrder = orders.find(order => order._id === orderId)
    if (!selectedOrder) return 0
    
    const orderItem = selectedOrder.orderItems.find((item: OrderItem) => 
      item.product === productName && item.color === color
    )
    
    return orderItem ? orderItem.quantity : 0
  }



  const returnStats = {
    total: returns.length,
    pending: returns.filter(r => !r.isApprove && !r.isRejected).length,
    approved: returns.filter(r => r.isApprove).length,
    rejected: returns.filter(r => r.isRejected).length,
    processed: returns.filter(r => r.isApprove).length, // For now, processed = approved
    totalValue: returns.reduce((sum, r) => sum + (r.quantityInMeters * 450), 0), // Use estimated value
  }

  const handleCreateReturn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReturn)
      })

      if (!response.ok) {
        throw new Error('Failed to create return')
      }

      const data = await response.json()
      setReturns([...returns, data.return])
      setNewReturn({
        order: "",
        product: "",
        color: "",
        quantityInMeters: 0,
        returnReason: ""
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create return')
    }
  }

  const handleApproveReturn = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApprove: true })
      })

      if (!response.ok) {
        throw new Error('Failed to approve return')
      }

      const updatedReturn = await response.json()
      
      // Refresh the data
      await fetchReturns()
      
      // Show success message
      alert(`✅ Return approved successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve return')
    }
  }

  const handleRejectReturn = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApprove: false, isRejected: true })
      })

      if (!response.ok) {
        throw new Error('Failed to reject return')
      }

      const updatedReturn = await response.json()
      
      // Refresh the data
      await fetchReturns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject return')
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>



  const recentOrders = [
    { id: "ORD-001", customer: "Rajesh Textiles", date: "2024-01-15", items: 3 },
    { id: "ORD-002", customer: "Fashion Hub", date: "2024-01-14", items: 2 },
    { id: "ORD-003", customer: "Style Point", date: "2024-01-13", items: 4 },
    { id: "ORD-004", customer: "Modern Fabrics", date: "2024-01-12", items: 2 },
  ]

  // const filteredReturns = returns.filter((returnItem) => {
  //   const matchesSearch =
  //     returnItem.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     returnItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     returnItem.product.toLowerCase().includes(searchTerm.toLowerCase())
  //   const matchesStatus = selectedStatus === "all" || returnItem.status === selectedStatus
  //   return matchesSearch && matchesStatus
  // })

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case "pending":
  //       return "secondary"
  //     case "approved":
  //       return "default"
  //     case "processed":
  //       return "outline"
  //     default:
  //       return "secondary"
  //   }
  // }

  // const getStatusIcon = (status: string) => {
  //   switch (status) {
  //     case "pending":
  //       return <Clock className="h-4 w-4 text-orange-500" />
  //     case "approved":
  //       return <CheckCircle className="h-4 w-4 text-green-500" />
  //     case "processed":
  //       return <Package className="h-4 w-4 text-blue-500" />
  //     default:
  //       return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  //   }
  // }

  // const returnStats = {
  //   total: returns.length,
  //   pending: returns.filter((r) => r.status === "pending").length,
  //   approved: returns.filter((r) => r.status === "approved").length,
  //   processed: returns.filter((r) => r.status === "processed").length,
  //   totalValue: returns.reduce((sum, r) => sum + r.value, 0),
  // }

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
              <BreadcrumbPage>Returns</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Returns Management</h2>
            <p className="text-muted-foreground">Process and track product returns</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Process Return
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Process New Return</DialogTitle>
                <DialogDescription>Select order and items to return</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="order">Select Order</Label>
                  <Select 
                    value={newReturn.order}
                    onValueChange={(value) => {
                      setNewReturn({
                        ...newReturn, 
                        order: value,
                        product: "", // Reset product when order changes
                        color: "" // Reset color when order changes
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => {
                        // Format order ID as ORD-XXX
                        const orderId = order._id;
                        // Extract only numeric digits from the ID
                        const numericChars = orderId.replace(/[^0-9]/g, '');
                        // Use the last 3 digits, or pad with zeros if less than 3 digits
                        const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
                        const formattedOrderId = `ORD-${lastThreeDigits}`;
                        
                        return (
                          <SelectItem key={order._id} value={order._id}>
                            {formattedOrderId} - {order.customer}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select
                    value={newReturn.product}
                    onValueChange={(value) => {
                      setNewReturn({
                        ...newReturn, 
                        product: value,
                        color: "" // Reset color when product changes
                      })
                    }}
                    disabled={!newReturn.order}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newReturn.order ? "Select product" : "Select order first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getOrderProducts(newReturn.order).map((product) => (
                        <SelectItem key={product._id} value={product.productName}>
                          {product.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Select
                      value={newReturn.color}
                      onValueChange={(value) => setNewReturn({...newReturn, color: value})}
                      disabled={!newReturn.product}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={newReturn.product ? "Select color" : "Select product first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getProductColors(newReturn.product).map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (meters)</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      value={newReturn.quantityInMeters}
                      onChange={(e) => setNewReturn({
                        ...newReturn,
                        quantityInMeters: Number(e.target.value)
                      })}
                      max={getAvailableQuantity(newReturn.order, newReturn.product, newReturn.color)}
                    />
                    {newReturn.order && newReturn.product && newReturn.color && (
                      <p className="text-sm text-muted-foreground">
                        Available: {getAvailableQuantity(newReturn.order, newReturn.product, newReturn.color)} meters
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Return Reason</Label>
                  <Textarea 
                    id="reason" 
                    value={newReturn.returnReason}
                    onChange={(e) => setNewReturn({
                      ...newReturn,
                      returnReason: e.target.value
                    })}
                    placeholder="Describe the reason for return..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleCreateReturn}
                  >
                    Process Return
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{returnStats.total}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{returnStats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{returnStats.approved}</div>
              <p className="text-xs text-muted-foreground">Ready to process</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{returnStats.rejected}</div>
              <p className="text-xs text-muted-foreground">Declined returns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{returnStats.processed}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Return Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{returnStats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total value</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search returns..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Returns Table */}
        {/* Return Ledger - Approved Returns */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Return Ledger</CardTitle>
            <CardDescription>Approved returns that have been processed and moved to the ledger.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading returns...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-red-500">Error: {error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Return ID</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Order ID</th>
                        <th className="text-left p-4 font-medium">Customer</th>
                        <th className="text-left p-4 font-medium">Product</th>
                        <th className="text-left p-4 font-medium">Color</th>
                        <th className="text-left p-4 font-medium">Qty</th>
                        <th className="text-left p-4 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.filter(r => r.isApprove).map((r) => (
                        <tr key={r._id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{r.id || 'N/A'}</td>
                          <td className="p-4">{r.date || 'N/A'}</td>
                          <td className="p-4">{r.formattedOrderId || 'N/A'}</td>
                          <td className="p-4">{r.customer || 'Unknown Customer'}</td>
                          <td className="p-4">{r.product}</td>
                          <td className="p-4">{r.color}</td>
                          <td className="p-4">{r.quantityInMeters}m</td>
                          <td className="p-4">{r.returnReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>


              </>
            )}
          </CardContent>
        </Card>
        {/* --- End Demo: Return Ledger --- */}
        <Card>
          <CardHeader>
            <CardTitle>Return Requests</CardTitle>
            <CardDescription>Pending return requests awaiting approval</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading returns...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-red-500">Error: {error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Return ID</th>
                        <th className="text-left p-4 font-medium">Order ID</th>
                        <th className="text-left p-4 font-medium">Customer</th>
                        <th className="text-left p-4 font-medium">Product</th>
                        <th className="text-left p-4 font-medium">Qty</th>
                        <th className="text-left p-4 font-medium">Reason</th>
                        <th className="text-left p-4 font-medium">Value</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReturns.filter(returnItem => !returnItem.isApprove).map((returnItem) => (
                        <tr 
                          key={returnItem.id || returnItem._id} 
                          className={`border-b hover:bg-muted/50 ${
                            returnItem.isRejected ? 'bg-gray-100 opacity-60' : ''
                          }`}
                        >
                          <td className="p-4 font-medium">{returnItem.id || 'N/A'}</td>
                          <td className="p-4">{returnItem.formattedOrderId || 'N/A'}</td>
                          <td className="p-4">{returnItem.customer || 'Unknown Customer'}</td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{returnItem.product}</p>
                              <p className="text-sm text-muted-foreground">{returnItem.color}</p>
                            </div>
                          </td>
                          <td className="p-4">{returnItem.quantityInMeters}m</td>
                          <td className="p-4">
                            <span className="text-sm">{returnItem.returnReason}</span>
                          </td>
                          <td className="p-4">₹{(returnItem.quantityInMeters * 450).toLocaleString()}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(returnItem.isApprove, returnItem.isRejected)}
                              <Badge variant={getStatusColor(returnItem.isApprove, returnItem.isRejected)}>
                                {getStatusText(returnItem.isApprove, returnItem.isRejected)}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {!returnItem.isApprove && !returnItem.isRejected && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleApproveReturn(returnItem._id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleRejectReturn(returnItem._id)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {returnItem.isApprove && <Button size="sm">Process</Button>}
                              {returnItem.isRejected && (
                                <span className="text-sm text-muted-foreground">No actions available</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>


              </>
            )}
          </CardContent>
        </Card>

        {!loading && !error && filteredReturns.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No returns found</h3>
              <p className="text-muted-foreground mb-4">No return requests match your current filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  )
}
