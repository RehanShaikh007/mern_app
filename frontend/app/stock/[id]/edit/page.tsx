"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { ArrowLeft, Save, X, Loader2, AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
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

// Agent interface based on API response
interface Agent {
  _id: string;
  name: string;
  factory: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

export default function StockEditPage() {
  const params = useParams()
  const router = useRouter()
  const stockId = params.id as string
  const { toast } = useToast()

  // State management
  const [stockItem, setStockItem] = useState<Stock | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Add state for agents fetching
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [factories, setFactories] = useState<string[]>([]);

  // Predefined options
  const processingStages = ["dyeing", "printing", "finishing", "quality-check"]
  const qualityGrades = ["A+", "A", "B+", "B"]
  const statuses = ["available", "low", "out", "processing", "quality_check"]
  const units = ["METERS", "SETS"]

  // Fetch stock data from backend
  useEffect(() => {
    const fetchStock = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${API_BASE_URL}/stock/${stockId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stock: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (data.success) {
          const stock = data.stock as Stock
          setStockItem(stock)
        } else {
          throw new Error(data.message || "Failed to fetch stock")
        }
      } catch (err) {
        console.error("Error fetching stock:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch stock")
      } finally {
        setLoading(false)
      }
    }

    if (stockId) {
      fetchStock()
    }

    const fetchAgentsAndFactories = async () => {
      try {
        setAgentsLoading(true);
        const response = await fetch(`${API_BASE_URL}/agent/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch agents: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        
        if (data.success) {
          setAgents(data.agents || []);
          // Extract unique factory names from agents
          const uniqueFactories = [...new Set(data.agents.map((agent: Agent) => agent.factory))] as string[];
          setFactories(uniqueFactories);
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
      } finally {
        setAgentsLoading(false);
      }
    };
    fetchAgentsAndFactories();
  }, [stockId])

  // Update stock item field
  const updateStockItem = (field: string, value: any) => {
    if (!stockItem) return;
    
    setStockItem(prev => {
      if (!prev) return prev;
      
      if (field.includes('.')) {
        const [section, key] = field.split('.');
        return {
          ...prev,
          [section]: {
            ...prev[section as keyof Stock],
            [key]: value
          }
        };
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
  }

  // Update variant
  const updateVariant = (index: number, field: string, value: any) => {
    if (!stockItem) return;
    
    setStockItem(prev => {
      if (!prev) return prev;
      
      const updatedVariants = [...prev.variants];
      updatedVariants[index] = {
        ...updatedVariants[index],
        [field]: value
      };
      
      return {
        ...prev,
        variants: updatedVariants
      };
    });
  }

  // Add new variant
  const addVariant = () => {
    if (!stockItem) return;
    
    const newVariant: StockVariant = {
      color: "",
      quantity: 0,
      unit: "METERS"
    };
    
    setStockItem(prev => ({
      ...prev!,
      variants: [...prev!.variants, newVariant]
    }));
  }

  // Remove variant
  const removeVariant = (index: number) => {
    if (!stockItem || stockItem.variants.length <= 1) return;
    
    setStockItem(prev => ({
      ...prev!,
      variants: prev!.variants.filter((_, i) => i !== index)
    }));
  }

  // Update additional info
  const updateAdditionalInfo = (field: string, value: string) => {
    if (!stockItem) return;
    
    setStockItem(prev => ({
      ...prev!,
      addtionalInfo: {
        ...prev!.addtionalInfo,
        [field]: value
      }
    }));
  }

  const handleSave = async () => {
    if (!stockItem) return;
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch(`${API_BASE_URL}/stock/${stockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockItem),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update stock")
      }

      const result = await response.json()
      console.log("Stock updated successfully:", result)
      
      setSuccess(true)
      toast({ title: "Stock updated", description: `Stock changes saved successfully.` })
      
      // Redirect to stock list after a short delay
      setTimeout(() => {
        router.push("/stock")
      }, 900)
      
    } catch (err) {
      console.error("Error updating stock:", err)
      const message = err instanceof Error ? err.message : "Failed to update stock"
      setError(message)
      toast({ title: "Failed to update stock", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/stock/${stockId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to delete stock')
      }
      router.push('/stock')
    } catch (err) {
      console.error('Error deleting stock:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete stock')
    } finally {
      setDeleting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
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
      </div>
    )
  }

  // Error state
  if (error || !stockItem) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load stock data</h3>
            <p className="text-muted-foreground mb-4">{error || "Stock not found"}</p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Retry
              </Button>
              <Button 
                onClick={() => router.push("/stock")}
                variant="outline"
              >
                Back to Stock List
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/stock/${stockId}`}>{(stockItem.stockDetails as any).product}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/stock/${stockId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Edit {stockItem.stockType}</h2>
              <p className="text-muted-foreground">Update stock information</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => router.push(`/stock/${stockId}`)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-800 font-medium">Stock updated successfully!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">Redirecting to stock list...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-800 font-medium">Error updating stock</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Edit Form */}
        <div className="w-full space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Stock item basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product Name *</Label>
                <Input
                  id="product"
                  value={(stockItem.stockDetails as any).product || ""}
                  onChange={(e) => updateStockItem('stockDetails.product', e.target.value)}
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={stockItem.status} onValueChange={(value) => updateStockItem('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    value={stockItem.addtionalInfo.batchNumber || ""}
                    onChange={(e) => updateAdditionalInfo("batchNumber", e.target.value)}
                    placeholder="Enter batch number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualityGrade">Quality Grade</Label>
                  <Select
                    value={stockItem.addtionalInfo.qualityGrade || "A"}
                    onValueChange={(value) => updateAdditionalInfo("qualityGrade", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {qualityGrades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={stockItem.addtionalInfo.notes || ""}
                    onChange={(e) => updateAdditionalInfo("notes", e.target.value)}
                    placeholder="Enter notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Type Specific Fields */}
          {stockItem.stockType === "Gray Stock" && (
            <Card>
              <CardHeader>
                <CardTitle>Gray Stock Details</CardTitle>
                <CardDescription>Factory and agent information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="factory">Factory *</Label>
                    <Select 
                      value={(stockItem.stockDetails as GrayStockDetails).factory || ""} 
                      onValueChange={(value) => updateStockItem('stockDetails.factory', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select factory" />
                      </SelectTrigger>
                      <SelectContent>
                        {factories.map((factory) => (
                          <SelectItem key={factory} value={factory}>
                            {factory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent">Agent *</Label>
                    <Select 
                      value={(stockItem.stockDetails as GrayStockDetails).agent || ""} 
                      onValueChange={(value) => updateStockItem('stockDetails.agent', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent._id} value={agent.name}>
                            {agent.name} - {agent.factory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={(stockItem.stockDetails as GrayStockDetails).orderNumber || ""}
                    onChange={(e) => updateStockItem('stockDetails.orderNumber', e.target.value)}
                    placeholder="Enter order number"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {stockItem.stockType === "Factory Stock" && (
            <Card>
              <CardHeader>
                <CardTitle>Factory Stock Details</CardTitle>
                <CardDescription>Processing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processingFactory">Processing Factory *</Label>
                    <Select 
                      value={(stockItem.stockDetails as FactoryStockDetails).processingFactory || ""} 
                      onValueChange={(value) => updateStockItem('stockDetails.processingFactory', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select factory" />
                      </SelectTrigger>
                      <SelectContent>
                        {factories.map((factory) => (
                          <SelectItem key={factory} value={factory}>
                            {factory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingStage">Processing Stage *</Label>
                    <Select 
                      value={(stockItem.stockDetails as FactoryStockDetails).processingStage || ""} 
                      onValueChange={(value) => updateStockItem('stockDetails.processingStage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {processingStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage.charAt(0).toUpperCase() + stage.slice(1).replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedCompletion">Expected Completion</Label>
                  <Input
                    id="expectedCompletion"
                    type="date"
                    value={(stockItem.stockDetails as FactoryStockDetails).expectedCompletion ? 
                      new Date((stockItem.stockDetails as FactoryStockDetails).expectedCompletion).toISOString().split('T')[0] : ""}
                    onChange={(e) => updateStockItem('stockDetails.expectedCompletion', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {stockItem.stockType === "Design Stock" && (
            <Card>
              <CardHeader>
                <CardTitle>Design Stock Details</CardTitle>
                <CardDescription>Design and warehouse information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="design">Design *</Label>
                    <Input
                      id="design"
                      value={(stockItem.stockDetails as DesignStockDetails).design || ""}
                      onChange={(e) => updateStockItem('stockDetails.design', e.target.value)}
                      placeholder="Enter design name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse *</Label>
                    <Input
                      id="warehouse"
                      value={(stockItem.stockDetails as DesignStockDetails).warehouse || ""}
                      onChange={(e) => updateStockItem('stockDetails.warehouse', e.target.value)}
                      placeholder="Enter warehouse name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stock Variants</CardTitle>
                  <CardDescription>Color variants and quantities</CardDescription>
                </div>
                <Button onClick={addVariant} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stockItem.variants.map((variant, index) => (
                <div
                  key={index}
                  className="flex gap-4 items-end p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <Label>Color</Label>
                    <Input
                      placeholder="Enter color"
                      value={variant.color}
                      onChange={(e) => updateVariant(index, "color", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={variant.quantity}
                      onChange={(e) => updateVariant(index, "quantity", Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={variant.unit}
                      onValueChange={(value) => updateVariant(index, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {stockItem.variants.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {stockItem.variants.some((v) => v.unit === "SETS") && (
                <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium">Set Conversion:</p>
                  <p>• 1 Set (3 colors) = 180 meters (60m per color)</p>
                  <p>• 1 Set (2 colors) = 120 meters (60m per color)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone: Delete Stock */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground"></div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Stock</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this stock item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the stock entry
                  and remove it from your inventory.
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
      </div>
    </div>
  )
}