"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Plus, X, Save, ArrowLeft } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  city?: string
}

interface Product {
  _id: string
  productName: string
  variants: {
    color: string
    price: number
    sku: string
  }[]
}

interface FormOrderItem {
  id: number
  product: string
  color: string
  quantity: number
  price: number
  total: number
  stockId?: string
}

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    customer: "",
    status: "pending",
    orderDate: new Date(),
    dueDate: new Date(),
    notes: "",
  })

  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([
    { id: 1, product: "", color: "", quantity: 0, price: 0, total: 0, stockId: "" }
  ])

  // Fetch order, customers, and products on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch order details, customers, and products in parallel
        const [orderResponse, customersResponse, productsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/order/${orderId}`),
          fetch(`${API_BASE_URL}/customer`),
          fetch(`${API_BASE_URL}/products`)
        ])

        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order details')
        }

        const orderData = await orderResponse.json()
        if (!orderData.success || !orderData.order) {
          throw new Error('Invalid order response')
        }

        // Transform backend order to form data
        const order = orderData.order
        setFormData({
          customer: order.customer,
          status: order.status || "pending", // Use actual status from backend
          orderDate: new Date(order.orderDate),
          dueDate: new Date(order.deliveryDate),
          notes: order.notes || "",
        })

        // Transform order items
        const transformedItems = order.orderItems.map((item: OrderItem, index: number) => ({
          id: index + 1,
          product: item.product,
          color: item.color,
          quantity: item.quantity,
          price: item.pricePerMeters,
          total: item.quantity * item.pricePerMeters,
          stockId: item.stockId // Preserve stockId
        }))
        setOrderItems(transformedItems)

        // Handle customers response
        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          if (customersData.success && customersData.customers) {
            setCustomers(customersData.customers)
          }
        }

        // Handle products response  
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          if (productsData.success && productsData.products) {
            setProducts(productsData.products)
          }
        }

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load order data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orderId])

  // Get available colors from selected product
  const getAvailableColors = (productName: string) => {
    const product = products.find(p => p.productName === productName)
    return product ? product.variants.map(v => v.color) : []
  }

  // Get price for selected product and color
  const getProductPrice = (productName: string, color: string) => {
    const product = products.find(p => p.productName === productName)
    if (!product) return 0
    const variant = product.variants.find(v => v.color === color)
    return variant ? variant.price : 0
  }

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
  ]

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const addOrderItem = () => {
    const newId = Math.max(...orderItems.map((item) => item.id)) + 1
    setOrderItems([...orderItems, { id: newId, product: "", color: "", quantity: 0, price: 0, total: 0, stockId: "" }])
  }

  const removeOrderItem = (id: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((item) => item.id !== id))
    }
  }

  const updateOrderItem = (id: number, field: string, value: string | number) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Reset color and price when product changes
          if (field === "product") {
            updatedItem.color = ""
            updatedItem.price = 0
            }

          // Auto-populate price when color is selected
          if (field === "color" && item.product) {
            const price = getProductPrice(item.product, value as string)
            updatedItem.price = price
          }

          // Calculate total
          updatedItem.total = updatedItem.quantity * updatedItem.price

          return updatedItem
        }
        return item
      }),
    )
  }

  const getOrderTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const validItems = orderItems.filter((item) => item.product && item.color && item.quantity > 0)
    if (!formData.customer || validItems.length === 0) {
      toast({ title: 'Missing information', description: 'Please add customer and at least one valid item.', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)

      // Transform form data to backend format
      const backendOrderItems = validItems.map((item) => ({
        product: item.product,
        color: item.color,
        quantity: item.quantity,
        unit: "METERS",
        pricePerMeters: item.price,
        stockId: item.stockId // Preserve stockId
      }))

      const orderData = {
        customer: formData.customer,
        status: formData.status,
        orderDate: formData.orderDate.toISOString(),
        deliveryDate: formData.dueDate.toISOString(),
        orderItems: backendOrderItems,
        notes: formData.notes
      }

      const response = await fetch(`${API_BASE_URL}/order/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as any).message || 'Failed to update order')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to update order')
      }

      console.log("Order updated successfully:", result)
      toast({ title: 'Order updated', description: 'Order has been saved successfully.' })
      setTimeout(() => router.push('/orders'), 900)
    } catch (err) {
      console.error('Error updating order:', err)
      const message = err instanceof Error ? err.message : 'Failed to update order'
      toast({ title: 'Failed to update order', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const resp = await fetch(`${API_BASE_URL}/order/${orderId}`, { method: 'DELETE' })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error((data as any).message || 'Failed to delete order')
      }
      router.push('/orders')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete order')
    } finally {
      setDeleting(false)
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
              <BreadcrumbLink href={`/orders/${orderId}`}>{orderId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Edit Order</h2>
            <p className="text-muted-foreground">Update order information and items</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Failed to load order</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        ) : (

        <>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
                <CardDescription>Basic order details and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={formData.customer} onValueChange={(value) => handleInputChange("customer", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer.customerName}>
                          <div className="flex flex-col">
                            <span>{customer.customerName}</span>
                            <span className="text-xs text-muted-foreground">{customer.city || 'N/A'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Order Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.orderDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.orderDate ? format(formData.orderDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.orderDate}
                          onSelect={(date) => date && handleInputChange("orderDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dueDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => date && handleInputChange("dueDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Order totals and pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{orderItems.filter((item) => item.quantity > 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Quantity:</span>
                    <span>{orderItems.reduce((sum, item) => sum + item.quantity, 0)} meters</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>₹{getOrderTotal().toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>Products in this order</CardDescription>
              </div>
              <Button type="button" onClick={addOrderItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <div key={item.id} className="grid gap-4 p-4 border rounded-lg md:grid-cols-6">
                    <div className="space-y-2">
                      <Label>Product *</Label>
                      <Select
                        value={item.product}
                        onValueChange={(value) => updateOrderItem(item.id, "product", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product._id} value={product.productName}>
                              <div className="flex flex-col">
                                <span>{product.productName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {product.variants.length} variants
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Color *</Label>
                      <Select value={item.color} onValueChange={(value) => updateOrderItem(item.id, "color", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableColors(item.product).map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity (m) *</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.quantity || ""}
                        onChange={(e) => updateOrderItem(item.id, "quantity", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Price/meter (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.price || ""}
                        onChange={(e) => updateOrderItem(item.id, "price", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total (₹)</Label>
                      <Input value={item.total.toLocaleString()} disabled className="bg-muted" />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOrderItem(item.id)}
                        disabled={orderItems.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Order Notes</CardTitle>
              <CardDescription>Additional information or special instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any special instructions or notes for this order..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* Danger Zone: Delete Order */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground"></div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Order</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the order
                  and remove it from the orders list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>No</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        </>
        )}
      </div>
    </SidebarInset>
  )
}
