"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Shield,
  Trophy,
  Medal,
  CheckCircle2,
  CalendarDays,
} from "lucide-react"
import { useBatteryContext } from "@/context/battery-context"
import type { Match } from "@/lib/types"
import { fetchMatches, fetchEvents } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function MatchSchedule() {
  const { batteries, assignments, assignBatteryToMatch, addBatteryComment, settings, updateSettings } =
    useBatteryContext()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedBattery, setSelectedBattery] = useState("")
  const [comment, setComment] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [matchTypeTab, setMatchTypeTab] = useState("all")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [assignmentAnimation, setAssignmentAnimation] = useState<{
    matchId: string
    batteryId: string
    active: boolean
  } | null>(null)
  const { toast } = useToast()
  const matchRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const [isChampionshipEvent, setIsChampionshipEvent] = useState(false)
  const [teamDivision, setTeamDivision] = useState<string | undefined>(undefined)
  const [hasEinsteinMatches, setHasEinsteinMatches] = useState(false)

  // New states for team events dropdown and team number input
  const [teamEvents, setTeamEvents] = useState<{ id: string; name: string; date: string }[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [teamNumberInput, setTeamNumberInput] = useState(settings.teamNumber || "10219")
  const [selectedEvent, setSelectedEvent] = useState(settings.eventCode || "")

  // Determine if this is a championship event
  useEffect(() => {
    if (settings.eventCode) {
      const isCmp =
        settings.eventCode.toLowerCase().includes("cmp") ||
        settings.eventCode.toLowerCase().includes("champ") ||
        /\d{4}(arc|cars|carv|cur|dal|dar|gal|hop|new|roe|tur)/.test(settings.eventCode.toLowerCase())
      setIsChampionshipEvent(isCmp)
    }
  }, [settings.eventCode])

  // Load team events
  useEffect(() => {
    const loadTeamEvents = async () => {
      if (!teamNumberInput) return

      setLoadingEvents(true)
      try {
        const events = await fetchEvents(settings.apiKey, teamNumberInput)
        setTeamEvents(events)
      } catch (error) {
        console.error("Failed to load team events:", error)
      } finally {
        setLoadingEvents(false)
      }
    }

    loadTeamEvents()
  }, [teamNumberInput, settings.apiKey])

  // Update the useEffect that loads matches to check for Einstein matches
  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true)
      setError(null)

      try {
        if (settings.teamNumber && settings.eventCode) {
          const data = await fetchMatches(settings.teamNumber, settings.eventCode, settings.apiKey)
          setMatches(data)

          // Determine team division from matches
          if (data.length > 0) {
            const qualMatches = data.filter((m) => m.matchType === "Qualification")
            if (qualMatches.length > 0 && qualMatches[0].division) {
              setTeamDivision(qualMatches[0].division)
            }

            // Check if there are any Einstein matches by looking for matches with "cmptx" in the ID
            const einsteinMatches = data.filter((m) => m.id.includes("cmptx") || m.matchType === "Einstein")
            setHasEinsteinMatches(einsteinMatches.length > 0)
          }

          if (data.length === 0) {
            setError(
              "No matches found. This could be because the event hasn't started yet, or the event code is incorrect.",
            )
          }
        } else {
          setMatches([])
        }
      } catch (error) {
        console.error("Failed to load matches:", error)
        setError("Failed to load matches from The Blue Alliance. Check your team number, event code, and API key.")
        toast({
          title: "Error loading matches",
          description: "There was a problem fetching match data from The Blue Alliance.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [settings.teamNumber, settings.eventCode, settings.apiKey, toast])

  // Handle team number change
  const handleTeamNumberChange = () => {
    if (teamNumberInput.trim()) {
      updateSettings({
        ...settings,
        teamNumber: teamNumberInput,
      })

      toast({
        title: "Team number updated",
        description: `Now tracking team ${teamNumberInput}.`,
      })
    }
  }

  // Handle event selection
  const handleEventSelection = (eventCode: string) => {
    setSelectedEvent(eventCode)
    updateSettings({
      ...settings,
      eventCode: eventCode,
    })

    toast({
      title: "Event updated",
      description: `Now showing matches for ${eventCode}.`,
    })
  }

  // Update the handleRefresh function to also check for Einstein matches
  const handleRefresh = async () => {
    setLoading(true)
    setError(null)

    try {
      if (settings.teamNumber && settings.eventCode) {
        const data = await fetchMatches(settings.teamNumber, settings.eventCode, settings.apiKey)
        setMatches(data)

        // Update team division
        if (data.length > 0) {
          const qualMatches = data.filter((m) => m.matchType === "Qualification")
          if (qualMatches.length > 0 && qualMatches[0].division) {
            setTeamDivision(qualMatches[0].division)
          }

          // Check if there are any Einstein matches by looking for matches with "cmptx" in the ID
          const einsteinMatches = data.filter((m) => m.id.includes("cmptx") || m.matchType === "Einstein")
          setHasEinsteinMatches(einsteinMatches.length > 0)
        }

        if (data.length === 0) {
          setError(
            "No matches found. This could be because the event hasn't started yet, or the event code is incorrect.",
          )
        } else {
          toast({
            title: "Matches refreshed",
            description: "Match data has been updated from The Blue Alliance.",
          })
        }
      }
    } catch (error) {
      console.error("Failed to refresh matches:", error)
      setError("Failed to refresh matches from The Blue Alliance. Check your team number, event code, and API key.")
      toast({
        title: "Error refreshing matches",
        description: "There was a problem fetching match data from The Blue Alliance.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignBattery = () => {
    if (selectedMatch && selectedBattery) {
      // Close the dialog
      setIsDialogOpen(false)

      // Trigger the animation
      setAssignmentAnimation({
        matchId: selectedMatch.id,
        batteryId: selectedBattery,
        active: true,
      })

      // After animation completes, update the data
      setTimeout(() => {
        assignBatteryToMatch(selectedMatch.id, selectedBattery)

        if (comment.trim()) {
          addBatteryComment(selectedBattery, {
            matchId: selectedMatch.id,
            text: comment,
            timestamp: new Date().toISOString(),
          })
        }

        setAssignmentAnimation(null)

        toast({
          title: "Battery assigned",
          description: `Battery ${selectedBattery} has been assigned to Match ${selectedMatch.matchNumber}.`,
        })

        setSelectedMatch(null)
        setSelectedBattery("")
        setComment("")
      }, 1000) // Animation duration
    }
  }

  // Get unique divisions for filtering
  const uniqueDivisions = Array.from(new Set(matches.filter((m) => m.division).map((m) => m.division)))

  // Filter matches by search term and assignment status
  const filteredBySearchAndAssignment = matches.filter((match) => {
    const matchesSearch =
      match.matchNumber.toString().includes(searchTerm) ||
      match.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (match.division && match.division.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filterType === "all") return matchesSearch
    if (filterType === "assigned") return matchesSearch && assignments.some((a) => a.matchId === match.id)
    if (filterType === "unassigned") return matchesSearch && !assignments.some((a) => a.matchId === match.id)
    if (filterType === "completed") return matchesSearch && match.isCompleted

    return matchesSearch
  })

  // Update the filteredMatches logic to include Einstein matches in the "All" tab
  // Replace the existing filteredMatches function with this updated version
  const filteredMatches = filteredBySearchAndAssignment.filter((match) => {
    // For Einstein matches (either by type or by having "cmptx" in the ID), only show them in the Einstein tab or All tab
    if (match.matchType === "Einstein" || match.id.includes("cmptx")) {
      return matchTypeTab === "einstein" || matchTypeTab === "all"
    }

    // For other match types, apply the normal filter
    return matchTypeTab === "all"
      ? true // Show all non-Einstein matches in "All" tab
      : matchTypeTab === "qualification"
        ? match.matchType === "Qualification"
        : matchTypeTab === "semifinal"
          ? match.matchType === "Semifinal"
          : matchTypeTab === "final"
            ? match.matchType === "Final"
            : false
  })

  // Update the formatMatchNumber function to better handle Einstein matches
  const formatMatchNumber = (match: Match) => {
    if (match.matchType === "Qualification") {
      return match.matchNumber
    } else if (match.matchType === "Semifinal") {
      // Extract set number from the match ID
      // Example: 2024flor_sf1m1 (Semifinal 1)
      const setMatch = match.id.match(/sf(\d+)m(\d+)/)
      if (setMatch && setMatch.length >= 3) {
        return `SF${setMatch[1]}`
      }
    } else if (match.matchType === "Final") {
      // Extract match number from the ID
      const finalMatch = match.id.match(/f(\d+)m(\d+)/)
      if (finalMatch && finalMatch.length >= 3) {
        return `F${finalMatch[2]}`
      }
    } else if (match.matchType === "Einstein") {
      // Extract match info from the ID
      if (match.id.includes("ef1m")) {
        // Einstein Final
        const einsteinMatch = match.id.match(/ef1m(\d+)/)
        if (einsteinMatch && einsteinMatch.length >= 2) {
          return `EF${einsteinMatch[1]}`
        }
      } else if (match.id.includes("ef")) {
        // Einstein Semi-Final
        const einsteinMatch = match.id.match(/ef(\d+)m(\d+)/)
        if (einsteinMatch && einsteinMatch.length >= 3) {
          return `ESF${einsteinMatch[2]}`
        }
      } else if (match.id.includes("sf") && match.id.includes("cmptx")) {
        // Einstein Semi-Final from cmptx
        const einsteinMatch = match.id.match(/sf(\d+)m(\d+)/)
        if (einsteinMatch && einsteinMatch.length >= 3) {
          return `ESF${einsteinMatch[2]}`
        }
      }
      // Default Einstein match format - use the match number from the match object
      return `E${match.matchNumber}`
    }
    return match.matchNumber
  }

  // Update the match description formatting to better handle Einstein matches
  const getMatchDescription = (match: Match) => {
    if (match.matchType === "Qualification") {
      return `Qualification Match ${match.matchNumber}`
    } else if (match.matchType === "Semifinal") {
      // Extract set number from the match ID
      const setMatch = match.id.match(/sf(\d+)m(\d+)/)
      if (setMatch && setMatch.length >= 3) {
        return `Semifinal ${setMatch[1]}`
      }
      return match.description
    } else if (match.matchType === "Final") {
      // Extract match number from the ID
      const finalMatch = match.id.match(/f(\d+)m(\d+)/)
      if (finalMatch && finalMatch.length >= 3) {
        return `Final Match ${finalMatch[2]}`
      }
      return match.description
    } else if (match.matchType === "Einstein") {
      // Check if this is a final match - but make sure it's not a semifinal
      if (
        (match.id.includes("ef1m") || match.description.toLowerCase().includes("final")) &&
        !match.description.toLowerCase().includes("semi")
      ) {
        const matchNum = match.id.match(/ef1m(\d+)/) || match.id.match(/f1m(\d+)/)
        const matchNumber = matchNum && matchNum.length >= 2 ? matchNum[1] : match.matchNumber
        return `Einstein Final ${matchNumber}`
      } else if (
        match.id.includes("ef") ||
        (match.id.includes("sf") && match.id.includes("cmptx")) ||
        match.description.toLowerCase().includes("semi")
      ) {
        // Extract set and match numbers if possible
        const einsteinMatch = match.id.match(/ef(\d+)m(\d+)/) || match.id.match(/sf(\d+)m(\d+)/)
        if (einsteinMatch && einsteinMatch.length >= 3) {
          // Use the match number (second capture group) for the semifinal number
          return `Einstein Semifinal ${einsteinMatch[2]}`
        }
        // If we can't extract the match number, use the one from the match object
        return `Einstein Semifinal ${match.matchNumber}`
      }

      // If we can't determine the specific type, use a generic description
      return `Einstein Match ${match.matchNumber}`
    }
    return match.description
  }

  // Check if the team is in a specific alliance
  const isTeamInAlliance = (alliance: string[], teamNumber: string) => {
    return alliance.includes(teamNumber)
  }

  // Fix the winner display to ensure it always shows when available
  const getWinnerDisplay = (match: Match) => {
    if (!match.isCompleted) return null

    // Ensure we have a winner value
    if (match.winner === undefined || match.winner === null) return null

    if (match.winner === "red") {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
        >
          <Trophy className="h-3.5 w-3.5 mr-1" /> Red Won
        </Badge>
      )
    } else if (match.winner === "blue") {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        >
          <Trophy className="h-3.5 w-3.5 mr-1" /> Blue Won
        </Badge>
      )
    } else if (match.winner === "tie") {
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
        >
          Tie
        </Badge>
      )
    }

    return null
  }

  const getBatteryForMatch = (matchId: string) => {
    const assignment = assignments.find((a) => a.matchId === matchId)
    return assignment ? assignment.batteryId : undefined
  }

  return (
    <div className="space-y-4">
      {/* Team Number and Event Selection - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="team-number-input">Team Number</Label>
          <div className="flex space-x-2">
            <Input
              id="team-number-input"
              placeholder="Enter team number"
              value={teamNumberInput}
              onChange={(e) => setTeamNumberInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTeamNumberChange} className="bg-team-blue hover:bg-team-darkBlue">
              Update
            </Button>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="event-select">Event</Label>
          <Select value={selectedEvent} onValueChange={handleEventSelection}>
            <SelectTrigger id="event-select" className="w-full">
              <SelectValue placeholder={loadingEvents ? "Loading events..." : "Select an event"} />
            </SelectTrigger>
            <SelectContent>
              {teamEvents.length > 0 ? (
                teamEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-2 text-team-blue" />
                      <span>{event.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({event.date})</span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-events" disabled>
                  {loadingEvents ? "Loading events..." : "No events found"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!settings.teamNumber || !settings.eventCode ? (
        <Card className="border-team-blue/20">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Please configure your team number and event code to view match schedule
            </p>
            <Button
              variant="outline"
              className="border-team-blue text-team-blue hover:bg-team-blue/10"
              onClick={() => document.getElementById("settings-tab")?.click()}
            >
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between bg-team-blue/10 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-team-blue" />
              <span className="font-medium">
                Tracking Team {settings.teamNumber}
                {isChampionshipEvent && teamDivision && (
                  <span className="ml-2 text-team-blue">({teamDivision} Division)</span>
                )}
              </span>
            </div>
            {matches.length > 0 && matches[0].teamRanking && (
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Current Rank: {matches[0].teamRanking}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search matches..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="assigned">Assigned Batteries</SelectItem>
                  <SelectItem value="unassigned">Unassigned Matches</SelectItem>
                  <SelectItem value="completed">Completed Matches</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="border-team-blue text-team-blue hover:bg-team-blue/10"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="border-team-blue/20">
            <CardHeader>
              <CardTitle>Match Schedule</CardTitle>
              <CardDescription>
                Match data for Team {settings.teamNumber} at {settings.eventCode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Tabs value={matchTypeTab} onValueChange={setMatchTypeTab}>
                    <TabsList
                      className={`grid w-full ${isChampionshipEvent && hasEinsteinMatches ? "grid-cols-5" : "grid-cols-4"}`}
                    >
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="qualification">Quals</TabsTrigger>
                      <TabsTrigger value="semifinal">Semis</TabsTrigger>
                      <TabsTrigger value="final">Finals</TabsTrigger>
                      {isChampionshipEvent && hasEinsteinMatches && (
                        <TabsTrigger value="einstein">Einstein</TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredMatches.length > 0 ? (
                <div className="space-y-4">
                  {filteredMatches.map((match) => {
                    const assignedBattery = getBatteryForMatch(match.id)
                    const isAnimating = assignmentAnimation?.matchId === match.id && assignmentAnimation.active
                    const formattedMatchNumber = formatMatchNumber(match)

                    // Check which alliance the team is on
                    const isOnRedAlliance = isTeamInAlliance(match.teams.red, settings.teamNumber)
                    const isOnBlueAlliance = isTeamInAlliance(match.teams.blue, settings.teamNumber)

                    return (
                      <div
                        key={match.id}
                        ref={(el) => (matchRefs.current[match.id] = el)}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-2 transition-all duration-300 ${
                          isAnimating ? "bg-team-blue/10 scale-[1.02]" : ""
                        }`}
                      >
                        <div className="flex items-start gap-4 w-full">
                          <div className="flex flex-col items-center justify-center bg-team-blue/10 p-2 rounded-md min-w-[60px]">
                            <span className="text-lg font-bold">{formattedMatchNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              {match.matchType === "Qualification" ? "Qual" : match.matchType}
                            </span>
                            {match.division && (
                              <span className="text-xs text-team-blue mt-1 font-medium">{match.division}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{getMatchDescription(match)}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 text-team-blue" />
                              <span>{match.date}</span>
                              <Clock className="h-3.5 w-3.5 ml-2 text-team-blue" />
                              <span>{match.time}</span>
                              {match.isCompleted && <CheckCircle2 className="h-3.5 w-3.5 ml-2 text-green-500" />}
                            </div>

                            {/* Alliance Teams */}
                            <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                              <div className="flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-red-500" />
                                <span className="font-medium text-red-600 dark:text-red-400">Red:</span>
                                <span className={isOnRedAlliance ? "font-bold" : "text-muted-foreground"}>
                                  {match.teams.red
                                    .map((team) => {
                                      return team === settings.teamNumber ? (
                                        <span key={team} className="text-team-blue font-bold">
                                          {team}
                                        </span>
                                      ) : (
                                        <span key={team}>{team}</span>
                                      )
                                    })
                                    .reduce((prev, curr) => [prev, ", ", curr] as any)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-blue-500" />
                                <span className="font-medium text-blue-600 dark:text-blue-400">Blue:</span>
                                <span className={isOnBlueAlliance ? "font-bold" : "text-muted-foreground"}>
                                  {match.teams.blue
                                    .map((team) => {
                                      return team === settings.teamNumber ? (
                                        <span key={team} className="text-team-blue font-bold">
                                          {team}
                                        </span>
                                      ) : (
                                        <span key={team}>{team}</span>
                                      )
                                    })
                                    .reduce((prev, curr) => [prev, ", ", curr] as any)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 ml-auto">
                          {getWinnerDisplay(match)}

                          {assignedBattery ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                            >
                              Battery {assignedBattery}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            >
                              No Battery
                            </Badge>
                          )}
                          <Dialog open={isDialogOpen && selectedMatch?.id === match.id} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMatch(match)
                                  setIsDialogOpen(true)
                                }}
                                className="border-team-blue text-team-blue hover:bg-team-blue/10 active:scale-95 transition-transform"
                              >
                                {assignedBattery ? "Reassign" : "Assign Battery"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Battery to Match {formattedMatchNumber}</DialogTitle>
                                <DialogDescription>
                                  Select a battery to assign to this match and add optional performance comments.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="battery">Battery</Label>
                                  <Select value={selectedBattery} onValueChange={setSelectedBattery}>
                                    <SelectTrigger id="battery">
                                      <SelectValue placeholder="Select a battery" />
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
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="comment">Performance Comments</Label>
                                  <Textarea
                                    id="comment"
                                    placeholder="Add comments about battery performance..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleAssignBattery}
                                  className="bg-team-blue hover:bg-team-darkBlue active:scale-95 transition-all"
                                  disabled={!selectedBattery}
                                >
                                  Assign Battery
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    {error
                      ? "No matches found due to an error."
                      : matchTypeTab !== "all"
                        ? `No ${matchTypeTab === "qualification" ? "qualification" : matchTypeTab} matches found.`
                        : "No matches found for the current filter."}
                  </p>
                  {!error && matchTypeTab === "all" && (
                    <p className="text-muted-foreground mt-2">
                      This could be because the event hasn't started yet, or the event code is incorrect.
                    </p>
                  )}
                  {!error && matchTypeTab !== "all" && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Alliance Information</h4>
                      <p className="text-sm text-muted-foreground">
                        When matches are available, you'll see the red and blue alliance teams listed here.
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                        <div className="flex items-center gap-1.5 justify-center">
                          <Shield className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-600 dark:text-red-400">Red Alliance</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-center">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-blue-600 dark:text-blue-400">Blue Alliance</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
