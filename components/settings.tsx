"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useBatteryContext } from "@/context/battery-context"
import { Loader2, Save, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Settings() {
  const { settings, updateSettings } = useBatteryContext()
  const { toast } = useToast()
  const [teamNumber, setTeamNumber] = useState(settings.teamNumber || "10219")
  const [eventCode, setEventCode] = useState(settings.eventCode || "")
  const [apiKey, setApiKey] = useState(settings.apiKey || "")
  const [darkMode, setDarkMode] = useState(settings.darkMode || true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveSettings = async () => {
    setIsSaving(true)

    // Simulate a short delay to show the saving state
    await new Promise((resolve) => setTimeout(resolve, 600))

    updateSettings({
      teamNumber,
      eventCode,
      apiKey,
      darkMode,
    })

    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    })

    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Settings</CardTitle>
          <CardDescription>Configure your connection to The Blue Alliance API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              The Blue Alliance API requires an API key for authentication. You can get a key from{" "}
              <a
                href="https://www.thebluealliance.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-team-blue hover:underline font-medium"
              >
                The Blue Alliance website
              </a>
              .
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="team-number">Default Team Number</Label>
            <Input
              id="team-number"
              placeholder="Enter your team number (e.g., 10219)"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Your FRC team number is used to fetch relevant match data from The Blue Alliance
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-code">Event/Regional Code</Label>
            <Input
              id="event-code"
              placeholder="Enter event code (e.g., flta or 2024flta)"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              The event code for the competition you're attending (e.g., flta for Florida Tallahassee Regional). You can
              optionally include the year prefix (e.g., 2024flta).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Default TheBlueAlliance API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your TBA API key (optional)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              The app will work with our default API key, but you can use your own key from{" "}
              <a
                href="https://www.thebluealliance.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-team-blue hover:underline"
              >
                The Blue Alliance website
              </a>{" "}
              if you prefer.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSaveSettings}
            className="bg-team-blue hover:bg-team-darkBlue transition-all"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save API Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Settings</CardTitle>
          <CardDescription>Customize your app experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Enable dark mode for the application</p>
            </div>
            <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSaveSettings}
            className="bg-team-blue hover:bg-team-darkBlue transition-all"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save App Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>FRC Battery Tracker App</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Team:</span> 10219 - The Bathtub Chickens
            </p>
            <p>
              <span className="font-semibold">Version:</span> 1.1.0
            </p>
            <p className="text-sm text-muted-foreground pt-2">
              This app helps FRC teams track battery usage and performance across matches. Data is pulled from The Blue
              Alliance API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
