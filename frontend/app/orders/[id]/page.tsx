"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingCart,
  Edit,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"

// TypeScript interfaces
interface OrderItem {
  product: string
  color: string
  quantity: number
  unit: string
  pricePerMeters: number
}

interface Order {
  _id: string
  customer: string
  status?: string
  orderDate: string
  deliveryDate: string
  orderItems: OrderItem[]
  notes?: string
  createdAt: string
  updatedAt: string
}

interface Customer {
  _id: string
  customerName: string
  phone: string
  address: string
  email?: string
  city?: string
}

export default function OrderViewPage() {
  const params = useParams()
  const orderId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)

  // Fetch order and customer data
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${API_BASE_URL}/order/${orderId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch order details')
        }

        const data = await response.json()
        
        if (!data.success || !data.order) {
          throw new Error('Invalid order response')
        }

        setOrder(data.order)

        // Fetch customer details based on customer name
        const customerResponse = await fetch(`${API_BASE_URL}/customer`)
        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          if (customerData.success && customerData.customers) {
            const foundCustomer = customerData.customers.find(
              (c: Customer) => c.customerName === data.order.customer
            )
            setCustomer(foundCustomer || null)
          }
        }

      } catch (err) {
        console.error('Error fetching order:', err)
        setError(err instanceof Error ? err.message : 'Failed to load order data')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderData()
  }, [orderId])

  // Get status from backend or fallback to pending
  const getOrderStatus = () => {
    return order?.status || 'pending'
  }

  // Calculate order totals
  const calculateOrderTotal = () => {
    if (!order) return 0
    return order.orderItems.reduce((sum, item) => sum + (item.quantity * item.pricePerMeters), 0)
  }

  // Create dynamic order object from backend data
  const dynamicOrder = order ? {
    id: order._id,
    // Format order ID as ORD-XXX where XXX is a number
    displayId: (() => {
      const orderId = order._id;
      // Extract only numeric digits from the ID
      const numericChars = orderId.replace(/[^0-9]/g, '');
      // Use the last 3 digits, or pad with zeros if less than 3 digits
      const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
      return `ORD-${lastThreeDigits}`;
    })(),
    customer: {
      name: customer?.customerName || order.customer,
      city: customer?.city || "N/A",
      phone: customer?.phone || "N/A",
      email: customer?.email || "N/A",
      address: customer?.address || "N/A",
    },
    status: getOrderStatus(),
    orderDate: new Date(order.orderDate).toLocaleDateString(),
    dueDate: new Date(order.deliveryDate).toLocaleDateString(),
    deliveryDate: null, // Can be enhanced based on business logic
    totalAmount: calculateOrderTotal(),
    paidAmount: Math.floor(calculateOrderTotal() * 0.4), // Mock 40% paid
    balanceAmount: Math.floor(calculateOrderTotal() * 0.6), // Mock 60% balance
    paymentStatus: "partial", // Mock status
    items: order.orderItems.map((item, index) => ({
      id: index + 1,
      product: item.product,
      color: item.color,
      quantity: item.quantity,
      price: item.pricePerMeters,
      total: item.quantity * item.pricePerMeters,
      image: `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(item.product)}`,
    })),
    notes: order.notes || "",
    createdBy: "Sales Team", // Mock data
    lastUpdated: new Date(order.updatedAt).toLocaleDateString(),
  } : null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <ShoppingCart className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case "pending":
        return <Badge className="bg-red-100 text-red-800">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
              <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{dynamicOrder?.displayId || orderId}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load order</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : !dynamicOrder ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Order not found</h3>
            <p className="text-muted-foreground mb-4">The requested order could not be found.</p>
            <Link href="/orders">
              <Button>Back to Orders</Button>
            </Link>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-start justify-between">
          <div className="flex items-start gap-4">
            {getStatusIcon(dynamicOrder.status)}
            <div>
              <h1 className="text-3xl font-bold">Order {dynamicOrder.displayId}</h1>
              <p className="text-muted-foreground">
                {dynamicOrder.customer.name} • {dynamicOrder.orderDate}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(dynamicOrder.status)}
                {getPaymentStatusBadge(dynamicOrder.paymentStatus)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/orders/${dynamicOrder.id}/edit`}> {/* Keep using original ID for links */}
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Order
              </Button>
            </Link>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700 bg-transparent">
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Order Summary */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal</span>
                <span>₹{dynamicOrder.items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Discount</span>
                <span>
                  -₹{(dynamicOrder.items.reduce((sum, item) => sum + item.total, 0) - dynamicOrder.totalAmount).toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount</span>
                <span>₹{dynamicOrder.totalAmount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Paid Amount</span>
                  <span className="text-green-600">₹{dynamicOrder.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Balance</span>
                  <span className="text-red-600">₹{dynamicOrder.balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <div className="md:col-span-2">
            <Tabs defaultValue="items" className="space-y-4">
              <TabsList>
                <TabsTrigger value="items">Order Items</TabsTrigger>
                <TabsTrigger value="customer">Customer Info</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items ({dynamicOrder.items.length})</CardTitle>
                    <CardDescription>Products included in this order</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dynamicOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.product}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{item.product}</h4>
                            <p className="text-sm text-muted-foreground">Color: {item.color}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity}m × ₹{item.price}/m
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{item.total.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {dynamicOrder.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{dynamicOrder.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="customer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>Contact and delivery details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dynamicOrder.customer.name}</p>
                        <p className="text-sm text-muted-foreground">Customer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dynamicOrder.customer.phone}</p>
                        <p className="text-sm text-muted-foreground">Phone</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dynamicOrder.customer.email}</p>
                        <p className="text-sm text-muted-foreground">Email</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{dynamicOrder.customer.address}</p>
                        <p className="text-sm text-muted-foreground">Delivery Address</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dynamicOrder.orderDate}</p>
                        <p className="text-sm text-muted-foreground">Order Date</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dynamicOrder.dueDate}</p>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                      </div>
                    </div>
                    {dynamicOrder.deliveryDate && (
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{dynamicOrder.deliveryDate}</p>
                          <p className="text-sm text-muted-foreground">Delivery Date</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </>
        )}
      </div>
    </SidebarInset>
  )
}
