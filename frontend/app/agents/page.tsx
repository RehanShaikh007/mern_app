"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, User, Factory, Eye, Edit, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { API_BASE_URL, getRecentOrdersByProduct } from "@/lib/api";

// Agent interface based on API response
interface Agent {
  _id: string;
  name: string;
  factory: string;
  createdAt: string;
  updatedAt: string;
  agentId: string;
  __v: number;
}

export default function AgentsPage() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingAgent, setAddingAgent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    factory: "",
  });

  // Fetch agents from backend on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setAgentsLoading(true);
        setAgentsError(null);
        
        const response = await fetch(`${API_BASE_URL}/agent/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setAgents(data.agents || []);
          toast({
            title: "Agents loaded",
            description: `Loaded ${data.agents?.length || 0} agents successfully`,
            variant: "default",
          });
        } else {
          throw new Error(data.message || "Failed to fetch agents");
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
        setAgentsError(err instanceof Error ? err.message : "Failed to fetch agents");
        toast({
          title: "Failed to load agents",
          description: err instanceof Error ? err.message : 'Failed to fetch agents',
          variant: "destructive",
        });
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAgents();
  }, [toast]);

  // Filter agents based on search term
  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.factory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAgent(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      const response = await fetch("/agent/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add agent");
      }

      const result = await response.json();
      
      setAddSuccess(true);
      toast({
        title: "Agent Added Successfully",
        description: `Agent ${formData.name} has been added`,
        variant: "default",
      });

      // Add the new agent to the list
      setAgents(prev => [...prev, result.agent]);
      
      // Reset form
      setFormData({ name: "", factory: "" });
      
      // Close dialog after a short delay
      setTimeout(() => {
        setIsAddDialogOpen(false);
        setAddSuccess(false);
      }, 1500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setAddError(errorMessage);
      toast({
        title: "Failed to add agent",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAddingAgent(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Agents</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Agents</h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Agent</DialogTitle>
                <DialogDescription>Create an agent record</DialogDescription>
              </DialogHeader>

              {addSuccess && (
                <div className="bg-green-50 p-3 rounded text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Agent added successfully
                </div>
              )}
              {addError && (
                <div className="bg-red-50 p-3 rounded text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {addError}
                </div>
              )}

              <form onSubmit={handleAddAgent} className="space-y-3">
                <div>
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                </div>
                <div>
                  <Label>Factory *</Label>
                  <Input value={formData.factory} onChange={(e) => handleInputChange("factory", e.target.value)} />
                </div>
                <Button type="submit" disabled={addingAgent} className="w-full">
                  {addingAgent ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding...</> : "Add Agent"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agent List</CardTitle>
            <CardDescription>All registered agents</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-4 min-w-[120px]">Agent ID</th>
                    <th className="text-left font-medium p-4 min-w-[180px]">Name</th>
                    <th className="text-left font-medium p-4 min-w-[180px]">Factory</th>
                    <th className="text-left font-medium p-4 min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agentsLoading ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading agents...</span>
                        </div>
                      </td>
                    </tr>
                  ) : agentsError ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-destructive">
                        Error: {agentsError}
                      </td>
                    </tr>
                  ) : filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No agents found
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => (
                      <tr key={agent._id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <span className="font-medium">{agent.agentId}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{agent.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{agent.factory}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/agents/${agent._id}/edit`}>
                              <Button size="sm">
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
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}