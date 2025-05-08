"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Battery, BatteryMedium, BatteryWarning, Calendar, Clock } from "lucide-react"
import { useBatteryContext } from "@/context/battery-context"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { UpcomingMatch } from "@/lib/types"
import { fetchUpcomingMatches } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function BatteryDashboard() {
  const { batteries, assignments, settings } = useBatteryContext()
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      try {
        if (settings.teamNumber && settings.eventCode) {
          const matches = await fetchUpcomingMatches(settings.teamNumber, settings.eventCode, settings.apiKey)

          // Map the matches with assigned batteries
          const matchesWithBatteries = matches.slice(0, 3).map((match) => {
            const assignment = assignments.find((a) => a.matchId === match.id)
            return {
              ...match,
              assignedBattery: assignment ? assignment.batteryId : undefined,
            }
          })

          setUpcomingMatches(matchesWithBatteries)
        } else {
          setUpcomingMatches([])
        }
      } catch (error) {
        console.error("Failed to load upcoming matches:", error)
        toast({
          title: "Error loading matches",
          description: "There was a problem fetching upcoming match data.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(loadData, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [settings.teamNumber, settings.eventCode, settings.apiKey, assignments, toast])

  // Calculate battery statistics
  const totalBatteries = batteries.length
  const assignedBatteries = assignments.length
  const availableBatteries = totalBatteries - assignedBatteries

  // Find batteries with issues
  const batteriesWithIssues = batteries.filter(
    (battery) =>
      battery.isFaulty ||
      battery.comments?.some(
        (comment) =>
          comment.text.toLowerCase().includes("issue") ||
          comment.text.toLowerCase().includes("problem") ||
          comment.text.toLowerCase().includes("fail"),
      ),
  ).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-team-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batteries</CardTitle>
            <Battery className="h-4 w-4 text-team-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBatteries}</div>
            <p className="text-xs text-muted-foreground">{availableBatteries} available for assignment</p>
          </CardContent>
        </Card>

        <Card className="border-team-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Batteries</CardTitle>
            <BatteryMedium className="h-4 w-4 text-team-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedBatteries}</div>
            <Progress
              value={(assignedBatteries / Math.max(totalBatteries, 1)) * 100}
              className="h-2 bg-muted"
              indicatorClassName="bg-team-blue"
            />
          </CardContent>
        </Card>

        <Card className="border-team-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batteries with Issues</CardTitle>
            <BatteryWarning className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batteriesWithIssues}</div>
            <p className="text-xs text-muted-foreground">
              {batteriesWithIssues > 0 ? "Needs attention" : "All batteries healthy"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-team-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Match</CardTitle>
            <Clock className="h-4 w-4 text-team-blue" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : upcomingMatches.length > 0 ? (
              <>
                <div className="text-2xl font-bold">{upcomingMatches[0].matchNumber}</div>
                <p className="text-xs text-muted-foreground">{upcomingMatches[0].time}</p>
              </>
            ) : (
              <p className="text-sm">No upcoming matches</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-team-blue/20">
        <CardHeader>
          <CardTitle>Upcoming Matches</CardTitle>
          <CardDescription>Next 3 matches from The Blue Alliance</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : upcomingMatches.length > 0 ? (
            <div className="space-y-4">
              {upcomingMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-team-blue" />
                    <div>
                      <p className="font-medium">Match {match.matchNumber}</p>
                      <p className="text-sm text-muted-foreground">{match.time}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    {match.assignedBattery ? (
                      <span className="text-green-600 font-medium">Battery {match.assignedBattery} assigned</span>
                    ) : (
                      <span className="text-red-500">No battery assigned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              {!settings.teamNumber || !settings.eventCode ? (
                <p className="text-muted-foreground">Please configure your team number and event code in Settings</p>
              ) : (
                <p className="text-muted-foreground">No upcoming matches found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
