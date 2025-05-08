import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BatteryDashboard from "@/components/battery-dashboard"
import MatchSchedule from "@/components/match-schedule"
import BatteryManagement from "@/components/battery-management"
import Settings from "@/components/settings"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <div className="container mx-auto py-6 space-y-6 min-h-screen flex flex-col">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-team-blue p-2 rounded-md">
            <h1 className="text-3xl font-bold tracking-tight text-white">TubTime Manager</h1>
          </div>
        </div>
        <p className="text-muted-foreground">
          Your all-in-one match schedule and battery tracker—built for FRC teams, powered by the Bathtub Chickens.
        </p>
      </header>

      <Tabs defaultValue="dashboard" className="w-full flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="matches">Match Schedule</TabsTrigger>
          <TabsTrigger value="batteries">Battery Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="p-4 border rounded-md">
          <BatteryDashboard />
        </TabsContent>
        <TabsContent value="matches" className="p-4 border rounded-md">
          <MatchSchedule />
        </TabsContent>
        <TabsContent value="batteries" className="p-4 border rounded-md">
          <BatteryManagement />
        </TabsContent>
        <TabsContent value="settings" className="p-4 border rounded-md">
          <Settings />
        </TabsContent>
      </Tabs>

      <Footer />
    </div>
  )
}
