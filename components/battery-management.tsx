"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryWarning,
  Plus,
  Trash2,
  AlertTriangle,
  Tag,
  Download,
  Wand2,
  GripVertical,
  ArrowRight,
} from "lucide-react"
import { useBatteryContext } from "@/context/battery-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BatteryComment, Match } from "@/lib/types"
import { formatDistanceToNow } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function BatteryManagement() {
  const {
    batteries,
    addBattery,
    removeBattery,
    assignments,
    getBatteryComments,
    markBatteryFaulty,
    assignBatteryToMatch,
  } = useBatteryContext()
  const [newBatteryId, setNewBatteryId] = useState("")
  const [newBatteryVoltage, setNewBatteryVoltage] = useState("12.8")
  const [newBatteryCapacity, setNewBatteryCapacity] = useState("18")
  const [newBatteryBrand, setNewBatteryBrand] = useState("")
  const [selectedBattery, setSelectedBattery] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [exportFormat, setExportFormat] = useState("csv")
  const [isAutoAssignDialogOpen, setIsAutoAssignDialogOpen] = useState(false)
  const [autoAssignInProgress, setAutoAssignInProgress] = useState(false)
  const { toast } = useToast()

  // Drag and drop state
  const [batteryRotationOrder, setBatteryRotationOrder] = useState<string[]>([])
  const [draggedBattery, setDraggedBattery] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [unassignedMatches, setUnassignedMatches] = useState<Match[]>([])
  const [matchAssignmentPreview, setMatchAssignmentPreview] = useState<{ [key: string]: string }>({})

  // Refs for drag and drop
  const dragItemRef = useRef<number | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  const handleAddBattery = () => {
    if (newBatteryId.trim()) {
      addBattery({
        id: newBatteryId,
        voltage: Number.parseFloat(newBatteryVoltage),
        capacity: Number.parseFloat(newBatteryCapacity),
        brand: newBatteryBrand.trim() || undefined,
        dateAdded: new Date().toISOString(),
        comments: [],
        isFaulty: false,
      })

      toast({
        title: "Battery added",
        description: `Battery ${newBatteryId} has been added to your inventory.`,
      })

      setNewBatteryId("")
      setNewBatteryVoltage("12.8")
      setNewBatteryCapacity("18")
      setNewBatteryBrand("")
    }
  }

  const handleRemoveBattery = (id: string) => {
    removeBattery(id)

    toast({
      title: "Battery removed",
      description: `Battery ${id} has been removed from your inventory.`,
    })
  }

  const handleToggleFaulty = (batteryId: string, isFaulty: boolean) => {
    markBatteryFaulty(batteryId, isFaulty)

    toast({
      title: isFaulty ? "Battery marked as faulty" : "Battery marked as working",
      description: `Battery ${batteryId} has been ${isFaulty ? "marked as faulty" : "marked as working"}.`,
      variant: isFaulty ? "destructive" : "default",
    })
  }

  const getBatteryStatusIcon = (batteryId: string) => {
    const battery = batteries.find((b) => b.id === batteryId)

    if (battery?.isFaulty) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />
    }

    const comments = getBatteryComments(batteryId)
    const hasIssues = comments.some(
      (c) =>
        c.text.toLowerCase().includes("issue") ||
        c.text.toLowerCase().includes("problem") ||
        c.text.toLowerCase().includes("fail"),
    )

    if (hasIssues) return <BatteryWarning className="h-5 w-5 text-amber-500" />

    const isAssigned = assignments.some((a) => a.batteryId === batteryId)
    if (isAssigned) return <BatteryMedium className="h-5 w-5 text-team-blue" />

    return <BatteryFull className="h-5 w-5 text-green-500" />
  }

  const getMatchForComment = (comment: BatteryComment) => {
    // This would typically fetch match details from your state or API
    return `Match ${comment.matchId.substring(0, 4)}`
  }

  // Get unique brands for filtering
  const uniqueBrands = Array.from(new Set(batteries.filter((b) => b.brand).map((b) => b.brand)))

  // Filter batteries based on active tab
  const filteredBatteries = batteries.filter((battery) => {
    if (activeTab === "all") return true
    if (activeTab === "faulty") return battery.isFaulty
    return battery.brand === activeTab
  })

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, batteryId: string, index: number) => {
    dragItemRef.current = index
    dragNodeRef.current = e.currentTarget

    // Add dragging class after a short delay
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.classList.add("opacity-50")
      }
    }, 0)

    setDraggedBattery(batteryId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.classList.remove("opacity-50")
    }
    dragItemRef.current = null
    dragNodeRef.current = null
    setDraggedBattery(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedBattery === null) return
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedBattery === null || dragItemRef.current === null) return

    const newOrder = [...batteryRotationOrder]
    const draggedItemIndex = dragItemRef.current

    // Remove the dragged item
    const draggedItem = newOrder.splice(draggedItemIndex, 1)[0]

    // Insert at the new position
    newOrder.splice(index, 0, draggedItem)

    setBatteryRotationOrder(newOrder)
    updateMatchAssignmentPreview(newOrder)

    handleDragEnd()
  }

  const handleAddToBatteryRotation = (batteryId: string) => {
    if (!batteryRotationOrder.includes(batteryId)) {
      const newOrder = [...batteryRotationOrder, batteryId]
      setBatteryRotationOrder(newOrder)
      updateMatchAssignmentPreview(newOrder)
    }
  }

  const handleRemoveFromBatteryRotation = (batteryId: string) => {
    const newOrder = batteryRotationOrder.filter((id) => id !== batteryId)
    setBatteryRotationOrder(newOrder)
    updateMatchAssignmentPreview(newOrder)
  }

  const updateMatchAssignmentPreview = (batteryOrder: string[]) => {
    if (batteryOrder.length === 0 || unassignedMatches.length === 0) {
      setMatchAssignmentPreview({})
      return
    }

    const preview: { [key: string]: string } = {}

    unassignedMatches.forEach((match, index) => {
      const batteryIndex = index % batteryOrder.length
      preview[match.id] = batteryOrder[batteryIndex]
    })

    setMatchAssignmentPreview(preview)
  }

  // Load unassigned matches when dialog opens
  useEffect(() => {
    if (isAutoAssignDialogOpen) {
      // This would typically fetch from your API or state
      // For now, we'll simulate with a placeholder
      const unassigned = Object.values(window.matchesData || [])
        .filter((match: any) => !assignments.some((a) => a.matchId === match.id))
        .slice(0, 10) // Limit to 10 for preview

      setUnassignedMatches(unassigned as Match[])
      updateMatchAssignmentPreview(batteryRotationOrder)
    }
  }, [isAutoAssignDialogOpen, assignments, batteryRotationOrder])

  // Function to auto-assign batteries to matches
  const handleAutoAssignBatteries = () => {
    if (batteryRotationOrder.length === 0) {
      toast({
        title: "No batteries selected",
        description: "Please select at least one battery for the rotation order.",
        variant: "destructive",
      })
      return
    }

    if (unassignedMatches.length === 0) {
      toast({
        title: "No unassigned matches",
        description: "All matches already have batteries assigned.",
      })
      setAutoAssignInProgress(false)
      setIsAutoAssignDialogOpen(false)
      return
    }

    setAutoAssignInProgress(true)

    // Assign batteries based on the preview
    Object.entries(matchAssignmentPreview).forEach(([matchId, batteryId]) => {
      assignBatteryToMatch(matchId, batteryId)
    })

    toast({
      title: "Auto-assignment complete",
      description: `Assigned ${Object.keys(matchAssignmentPreview).length} matches with ${batteryRotationOrder.length} batteries in rotation.`,
    })

    setAutoAssignInProgress(false)
    setIsAutoAssignDialogOpen(false)
  }

  // Export battery usage data
  const handleExportData = () => {
    // Create a map of battery assignments
    const batteryAssignments = new Map()

    // For each battery, find all its assignments
    batteries.forEach((battery) => {
      const batteryId = battery.id
      const batteryAssignmentList = assignments.filter((a) => a.batteryId === batteryId)
      const comments = getBatteryComments(batteryId)

      batteryAssignments.set(batteryId, {
        battery,
        assignments: batteryAssignmentList,
        comments,
      })
    })

    let content = ""
    let fileName = `battery-usage-${new Date().toISOString().split("T")[0]}`
    let mimeType = "text/plain"

    // Generate content based on selected format
    switch (exportFormat) {
      case "csv":
        content = generateCSVContent(batteryAssignments)
        fileName += ".csv"
        mimeType = "text/csv"
        break
      case "txt":
        content = generateTXTContent(batteryAssignments)
        fileName += ".txt"
        mimeType = "text/plain"
        break
      case "log":
        content = generateLOGContent(batteryAssignments)
        fileName += ".log"
        mimeType = "text/plain"
        break
      case "md":
        content = generateMDContent(batteryAssignments)
        fileName += ".md"
        mimeType = "text/markdown"
        break
      case "tsv":
        content = generateTSVContent(batteryAssignments)
        fileName += ".tsv"
        mimeType = "text/tab-separated-values"
        break
      default:
        content = generateCSVContent(batteryAssignments)
        fileName += ".csv"
        mimeType = "text/csv"
    }

    // Create and trigger download
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export successful",
      description: `Battery usage data has been exported as ${exportFormat.toUpperCase()}.`,
    })
  }

  // Generate CSV content
  const generateCSVContent = (batteryAssignments: Map<string, any>) => {
    let csvContent = "Battery ID,Voltage,Capacity,Brand,Is Faulty,Match ID,Assignment Date,Comments\n"

    batteryAssignments.forEach((data, batteryId) => {
      const { battery, assignments, comments } = data

      if (assignments.length === 0) {
        // If no assignments, just output battery info
        csvContent += `${battery.id},${battery.voltage},${battery.capacity},${battery.brand || ""},${battery.isFaulty ? "Yes" : "No"},,,"${comments.map((c) => c.text.replace(/"/g, '""')).join('"; "')}"\n`
      } else {
        // Output each assignment on a separate line
        assignments.forEach((assignment) => {
          const matchComments = comments.filter((c) => c.matchId === assignment.matchId)
          const commentText = matchComments.map((c) => c.text.replace(/"/g, '""')).join('"; "')

          csvContent += `${battery.id},${battery.voltage},${battery.capacity},${battery.brand || ""},${battery.isFaulty ? "Yes" : "No"},${assignment.matchId},${new Date(assignment.timestamp).toLocaleString()},"${commentText}"\n`
        })
      }
    })

    return csvContent
  }

  // Generate TXT content
  const generateTXTContent = (batteryAssignments: Map<string, any>) => {
    let txtContent = "BATTERY USAGE REPORT\n"
    txtContent += "===================\n\n"
    txtContent += `Generated: ${new Date().toLocaleString()}\n\n`

    batteryAssignments.forEach((data, batteryId) => {
      const { battery, assignments, comments } = data

      txtContent += `BATTERY: ${battery.id}\n`
      txtContent += `Voltage: ${battery.voltage}V\n`
      txtContent += `Capacity: ${battery.capacity}Ah\n`
      if (battery.brand) txtContent += `Brand: ${battery.brand}\n`
      txtContent += `Status: ${battery.isFaulty ? "FAULTY" : "Working"}\n`
      txtContent += `Added: ${new Date(battery.dateAdded).toLocaleDateString()}\n\n`

      if (assignments.length === 0) {
        txtContent += "No match assignments\n"
      } else {
        txtContent += "MATCH ASSIGNMENTS:\n"
        assignments.forEach((assignment) => {
          txtContent += `- Match ${assignment.matchId} (${new Date(assignment.timestamp).toLocaleString()})\n`

          // Add comments for this match
          const matchComments = comments.filter((c) => c.matchId === assignment.matchId)
          if (matchComments.length > 0) {
            txtContent += "  Comments:\n"
            matchComments.forEach((comment) => {
              txtContent += `  * ${comment.text}\n`
            })
          }
        })
      }

      txtContent += "\n----------------------------\n\n"
    })

    return txtContent
  }

  // Generate LOG content
  const generateLOGContent = (batteryAssignments: Map<string, any>) => {
    let logContent = `[${new Date().toISOString()}] Battery Usage Log\n\n`

    batteryAssignments.forEach((data, batteryId) => {
      const { battery, assignments, comments } = data

      logContent += `[INFO] Battery ${battery.id} (${battery.voltage}V, ${battery.capacity}Ah${battery.brand ? `, ${battery.brand}` : ""})\n`
      logContent += `[INFO] Status: ${battery.isFaulty ? "FAULTY" : "Working"}\n`

      if (assignments.length === 0) {
        logContent += `[WARN] Battery ${battery.id} has no match assignments\n`
      } else {
        assignments.forEach((assignment) => {
          logContent += `[${new Date(assignment.timestamp).toISOString()}] Battery ${battery.id} assigned to match ${assignment.matchId}\n`

          // Add comments for this match
          const matchComments = comments.filter((c) => c.matchId === assignment.matchId)
          matchComments.forEach((comment) => {
            logContent += `[${new Date(comment.timestamp).toISOString()}] Comment for match ${comment.matchId}: ${comment.text}\n`
          })
        })
      }

      logContent += "\n"
    })

    return logContent
  }

  // Generate Markdown content
  const generateMDContent = (batteryAssignments: Map<string, any>) => {
    let mdContent = "# Battery Usage Report\n\n"
    mdContent += `Generated: ${new Date().toLocaleString()}\n\n`

    batteryAssignments.forEach((data, batteryId) => {
      const { battery, assignments, comments } = data

      mdContent += `## Battery ${battery.id}\n\n`
      mdContent += `- **Voltage:** ${battery.voltage}V\n`
      mdContent += `- **Capacity:** ${battery.capacity}Ah\n`
      if (battery.brand) mdContent += `- **Brand:** ${battery.brand}\n`
      mdContent += `- **Status:** ${battery.isFaulty ? "⚠️ FAULTY" : "✅ Working"}\n`
      mdContent += `- **Added:** ${new Date(battery.dateAdded).toLocaleDateString()}\n\n`

      if (assignments.length === 0) {
        mdContent += "*No match assignments*\n\n"
      } else {
        mdContent += "### Match Assignments\n\n"
        mdContent += "| Match | Date | Comments |\n"
        mdContent += "|-------|------|----------|\n"

        assignments.forEach((assignment) => {
          const matchComments = comments.filter((c) => c.matchId === assignment.matchId)
          const commentText = matchComments.map((c) => c.text).join("; ")

          mdContent += `| ${assignment.matchId} | ${new Date(assignment.timestamp).toLocaleString()} | ${commentText || "-"} |\n`
        })

        mdContent += "\n"
      }

      mdContent += "---\n\n"
    })

    return mdContent
  }

  // Generate TSV content
  const generateTSVContent = (batteryAssignments: Map<string, any>) => {
    let tsvContent = "Battery ID\tVoltage\tCapacity\tBrand\tIs Faulty\tMatch ID\tAssignment Date\tComments\n"

    batteryAssignments.forEach((data, batteryId) => {
      const { battery, assignments, comments } = data

      if (assignments.length === 0) {
        // If no assignments, just output battery info
        tsvContent += `${battery.id}\t${battery.voltage}\t${battery.capacity}\t${battery.brand || ""}\t${battery.isFaulty ? "Yes" : "No"}\t\t\t${comments.map((c) => c.text.replace(/\t/g, " ")).join("; ")}\n`
      } else {
        // Output each assignment on a separate line
        assignments.forEach((assignment) => {
          const matchComments = comments.filter((c) => c.matchId === assignment.matchId)
          const commentText = matchComments.map((c) => c.text.replace(/\t/g, " ")).join("; ")

          tsvContent += `${battery.id}\t${battery.voltage}\t${battery.capacity}\t${battery.brand || ""}\t${battery.isFaulty ? "Yes" : "No"}\t${assignment.matchId}\t${new Date(assignment.timestamp).toLocaleString()}\t${commentText}\n`
        })
      }
    })

    return tsvContent
  }

  return (
    <div className="space-y-6">
      <Card className="border-team-blue/20">
        <CardHeader>
          <CardTitle>Add New Battery</CardTitle>
          <CardDescription>Register a new battery to track in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="battery-id">Battery ID</Label>
              <Input
                id="battery-id"
                placeholder="Enter battery ID"
                value={newBatteryId}
                onChange={(e) => setNewBatteryId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voltage">Voltage (V)</Label>
              <Input
                id="voltage"
                type="number"
                step="0.1"
                value={newBatteryVoltage}
                onChange={(e) => setNewBatteryVoltage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (Ah)</Label>
              <Input
                id="capacity"
                type="number"
                step="0.1"
                value={newBatteryCapacity}
                onChange={(e) => setNewBatteryCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="Enter battery brand"
                value={newBatteryBrand}
                onChange={(e) => setNewBatteryBrand(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            onClick={handleAddBattery}
            className="bg-team-blue hover:bg-team-darkBlue active:scale-95 transition-all w-full sm:w-auto"
            disabled={!newBatteryId.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Battery
          </Button>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Dialog open={isAutoAssignDialogOpen} onOpenChange={setIsAutoAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-team-blue text-team-blue hover:bg-team-blue/10 w-full sm:w-auto"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Auto-Assign Batteries
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Auto-Assign Batteries</DialogTitle>
                  <DialogDescription>
                    Drag and drop batteries to set the rotation order for match assignments
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Battery Rotation Order</Label>
                      <div className="border rounded-md p-4 min-h-[200px] bg-muted/20">
                        {batteryRotationOrder.length > 0 ? (
                          <div className="space-y-2">
                            {batteryRotationOrder.map((batteryId, index) => (
                              <div
                                key={index}
                                className={`flex items-center gap-2 p-2 border rounded-md bg-card ${
                                  dragOverIndex === index ? "border-team-blue bg-team-blue/10" : ""
                                } cursor-move transition-colors`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, batteryId, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center gap-2 flex-1">
                                  {getBatteryStatusIcon(batteryId)}
                                  <span>Battery {batteryId}</span>
                                </div>
                                <button
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleRemoveFromBatteryRotation(batteryId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>Drag batteries here to set rotation order</p>
                            <p className="text-sm mt-2">Or use the selector below to add batteries</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Select onValueChange={handleAddToBatteryRotation}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add battery to rotation" />
                          </SelectTrigger>
                          <SelectContent>
                            {batteries
                              .filter((battery) => !battery.isFaulty)
                              .map((battery) => (
                                <SelectItem key={battery.id} value={battery.id}>
                                  Battery {battery.id} ({battery.voltage}V)
                                  {battery.brand && ` - ${battery.brand}`}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => setBatteryRotationOrder([])}
                          className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Assignment Preview</Label>
                      <div className="border rounded-md p-4 min-h-[200px] bg-muted/20 overflow-auto">
                        {Object.keys(matchAssignmentPreview).length > 0 ? (
                          <div className="space-y-2">
                            {unassignedMatches.map((match, index) => {
                              const batteryId = matchAssignmentPreview[match.id]
                              if (!batteryId) return null

                              return (
                                <div key={match.id} className="flex items-center gap-2 p-2 border rounded-md bg-card">
                                  <div className="flex-1">
                                    <div className="font-medium">Match {match.matchNumber}</div>
                                    <div className="text-xs text-muted-foreground">{match.matchType}</div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex items-center gap-1">
                                    {getBatteryStatusIcon(batteryId)}
                                    <span>Battery {batteryId}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>Add batteries to the rotation to see assignment preview</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>How it works</AlertTitle>
                    <AlertDescription>
                      Batteries will be assigned to unassigned matches in the order specified above. When the end of the
                      list is reached, it will start again from the beginning.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAutoAssignBatteries}
                    className="bg-team-blue hover:bg-team-darkBlue"
                    disabled={
                      autoAssignInProgress ||
                      batteryRotationOrder.length === 0 ||
                      Object.keys(matchAssignmentPreview).length === 0
                    }
                  >
                    {autoAssignInProgress ? (
                      <>
                        <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Auto-Assign
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="log">LOG</SelectItem>
                  <SelectItem value="md">MD</SelectItem>
                  <SelectItem value="tsv">TSV</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportData}
                variant="outline"
                className="border-team-blue text-team-blue hover:bg-team-blue/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      <Card className="border-team-blue/20">
        <CardHeader>
          <CardTitle>Battery Inventory</CardTitle>
          <CardDescription>Manage your team's batteries and view their performance history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Batteries</TabsTrigger>
              <TabsTrigger value="faulty">Faulty</TabsTrigger>
              {uniqueBrands.map((brand) => (
                <TabsTrigger key={brand} value={brand as string}>
                  {brand}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBatteries.map((battery) => (
                  <Card
                    key={battery.id}
                    className={`overflow-hidden transition-all duration-300 ${
                      battery.isFaulty ? "border-red-500 dark:border-red-700" : "border-team-blue/20"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getBatteryStatusIcon(battery.id)}
                          <CardTitle className="text-lg">Battery {battery.id}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-transform"
                          onClick={() => handleRemoveBattery(battery.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        {battery.voltage}V / {battery.capacity}Ah
                        {battery.brand && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag className="h-3.5 w-3.5 text-team-blue" />
                            <span>{battery.brand}</span>
                          </div>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor={`faulty-${battery.id}`} className="text-sm">
                            Mark as Faulty
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {battery.isFaulty
                              ? "This battery has been marked as faulty"
                              : "Toggle if this battery is not working properly"}
                          </p>
                        </div>
                        <Switch
                          id={`faulty-${battery.id}`}
                          checked={battery.isFaulty}
                          onCheckedChange={(checked) => handleToggleFaulty(battery.id, checked)}
                          className={battery.isFaulty ? "data-[state=checked]:bg-red-500" : ""}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Added: {new Date(battery.dateAdded).toLocaleDateString()}
                        </span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBattery(battery.id)}
                              className="border-team-blue text-team-blue hover:bg-team-blue/10 active:scale-95 transition-transform"
                            >
                              View History
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Battery {battery.id} History</DialogTitle>
                              <DialogDescription>
                                Performance comments and match history
                                {battery.brand && <span className="ml-1">• {battery.brand}</span>}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[300px] rounded-md border p-4">
                              {getBatteryComments(battery.id).length > 0 ? (
                                <div className="space-y-4">
                                  {getBatteryComments(battery.id).map((comment, index) => (
                                    <div key={index} className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <BatteryCharging className="h-4 w-4 text-team-blue" />
                                        <span className="font-medium">{getMatchForComment(comment)}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDistanceToNow(new Date(comment.timestamp))}
                                        </span>
                                      </div>
                                      <p className="text-sm pl-6">{comment.text}</p>
                                      <Separator className="my-2" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-8">
                                  No comments or history available
                                </p>
                              )}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredBatteries.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <Battery className="h-12 w-12 text-team-blue mx-auto mb-2" />
                    <h3 className="text-lg font-medium">
                      {activeTab === "all"
                        ? "No Batteries Added"
                        : activeTab === "faulty"
                          ? "No Faulty Batteries"
                          : `No ${activeTab} Batteries`}
                    </h3>
                    <p className="text-muted-foreground">
                      {activeTab === "all"
                        ? "Add your first battery to get started"
                        : activeTab === "faulty"
                          ? "All batteries are working properly"
                          : `Add a battery with brand ${activeTab}`}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
